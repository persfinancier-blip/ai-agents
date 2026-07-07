from fastapi import FastAPI

from app.api.v1 import api_router

app = FastAPI(title="Decision Center", version="0.1.0")
app.include_router(api_router, prefix="/api/v1")


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}
