import os
from fastapi import APIRouter, BackgroundTasks
from datetime import datetime
from core.model_loader import ModelLoader

router = APIRouter()

def _sync_bg(league: str):
    from core.predictor import predict_match
    TEAMS = {
        'EPL':       ['Manchester City FC','Arsenal FC','Liverpool FC','Chelsea FC'],
        'LA_LIGA':   ['Real Madrid CF','FC Barcelona','Atletico de Madrid'],
        'BUNDESLIGA':['FC Bayern München','Borussia Dortmund','RB Leipzig'],
    }
    for i in range(0, len(TEAMS.get(league,[]))-1, 2):
        t = TEAMS[league]
        try:
            p = predict_match(t[i], t[i+1], league)
            print(f"  Synced: {t[i]} vs {t[i+1]} → {p['value_bet']} | {p['signal_category']}")
        except Exception as e:
            print(f"  Error: {e}")

@router.post("/trigger")
def trigger(league: str = "EPL", background_tasks: BackgroundTasks = None):
    if background_tasks:
        background_tasks.add_task(_sync_bg, league)
        return {"message": f"Sync triggered for {league}"}
    return {"message": "Not available"}

@router.get("/status")
def status():
    return {"models_loaded": ModelLoader.is_loaded(),
            "loaded_leagues": ModelLoader.get_loaded_leagues(),
            "api_key_set": bool(os.getenv("FOOTBALL_API_KEY","")),
            "version":"4.0-per-league",
            "timestamp": datetime.now().isoformat()}