"""
Verity — Gemini Disclosure Drafter
===================================
Takes the structured context produced by the rules engine and calls the
Gemini API to generate a regulation-specific disclosure draft.

The system prompt constrains Gemini to:
  • Write in precise legal/compliance language
  • Reference the exact statute that triggered the flag
  • Produce the right *type* of disclosure (label, notice, consent form)
  • Include actionable next-steps for the production/legal team

Environment variable required:
  GEMINI_API_KEY — your Google AI Studio / Vertex API key
"""

import json
import os
import httpx
from typing import Dict, Any, Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}"
    f":generateContent?key={GEMINI_API_KEY}"
)

# ── System prompt for Gemini ──────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are Verity's AI compliance disclosure drafter.  You receive structured
context about a flagged entertainment asset — which AI tools were used,
which regulations were triggered, and why — and you produce a ready-to-use
disclosure draft.

RULES FOR YOUR OUTPUT:
1. For EACH matched regulation, produce a separate disclosure section.
2. Match the disclosure TYPE to what the law requires:
   • "platform_label"       → short, user-visible label (1-2 sentences)
   • "conspicuous_notice"   → prominent notice suitable for on-screen display
   • "consent_form"         → formal notification + consent request for the performer
   • "metadata_provenance"  → technical provenance tag (C2PA-style)
3. Cite the specific statute / agreement (e.g., "Cal. AB 853", "NY GBL § 396-b").
4. Include an "Action Items" section listing concrete next steps for the
   production team (e.g., "Obtain signed consent from [performer name]").
5. Use clear, professional language. Avoid legalese when possible.
6. End with a disclaimer: "This is an AI-generated draft. It must be
   reviewed and approved by your legal team before use."

OUTPUT FORMAT — return valid JSON with this structure:
{
  "disclosures": [
    {
      "rule_id": "<rule ID>",
      "rule_name": "<full regulation name>",
      "disclosure_type": "<type>",
      "draft_text": "<the disclosure text>",
      "action_items": ["<step 1>", "<step 2>", ...]
    }
  ],
  "combined_summary": "<1-2 sentence overall summary for the compliance dashboard>"
}
"""


def _build_user_prompt(gemini_context: Dict[str, Any]) -> str:
    """Format the rules-engine context into a clear user prompt."""
    lines = [
        "Generate disclosure drafts for the following flagged asset.\n",
        f"ASSET NAME: {gemini_context.get('asset_name', 'Untitled')}",
        f"PROJECT: {gemini_context.get('project', '—')}",
        f"AI TOOL USED: {gemini_context.get('tool_used', '—')} (category: {gemini_context.get('tool_category', '—')})",
        f"AI LEVEL: {gemini_context.get('ai_level', '—')}",
        f"ASSET TYPE: {gemini_context.get('asset_type', '—')}",
        f"REGION: {gemini_context.get('region', '—')}",
        f"PURPOSE: {gemini_context.get('purpose', '—')}",
        "",
        "MATCHED REGULATIONS:",
    ]

    for i, reg in enumerate(gemini_context.get("matched_regulations", []), 1):
        lines.append(f"\n--- Regulation {i}: {reg['rule_name']} ({reg['rule_id']}) ---")
        lines.append(f"  Disclosure type required: {reg['disclosure_type']}")
        lines.append(f"  Severity: {reg['severity']}")
        lines.append(f"  Effective date: {reg['effective_date']}")
        lines.append(f"  Why it triggered: {reg['summary']}")
        if reg.get("context"):
            lines.append(f"  Legal reference: {reg['context'].get('law_reference', '—')}")
            # Include any special requirements
            for k, v in reg["context"].items():
                if k.startswith("requires_") and v:
                    lines.append(f"  Requirement: {k.replace('requires_', '').replace('_', ' ').title()}")
                if k == "penalty_info":
                    lines.append(f"  Penalties: {v}")
                if k.startswith("penalty_"):
                    lines.append(f"  Penalty ({k.replace('penalty_', '')}): {v}")

    lines.append("\n\nPlease generate the disclosure drafts in the JSON format specified.")
    return "\n".join(lines)


async def draft_disclosures(gemini_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call Gemini to produce disclosure drafts based on rules-engine context.

    Returns the parsed JSON response from Gemini, or a fallback dict if
    the API call fails (so the app still works without the key).
    """
    if not GEMINI_API_KEY:
        return _fallback_draft(gemini_context)

    user_prompt = _build_user_prompt(gemini_context)

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}],
            }
        ],
        "systemInstruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GEMINI_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()

            # Extract text from Gemini response
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)

    except Exception as e:
        print(f"[Verity] Gemini API error: {e}")
        return _fallback_draft(gemini_context)


