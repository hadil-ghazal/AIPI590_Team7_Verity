from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


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