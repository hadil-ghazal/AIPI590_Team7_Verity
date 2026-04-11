from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from shotgun_api3 import Shotgun
from pathlib import Path
import os


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


# Input structure
class FieldInput(BaseModel):
    value: str
    source: str


class AssetInput(BaseModel):
    asset_name: FieldInput
    tool_used: FieldInput
    region: FieldInput


# Output structure
class AssetOutput(BaseModel):
    ai_level: str
    flag: bool
    disclosure: str
    status: str


@app.get("/")
def home():
    return {"message": "Verity backend is running"}


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



@app.post("/evaluate-asset", response_model=AssetOutput)
def evaluate_asset(payload: AssetInput):
    # VERY SIMPLE LOGIC (we will improve later)

    tool = payload.tool_used.value.lower()
    region = payload.region.value

    # Determine AI level
    if "runway" in tool:
        ai_level = "AI-assisted"
    elif "midjourney" in tool:
        ai_level = "Fully AI-generated"
    else:
        ai_level = "Human"

    # Determine if flagged
    flag = False
    if region == "California" and ai_level != "Human":
        flag = True

    # Disclosure
    if flag:
        disclosure = f"This asset includes {ai_level} content and requires disclosure in {region}."
        status = "Needs Review"
    else:
        disclosure = "No disclosure required."
        status = "Clear"

    return {
        "ai_level": ai_level,
        "flag": flag,
        "disclosure": disclosure,
        "status": status
    }


@app.get("/shotgrid-assets-with-evaluation/{entity_type}")
def shotgrid_assets_with_evaluation(entity_type: str, limit: int = 50):
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
            tool = (record["tool_used"]["value"] or "").lower()
            region = record["region"]["value"] or "California"

            if "runway" in tool:
                ai_level = "AI-assisted"
            elif "midjourney" in tool:
                ai_level = "Fully AI-generated"
            elif "photoshop generative fill" in tool or "ai assist" in tool:
                ai_level = "AI-assisted"
            else:
                ai_level = "Human"

            flag = region == "California" and ai_level != "Human"

            if flag:
                disclosure = f"This asset includes {ai_level} content and requires disclosure in {region}."
                status = "Needs Review"
            else:
                disclosure = "No disclosure required."
                status = "Clear"

            record["evaluation"] = {
                "ai_level": ai_level,
                "flag": flag,
                "disclosure": disclosure,
                "status": status
            }

            enriched.append(record)

        return {
            "entity_type": entity_type,
            "ai_fields_detected": ai_fields,
            "records": enriched
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load and evaluate ShotGrid assets: {str(e)}")   