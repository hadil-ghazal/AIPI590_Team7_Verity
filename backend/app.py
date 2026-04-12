from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from shotgun_api3 import Shotgun
from pathlib import Path
import os

# ── Verity Rules Engine + Gemini Drafter ───────────────────────────────────
from rules_engine import evaluate_asset as run_rules_engine, classify_tool
from gemini_drafter import draft_disclosures

ENV_PATH = Path(__file__).resolve().parent / ".env"
print(f"Loading .env from: {ENV_PATH}")
load_dotenv(dotenv_path=ENV_PATH)


app = FastAPI()

SHOTGRID_URL = os.getenv("SHOTGRID_URL")
SHOTGRID_SCRIPT_NAME = os.getenv("SHOTGRID_SCRIPT_NAME")
SHOTGRID_API_KEY = os.getenv("SHOTGRID_API_KEY")



def get_sg():
    if not SHOTGRID_URL or not SHOTGRID_SCRIPT_NAME or not SHOTGRID_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Missing ShotGrid credentials. Set SHOTGRID_URL, SHOTGRID_SCRIPT_NAME, and SHOTGRID_API_KEY."
        )

    try:
        return Shotgun(
            SHOTGRID_URL,
            script_name=SHOTGRID_SCRIPT_NAME,
            api_key=SHOTGRID_API_KEY,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ShotGrid connection failed: {str(e)}")


def normalize_source(value: Any, source_type: str) -> Dict[str, Any]:
    return {
        "value": value if value not in [None, ""] else None,
        "source": source_type
    }

def find_ai_fields(schema: Dict[str, Dict[str, Any]]) -> List[Dict[str, str]]:
    matches = []

    allowed_exact = {"sg_ai_tool", "sg_ai_usage"}
    allowed_names = {"ai tool", "ai usage"}

    for field_name, meta in schema.items():
        display_name = meta.get("name", {}).get("value") if isinstance(meta.get("name"), dict) else None
        display_name = (display_name or field_name).strip().lower()

        if field_name in allowed_exact or display_name in allowed_names:
            matches.append({
                "field_name": field_name,
                "display_name": display_name.title()
            })

    return matches


def build_semisynthetic_record(entity: Dict[str, Any], ai_field_names: List[str]) -> Dict[str, Any]:
    asset_name = entity.get("code") or entity.get("name") or "Untitled Asset"

    project_name = None
    if isinstance(entity.get("project"), dict):
        project_name = entity["project"].get("name")

    real_tool = entity.get("sg_ai_tool")
    if real_tool in ["None", "none", ""]:
        real_tool = None

    real_purpose = entity.get("sg_ai_usage")
    if real_purpose in ["None", "none", ""]:
        real_purpose = None


    ai_indicator = any(
    entity.get(field) not in [None, "", False, "None", "none"]
    for field in ai_field_names
)

    synthetic_tool = "Runway Gen-3" if ai_indicator and not real_tool else None
    synthetic_purpose = (
        "Synthetic placeholder layered only because AI usage field exists but lacks standardized detail."
        if ai_indicator and not real_purpose
        else None
    )

    tool_used_value = real_tool or synthetic_tool
    tool_used_source = "shotgrid" if real_tool else ("synthetic" if synthetic_tool else "synthetic")

    purpose_value = real_purpose or synthetic_purpose
    purpose_source = "shotgrid" if real_purpose else ("synthetic" if synthetic_purpose else "synthetic")

    region_value = "California"
    region_source = "derived"

    return {
        "id": entity.get("id"),
        "entity_type": entity.get("type"),
        "asset_name": normalize_source(asset_name, "shotgrid"),
        "project": normalize_source(project_name, "shotgrid"),
        "tool_used": normalize_source(tool_used_value, tool_used_source),
        "purpose": normalize_source(purpose_value, purpose_source),
        "region": normalize_source(region_value, region_source),
        "ai_indicator": normalize_source(ai_indicator, "derived"),
        "raw_ai_fields": {
            field: normalize_source(entity.get(field), "shotgrid")
            for field in ai_field_names
        }
    }


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Input / Output models ─────────────────────────────────────────────────

class FieldInput(BaseModel):
    value: str
    source: str


class AssetInput(BaseModel):
    asset_name: FieldInput
    tool_used: FieldInput
    region: FieldInput
    asset_type: Optional[FieldInput] = None
    purpose: Optional[FieldInput] = None
    distribution: Optional[FieldInput] = None
    project: Optional[FieldInput] = None
    involves_human_likeness: Optional[FieldInput] = None


class RuleMatchOut(BaseModel):
    rule_id: str
    rule_name: str
    short_label: str
    region: str
    severity: str
    effective_date: str
    summary: str
    disclosure_type: str


class DisclosureDraft(BaseModel):
    rule_id: str
    rule_name: str
    disclosure_type: str
    draft_text: str
    action_items: List[str]


class AssetOutput(BaseModel):
    ai_level: str
    flag: bool
    status: str
    matched_rules: List[RuleMatchOut]
    disclosure_piles: Dict[str, Any]
    disclosures: List[DisclosureDraft]
    combined_summary: str


@app.get("/")
def home():
    return {"message": "Verity backend is running — rules engine + Gemini drafter active"}


@app.get("/shotgrid-schema/{entity_type}")
def shotgrid_schema(entity_type: str):
    sg = get_sg()

    try:
        schema = sg.schema_field_read(entity_type)
        ai_fields = find_ai_fields(schema)

        return {
            "entity_type": entity_type,
            "ai_fields": ai_fields,
            "count": len(ai_fields)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read schema: {str(e)}")


@app.get("/shotgrid-assets/{entity_type}")
def shotgrid_assets(entity_type: str, limit: int = 50):
    sg = get_sg()

    try:
        schema = sg.schema_field_read(entity_type)
        ai_fields = find_ai_fields(schema)
        ai_field_names = [f["field_name"] for f in ai_fields]

        fields = ["id", "type", "code", "project"] + ai_field_names

        records = sg.find(
            entity_type,
            [["project.Project.name", "is", "Verity Demo Project"]],
            fields=fields,
            limit=limit
        )

        normalized = [build_semisynthetic_record(r, ai_field_names) for r in records]

        return {
            "entity_type": entity_type,
            "ai_fields_detected": ai_fields,
            "records": normalized
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load ShotGrid assets: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════
#  NEW: Rules Engine + Gemini Disclosure Endpoint
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/evaluate-asset")
async def evaluate_asset(payload: AssetInput):
    """
    Evaluate an asset through the rules engine, then call Gemini
    to draft regulation-specific disclosures.

    Flow:
      1. Normalize input into a flat asset dict
      2. Run all regulation rules (deterministic if/then)
      3. If flagged → call Gemini to draft disclosures
      4. Return combined result
    """
    # Step 1: Flatten input for the rules engine
    human_likeness_val = payload.involves_human_likeness.value if payload.involves_human_likeness else "false"
    asset = {
        "asset_name": payload.asset_name.value,
        "tool_used": payload.tool_used.value,
        "region": payload.region.value,
        "asset_type": payload.asset_type.value if payload.asset_type else "",
        "purpose": payload.purpose.value if payload.purpose else "",
        "distribution": payload.distribution.value if payload.distribution else "",
        "project": payload.project.value if payload.project else "",
        "ai_indicator": True,  # if they're submitting, AI was used
        "involves_human_likeness": human_likeness_val.lower() in ("true", "yes", "1"),
    }

    # Step 2: Run the deterministic rules engine
    engine_result = run_rules_engine(asset)

    # Step 3: If flagged, call Gemini for disclosure drafts
    disclosures = []
    combined_summary = "No disclosure required."

    draft_source = None
    if engine_result["flagged"]:
        gemini_result = await draft_disclosures(engine_result["gemini_context"])
        disclosures = gemini_result.get("disclosures", [])
        combined_summary = gemini_result.get("combined_summary", "")
        draft_source = gemini_result.get("_source", "gemini_api")

    # Step 4: Return combined result
    return {
        "ai_level": engine_result["ai_level"],
        "flag": engine_result["flagged"],
        "status": engine_result["status"],
        "matched_rules": engine_result["matched_rules"],
        "disclosure_piles": engine_result["disclosure_piles"],
        "disclosures": disclosures,
        "combined_summary": combined_summary,
        "draft_source": draft_source,
    }


# ═══════════════════════════════════════════════════════════════════════════
#  NEW: Batch evaluation for ShotGrid assets
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/shotgrid-assets-with-evaluation/{entity_type}")
async def shotgrid_assets_with_evaluation(entity_type: str, limit: int = 50):
    """
    Pull assets from ShotGrid, run each through the rules engine,
    and optionally draft disclosures via Gemini for flagged assets.
    """
    sg = get_sg()

    try:
        schema = sg.schema_field_read(entity_type)
        ai_fields = find_ai_fields(schema)
        ai_field_names = [f["field_name"] for f in ai_fields]

        fields = ["id", "type", "code", "project"] + ai_field_names

        records = sg.find(
            entity_type,
            [["project.Project.name", "is", "Verity Demo Project"]],
            fields=fields,
            limit=limit
        )

        normalized = [build_semisynthetic_record(r, ai_field_names) for r in records]

        enriched = []
        for record in normalized:
            # Build asset dict for rules engine
            asset = {
                "asset_name": record["asset_name"]["value"] or "Untitled",
                "tool_used": record["tool_used"]["value"] or "",
                "region": record["region"]["value"] or "California",
                "asset_type": "",
                "purpose": record["purpose"]["value"] or "",
                "distribution": "",
                "project": record["project"]["value"] or "",
                "ai_indicator": record["ai_indicator"]["value"],
            }

            # Run rules engine
            engine_result = run_rules_engine(asset)

            # Draft disclosures for flagged assets
            disclosures = []
            combined_summary = "No disclosure required."
            if engine_result["flagged"]:
                gemini_result = await draft_disclosures(engine_result["gemini_context"])
                disclosures = gemini_result.get("disclosures", [])
                combined_summary = gemini_result.get("combined_summary", "")

            record["evaluation"] = {
                "ai_level": engine_result["ai_level"],
                "flag": engine_result["flagged"],
                "status": engine_result["status"],
                "matched_rules": engine_result["matched_rules"],
                "disclosure_piles": engine_result["disclosure_piles"],
                "disclosures": disclosures,
                "combined_summary": combined_summary,
            }

            enriched.append(record)

        return {
            "entity_type": entity_type,
            "ai_fields_detected": ai_fields,
            "records": enriched,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load and evaluate ShotGrid assets: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════
#  NEW: Rules-only evaluation (no Gemini, for quick checks)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/evaluate-rules-only")
def evaluate_rules_only(payload: AssetInput):
    """
    Run the rules engine without calling Gemini.
    Useful for quick validation or when Gemini API key is not set.
    """
    human_likeness_val = payload.involves_human_likeness.value if payload.involves_human_likeness else "false"
    asset = {
        "asset_name": payload.asset_name.value,
        "tool_used": payload.tool_used.value,
        "region": payload.region.value,
        "asset_type": payload.asset_type.value if payload.asset_type else "",
        "purpose": payload.purpose.value if payload.purpose else "",
        "distribution": payload.distribution.value if payload.distribution else "",
        "project": payload.project.value if payload.project else "",
        "ai_indicator": True,
        "involves_human_likeness": human_likeness_val.lower() in ("true", "yes", "1"),
    }

    engine_result = run_rules_engine(asset)

    return {
        "ai_level": engine_result["ai_level"],
        "flag": engine_result["flagged"],
        "status": engine_result["status"],
        "matched_rules": engine_result["matched_rules"],
        "disclosure_piles": engine_result["disclosure_piles"],
    }
