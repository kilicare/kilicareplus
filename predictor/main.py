import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from routers import predictions, matches, sync
from core.model_loader import ModelLoader


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔄 Loading Elite ML Models v3.0...")
    success = ModelLoader.load()
    if success:
        print("✅ Elite models loaded!")
    else:
        print("⚠️ Models not loaded — using ELO fallback")
    yield
    print("👋 Predictor shutting down...")


app = FastAPI(
    title="KilicareGO Elite Predictor API v3.0",
    description="Elite match prediction — All 15 problems solved",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:3000",
                   "http://127.0.0.1:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
app.include_router(matches.router, prefix="/matches", tags=["matches"])
app.include_router(sync.router, prefix="/sync", tags=["sync"])


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": ModelLoader.is_loaded(),
        "version": "3.0-elite",
        "problems_solved": 15,
    }


@app.get("/")
def root():
    return {
        "message": "KilicareGO Elite Predictor v3.0 🎯",
        "features": [
            "ELO Rating System",
            "Exponential Form Weighting",
            "True H2H Analysis",
            "Probability Calibration",
            "Value Bet Signal Engine",
        ]
    }