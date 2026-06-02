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
    print("🔄 Loading KilicareGO Elite V4 Models...")
    success = ModelLoader.load()
    if success:
        print(f"✅ Loaded leagues: {ModelLoader.get_loaded_leagues()}")
    else:
        print("⚠️ Using ELO fallback")
    yield


app = FastAPI(
    title="KilicareGO Elite Predictor V4",
    description="Per-league specific models — ELO consistent",
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000","http://localhost:3000","http://127.0.0.1:8000"],
    allow_methods=["*"], allow_headers=["*"],
)

app.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
app.include_router(matches.router,     prefix="/matches",     tags=["matches"])
app.include_router(sync.router,        prefix="/sync",        tags=["sync"])


@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "4.0-per-league",
        "loaded_leagues": ModelLoader.get_loaded_leagues(),
        "models_loaded": ModelLoader.is_loaded(),
    }

@app.get("/")
def root():
    return {
        "message": "KilicareGO Elite V4 🎯",
        "architecture": "per_league_specific",
        "leagues": ModelLoader.get_loaded_leagues(),
    }