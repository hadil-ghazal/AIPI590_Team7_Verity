from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Verity backend is running"}
