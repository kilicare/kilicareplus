import os
from fastapi import APIRouter, BackgroundTasks
from datetime import datetime
from core.model_loader import ModelLoader

router = APIRouter()


def _sync_bg(league: str):
    from core.predictor import predict_match
    TEAMS = {
        'EPL': [
            'Manchester City FC', 'Arsenal FC', 'Liverpool FC',
            'Chelsea FC', 'Tottenham Hotspur FC',
        ],
        'LA_LIGA': [
            'Real Madrid CF', 'FC Barcelona', 'Atletico de Madrid',
        ],
        'BUNDESLIGA': [
            'FC Bayern München', 'Borussia Dortmund', 'RB Leipzig',
        ],
    }
    teams = TEAMS.get(league, [])
    for i in range(0, len(teams) - 1, 2):
        try:
            pred = predict_match(teams[i], teams[i+1], league)
            print(f"  Synced: {teams[i]} vs {teams[i+1]} → {pred['value_bet']}")
        except Exception as e:
            print(f"  Sync error: {e}")


@router.post("/trigger")
def trigger_sync(league: str = "EPL", background_tasks: BackgroundTasks = None):
    if background_tasks:
        background_tasks.add_task(_sync_bg, league)
        return {"message": f"Sync triggered for {league}", "status": "background"}
    return {"message": "Not available"}


@router.get("/status")
def sync_status():
    return {
        "models_loaded": ModelLoader.is_loaded(),
        "api_key_set":   bool(os.getenv("FOOTBALL_API_KEY", "")),
        "version":       "3.0-elite",
        "timestamp":     datetime.now().isoformat(),
    }