def _fallback_draft(gemini_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic fallback when Gemini is unavailable.
    Produces template-based disclosures from the rules-engine context.
    """
    disclosures = []
    regs = gemini_context.get("matched_regulations", [])
    asset_name = gemini_context.get("asset_name", "this asset")
    tool_used = gemini_context.get("tool_used", "an AI tool")

    for reg in regs:
        rid = reg["rule_id"]
        ctx = reg.get("context", {})

        if rid == "CA-AITA":
            draft = (
                f"AI-Generated Content Disclosure: The content in \"{asset_name}\" "
                f"was created or substantially modified using {tool_used}, a generative "
                f"AI system. This disclosure is provided pursuant to the California AI "
                f"Transparency Act (AB 853). This content includes embedded provenance "
                f"metadata certifying its AI-generated origin."
            )
            actions = [
                "Embed C2PA provenance metadata in the exported asset file",
                "Add visible 'AI-Generated' label to platform listing",
                "File manifest disclosure with distribution platform",
            ]
        elif rid == "NY-SPD":
            draft = (
                f"Synthetic Performer Notice: This advertisement features one or more "
                f"synthetic performers created using {tool_used}. These digitally-created "
                f"figures are generated by artificial intelligence and do not depict any "
                f"real individual. This notice is provided pursuant to New York General "
                f"Business Law § 396-b (S.8420-A)."
            )
            actions = [
                "Place conspicuous disclosure on or adjacent to the advertisement",
                "Ensure disclosure is visible before consumer engagement",
                f"Document compliance (first violation penalty: {ctx.get('penalty_first_violation', '$1,000')})",
            ]
        elif rid == "EU-AIA50":
            draft = (
                f"AI Transparency Label: The content in \"{asset_name}\" has been "
                f"artificially generated using {tool_used}. In accordance with Article 50 "
                f"of the EU AI Act (Regulation 2024/1689), this content is clearly "
                f"labeled as AI-generated and includes machine-readable marking."
            )
            actions = [
                "Apply visible AI-generated label to all EU-distributed versions",
                "Embed machine-readable metadata (C2PA or equivalent)",
                "Update content registry with AI generation details",
            ]
        elif rid == "SAG-AI":
            draft = (
                f"Performer AI Usage Notification: The production of \"{asset_name}\" "
                f"involves the use of {tool_used} to generate, replicate, or alter a "
                f"performer's voice or likeness. Per the SAG-AFTRA AI Rider, the affected "
                f"performer(s) must be notified and provide signed consent before this "
                f"content is used in the final production."
            )
            actions = [
                "Identify all performers whose voice/likeness is replicated",
                "Send formal AI usage notification to each affected performer",
                "Obtain signed consent forms before use in final cut",
                "File compensation terms per CBA provisions",
            ]
        else:
            draft = (
                f"Compliance Notice: \"{asset_name}\" uses AI-generated content "
                f"({tool_used}) and may require disclosure under {reg['rule_name']}. "
                f"Please consult your legal team."
            )
            actions = ["Review applicable regulation", "Consult legal team"]

        disclosures.append({
            "rule_id": rid,
            "rule_name": reg["rule_name"],
            "disclosure_type": reg["disclosure_type"],
            "draft_text": draft,
            "action_items": actions,
        })

    # Combined summary
    rule_names = [r["short_label"] if "short_label" in r else r["rule_name"] for r in regs]
    combined = (
        f"\"{asset_name}\" has been flagged under {', '.join(rule_names) or 'no regulations'}. "
        f"{'Disclosure drafts have been generated and require legal review.' if disclosures else 'No action required.'}"
    )

    return {
        "disclosures": disclosures,
        "combined_summary": combined,
        "_source": "fallback_template",
    }
