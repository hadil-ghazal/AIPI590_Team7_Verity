"""
Verity Disclosure Rules Engine
==============================
Deterministic "if … then" logic that sorts every flagged asset into the
correct disclosure pile(s).  Each regulation is encoded as a Rule object
with explicit trigger conditions.  When an asset matches, the engine
returns which regulations apply and a structured context dict that the
Gemini drafting layer uses to produce the actual disclosure text.

Supported regulations (v1):
  • CA-AITA  – California AI Transparency Act (AB 853) — eff. Jan 1 2027
  • NY-SPD   – New York Synthetic Performer Disclosure (S.8420-A) — eff. Jun 2026
  • EU-AIA50 – EU AI Act Article 50 (transparency for synthetic media)
  • SAG-AI   – SAG-AFTRA AI Rider (contractual, performer consent)

Adding a new regulation = adding one Rule dict to RULES.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ── AI tool categories (maps tool names → capability class) ────────────────
TOOL_CATEGORIES = {
    # Video / visual generation
    "runway gen-3":        "video_generation",
    "runway":              "video_generation",
    "synthesia":           "video_avatar",
    # Image generation
    "midjourney":          "image_generation",
    "midjourney v7":       "image_generation",
    "stability sdxl":      "image_generation",
    "stable diffusion":    "image_generation",
    "adobe firefly":       "image_generation",
    "dall-e":              "image_generation",
    # Voice / audio
    "elevenlabs":          "voice_synthesis",
    "respeecher":          "voice_conversion",
    "resemble ai":         "voice_synthesis",
    # Music
    "suno":                "music_generation",
    "suno v4":             "music_generation",
    "udio":                "music_generation",
    # Text
    "chatgpt":             "text_generation",
    "claude":              "text_generation",
    "gemini":              "text_generation",
}

# Which tool categories produce content involving a "performer" likeness/voice
PERFORMER_CATEGORIES = {
    "voice_synthesis", "voice_conversion", "video_avatar",
}

# Which tool categories produce visual / synthetic media
VISUAL_MEDIA_CATEGORIES = {
    "video_generation", "video_avatar", "image_generation",
}

SYNTHETIC_MEDIA_CATEGORIES = {
    "video_generation", "video_avatar", "image_generation",
    "voice_synthesis", "voice_conversion", "music_generation",
}


def classify_tool(tool_name: str) -> str:
    """Return the capability category for a tool name (case-insensitive)."""
    key = tool_name.strip().lower()
    if not key:
        return "unknown"
    # exact match first
    if key in TOOL_CATEGORIES:
        return TOOL_CATEGORIES[key]
    # substring match fallback (require meaningful overlap)
    for pattern, category in TOOL_CATEGORIES.items():
        if pattern in key or (len(key) >= 3 and key in pattern):
            return category
    return "unknown"


# ── Asset types relevant to advertising (for NY-SPD) ──────────────────────
ADVERTISING_ASSET_TYPES = {
    "image / marketing", "marketing", "ad creative",
    "promotional", "campaign", "poster", "key art",
}


# ═══════════════════════════════════════════════════════════════════════════
#  RULE DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class RuleMatch:
    """Returned when a regulation is triggered for an asset."""
    rule_id: str
    rule_name: str
    short_label: str
    region: str
    severity: str          # "required" | "recommended" | "contractual"
    effective_date: str
    summary: str           # one-liner explaining WHY it triggered
    disclosure_type: str   # "platform_label" | "conspicuous_notice" | "consent_form" | "metadata_provenance"
    context: Dict[str, Any] = field(default_factory=dict)


def evaluate_ca_aita(asset: dict) -> Optional[RuleMatch]:
    """
    California AI Transparency Act (AB 853)
    ────────────────────────────────────────
    TRIGGER CONDITIONS (all must be true):
      1. Content will be hosted / distributed on a large online platform
         with California users (streaming, social media, etc.)
         — Theatrical-only or internal content does NOT trigger this.
      2. Content was generated or substantially modified by a GenAI system
      3. Content is image, video, or audio (synthetic media)

    REQUIRED ACTION:
      • Include a "manifest disclosure" (user-visible label) that the
        content is AI-generated
      • Embed a "latent disclosure" (C2PA / provenance metadata) in the
        content file itself
    """
    region = (asset.get("region") or "").lower()
    tool_name = asset.get("tool_used") or ""
    tool_category = classify_tool(tool_name)
    ai_indicator = asset.get("ai_indicator", False)
    distribution = (asset.get("distribution") or "").lower()

    # Condition 1: California nexus — must involve a large online platform
    # Region alone is not enough; we need platform distribution OR California region
    # with platform-type distribution
    is_large_platform = any(p in distribution for p in [
        "youtube", "tiktok", "instagram", "netflix", "disney",
        "streaming", "social", "hulu", "amazon", "apple tv",
        "twitch", "facebook", "meta",
    ])

    ca_region = "california" in region

    # If distribution is explicitly theatrical-only or internal, skip
    is_non_platform = any(p in distribution for p in [
        "theatrical", "internal", "not distributed",
    ])
    if is_non_platform and not is_large_platform:
        return None

    # Need either: CA region + any non-excluded distribution,
    # OR any region + large platform distribution
    ca_nexus = ca_region or is_large_platform
    if not ca_nexus:
        return None

    # Condition 2: AI-generated content
    if not ai_indicator and tool_category == "unknown":
        return None

    # Condition 3: Synthetic media (not plain text)
    if tool_category not in SYNTHETIC_MEDIA_CATEGORIES and tool_category != "unknown":
        return None
    # If category is unknown but AI indicator is true, still flag (err on side of caution)

    trigger_reason = (
        f"distributed on a large online platform ({distribution})"
        if is_large_platform
        else f"targeting California"
    )

    return RuleMatch(
        rule_id="CA-AITA",
        rule_name="California AI Transparency Act (AB 853)",
        short_label="CA AI Transparency",
        region="United States — California",
        severity="required",
        effective_date="2027-01-01",
        summary=(
            f"Asset uses {tool_name or 'an AI tool'} ({tool_category}) and is "
            f"{trigger_reason}. AB 853 requires a manifest disclosure (visible label) "
            f"and latent disclosure (provenance metadata) that the content is AI-generated."
        ),
        disclosure_type="platform_label",
        context={
            "tool_name": tool_name,
            "tool_category": tool_category,
            "region": region,
            "distribution": distribution,
            "requires_manifest_disclosure": True,
            "requires_latent_provenance": True,
            "penalty_info": "Enforced by CA Attorney General; injunctive relief + civil penalties.",
            "law_reference": "Cal. Bus. & Prof. Code (AB 853), eff. Jan 1 2027",
        },
    )


def evaluate_ny_spd(asset: dict) -> Optional[RuleMatch]:
    """
    New York Synthetic Performer Disclosure (S.8420-A / A.8887-B)
    ──────────────────────────────────────────────────────────────
    TRIGGER CONDITIONS (all must be true):
      1. Content is an advertisement or promotional material
      2. Content features a "synthetic performer" — a digitally-created
         figure using GenAI intended to appear as a human performer
      3. The asset involves human likeness (explicitly flagged or inferred
         from tool category like video_avatar)
      4. The synthetic performer is NOT recognizable as an identifiable
         real person (that falls under the separate digital replica law)

    EXCEPTIONS (do NOT trigger):
      • Audio-only advertisements
      • Language translation / dubbing of a real human performer
      • Ads for expressive works (film, TV, docs) where the synthetic
        performer usage is consistent with its use in the work itself
      • AI-generated images that do NOT depict human figures
        (e.g., landscapes, product shots, abstract art)

    REQUIRED ACTION:
      • "Conspicuously disclose" that a synthetic performer appears
      • $1,000 first violation / $5,000 subsequent violations
    """
    region = (asset.get("region") or "").lower()
    tool_name = asset.get("tool_used") or ""
    tool_category = classify_tool(tool_name)
    asset_type = (asset.get("asset_type") or "").lower()
    purpose = (asset.get("purpose") or "").lower()
    involves_human = asset.get("involves_human_likeness", False)

    # Condition 1: New York nexus
    ny_nexus = "new york" in region or "ny" in region
    if not ny_nexus:
        return None

    # Condition 2: Must be advertising / marketing content
    is_advertising = (
        any(t in asset_type for t in ADVERTISING_ASSET_TYPES)
        or any(kw in purpose for kw in ["marketing", "ad ", "campaign", "poster", "promo", "commercial", "advertisement"])
    )
    if not is_advertising:
        return None

    # Condition 3: Tool must produce visual synthetic performer
    # Voice-only does NOT trigger (audio-only exception)
    if tool_category in ("voice_synthesis", "voice_conversion", "music_generation", "text_generation"):
        return None  # audio-only exception

    if tool_category not in VISUAL_MEDIA_CATEGORIES:
        return None

    # Condition 4: Must involve human likeness — the law specifically covers
    # "synthetic performers" (human-like figures), NOT all AI-generated images.
    # video_avatar tools inherently produce human likeness; for other visual
    # tools we require the explicit flag.
    tool_implies_human = tool_category == "video_avatar"
    human_keywords_in_purpose = any(kw in purpose for kw in [
        "performer", "actor", "person", "human", "face", "portrait",
        "character", "avatar", "spokesperson", "model", "figure",
    ])

    if not involves_human and not tool_implies_human and not human_keywords_in_purpose:
        return None  # AI-generated landscape/product shot — not a synthetic performer

    # Exception: language translation / dubbing
    if "dub" in purpose or "translation" in purpose or "localization" in purpose:
        return None

    # Build explanation of WHY human likeness was determined
    human_reason = (
        "user confirmed asset involves human likeness" if involves_human
        else f"tool ({tool_name}) inherently produces human-like avatars" if tool_implies_human
        else "purpose description indicates human performer involvement"
    )

    return RuleMatch(
        rule_id="NY-SPD",
        rule_name="NY Synthetic Performer Disclosure (S.8420-A)",
        short_label="NY Synthetic Performer",
        region="United States — New York",
        severity="required",
        effective_date="2026-06-01",
        summary=(
            f"Asset is advertising/marketing content using {tool_name or 'a visual AI tool'} "
            f"that depicts a synthetic performer ({human_reason}). NY S.8420-A requires "
            f"conspicuous disclosure that a synthetic performer appears in the advertisement."
        ),
        disclosure_type="conspicuous_notice",
        context={
            "tool_name": tool_name,
            "tool_category": tool_category,
            "asset_type": asset_type,
            "human_likeness_basis": human_reason,
            "penalty_first_violation": "$1,000",
            "penalty_subsequent": "$5,000",
            "exceptions_checked": [
                "audio-only: not applicable (visual content)",
                "dubbing/translation: not applicable",
                f"human likeness: confirmed ({human_reason})",
            ],
            "law_reference": "NY Gen. Bus. Law § 396-b (S.8420-A), eff. June 2026",
        },
    )


def evaluate_eu_aia50(asset: dict) -> Optional[RuleMatch]:
    """
    EU AI Act Article 50 — Transparency for Synthetic Media
    ────────────────────────────────────────────────────────
    TRIGGER CONDITIONS:
      1. Content targets EU distribution / EU region
      2. Content is AI-generated or AI-manipulated image, audio, or video
         (i.e., constitutes a "deep fake" or synthetic media)

    REQUIRED ACTION:
      • Clearly label that content has been artificially generated or
        manipulated
      • Machine-readable marking where technically feasible
    """
    region = (asset.get("region") or "").lower()
    tool_name = asset.get("tool_used") or ""
    tool_category = classify_tool(tool_name)
    distribution = (asset.get("distribution") or "").lower()

    eu_nexus = (
        "eu" in region or "europe" in region
        or any(c in region for c in [
            "germany", "france", "spain", "italy", "netherlands",
            "belgium", "austria", "ireland", "portugal", "sweden",
        ])
        or "eu" in distribution
    )
    if not eu_nexus:
        return None

    if tool_category not in SYNTHETIC_MEDIA_CATEGORIES:
        return None

    return RuleMatch(
        rule_id="EU-AIA50",
        rule_name="EU AI Act Article 50",
        short_label="EU AI Act Art. 50",
        region="European Union",
        severity="required",
        effective_date="2026-08-02",
        summary=(
            f"Asset uses {tool_name or 'an AI tool'} ({tool_category}) and targets the EU market. "
            f"Article 50 requires clear labeling that the content was artificially generated "
            f"or manipulated, plus machine-readable marking where feasible."
        ),
        disclosure_type="platform_label",
        context={
            "tool_name": tool_name,
            "tool_category": tool_category,
            "requires_visible_label": True,
            "requires_machine_readable_mark": True,
            "law_reference": "EU AI Act, Article 50 (Regulation 2024/1689)",
        },
    )


def evaluate_sag_aftra(asset: dict) -> Optional[RuleMatch]:
    """
    SAG-AFTRA AI Rider — Performer Consent for AI Voice/Likeness
    ─────────────────────────────────────────────────────────────
    TRIGGER CONDITIONS:
      1. Tool category involves performer voice or likeness
         (voice_synthesis, voice_conversion, video_avatar)
      2. Asset is part of a production covered by SAG-AFTRA agreements
         (we proxy: any US-region entertainment production)

    REQUIRED ACTION:
      • Notify performer whose voice/likeness is replicated
      • Obtain signed consent before use in final cut
      • Compensation terms per collective bargaining agreement
    """
    region = (asset.get("region") or "").lower()
    tool_name = asset.get("tool_used") or ""
    tool_category = classify_tool(tool_name)

    us_nexus = "united states" in region or "california" in region or "new york" in region or "us" in region
    if not us_nexus:
        return None

    if tool_category not in PERFORMER_CATEGORIES:
        return None

    return RuleMatch(
        rule_id="SAG-AI",
        rule_name="SAG-AFTRA AI Rider",
        short_label="SAG-AFTRA",
        region="United States — Industry",
        severity="contractual",
        effective_date="2024-01-01",
        summary=(
            f"Asset uses {tool_name or 'an AI tool'} ({tool_category}) which involves "
            f"performer voice or likeness replication. SAG-AFTRA AI Rider requires "
            f"performer notification, signed consent, and compensation."
        ),
        disclosure_type="consent_form",
        context={
            "tool_name": tool_name,
            "tool_category": tool_category,
            "requires_performer_consent": True,
            "requires_notification": True,
            "requires_compensation": True,
            "law_reference": "SAG-AFTRA TV/Theatrical Agreement, AI Rider (2024)",
        },
    )


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN ENGINE
# ═══════════════════════════════════════════════════════════════════════════

# All rule evaluators — add new regulations here
RULE_EVALUATORS = [
    evaluate_ca_aita,
    evaluate_ny_spd,
    evaluate_eu_aia50,
    evaluate_sag_aftra,
]


def evaluate_asset(asset: dict) -> dict:
    """
    Run all rules against an asset and return a structured result.

    Parameters
    ----------
    asset : dict with keys:
        - asset_name (str)
        - tool_used (str)        — name of the AI tool
        - region (str)           — geographic region / jurisdiction
        - asset_type (str)       — e.g. "VFX / Visual", "Image / Marketing"
        - purpose (str)          — how the tool was used
        - ai_indicator (bool)    — whether AI usage was detected
        - distribution (str)     — target platform / channel (optional)
        - project (str)          — project name (optional)

    Returns
    -------
    dict with:
        - flagged (bool)
        - matched_rules (list of RuleMatch dicts)
        - disclosure_piles (dict: rule_id → disclosure_type)
        - status ("Clear" | "Needs Review" | "Flagged — Action Required")
        - ai_level (str)
        - gemini_context (dict) — structured context for Gemini drafting
    """
    tool_name = asset.get("tool_used") or ""
    tool_category = classify_tool(tool_name)

    # Determine AI level
    if tool_category in ("image_generation", "video_generation", "music_generation"):
        ai_level = "Fully AI-generated"
    elif tool_category in ("voice_synthesis", "voice_conversion", "video_avatar"):
        ai_level = "AI-assisted (performer replication)"
    elif tool_category == "text_generation":
        ai_level = "AI-assisted (text)"
    elif tool_category == "unknown" and asset.get("ai_indicator"):
        ai_level = "AI-involved (unclassified tool)"
    else:
        ai_level = "Human"

    # Run every rule
    matches: List[RuleMatch] = []
    for evaluator in RULE_EVALUATORS:
        result = evaluator(asset)
        if result is not None:
            matches.append(result)

    flagged = len(matches) > 0

    # Build disclosure piles — group by disclosure type
    disclosure_piles = {}
    for m in matches:
        disclosure_piles[m.rule_id] = {
            "disclosure_type": m.disclosure_type,
            "rule_name": m.rule_name,
            "severity": m.severity,
        }

    # Determine overall status
    if not flagged:
        status = "Clear"
    elif any(m.severity == "required" for m in matches):
        status = "Flagged — Action Required"
    else:
        status = "Needs Review"

    # Build context for Gemini drafting
    gemini_context = {
        "asset_name": asset.get("asset_name", "Untitled"),
        "tool_used": tool_name,
        "tool_category": tool_category,
        "ai_level": ai_level,
        "region": asset.get("region", ""),
        "asset_type": asset.get("asset_type", ""),
        "purpose": asset.get("purpose", ""),
        "project": asset.get("project", ""),
        "matched_regulations": [
            {
                "rule_id": m.rule_id,
                "rule_name": m.rule_name,
                "summary": m.summary,
                "disclosure_type": m.disclosure_type,
                "severity": m.severity,
                "effective_date": m.effective_date,
                "context": m.context,
            }
            for m in matches
        ],
    }

    return {
        "flagged": flagged,
        "ai_level": ai_level,
        "status": status,
        "matched_rules": [
            {
                "rule_id": m.rule_id,
                "rule_name": m.rule_name,
                "short_label": m.short_label,
                "region": m.region,
                "severity": m.severity,
                "effective_date": m.effective_date,
                "summary": m.summary,
                "disclosure_type": m.disclosure_type,
            }
            for m in matches
        ],
        "disclosure_piles": disclosure_piles,
        "gemini_context": gemini_context,
    }