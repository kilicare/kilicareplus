from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
from core.predictor import predict_match
from core.model_loader import ModelLoader

router = APIRouter()


@router.get("/accuracy")
def get_accuracy():
    meta = ModelLoader.get_metadata()
    return {
        'outcome_accuracy': meta.get('outcome_accuracy', 0),
        'over25_accuracy':  meta.get('over25_accuracy', 0),
        'btts_accuracy':    meta.get('btts_accuracy', 0),
        'trained_on':       meta.get('trained_on', ''),
        'total_matches':    meta.get('total_matches', 0),
        'leagues':          meta.get('leagues', []),
        'version':          meta.get('version', 'unknown'),
        'problems_solved':  meta.get('problems_solved', []),
        'model_loaded':     ModelLoader.is_loaded(),
    }


@router.get("/predict")
def predict(
    home_team: str = Query(...),
    away_team: str = Query(...),
    league: str = Query("EPL"),
    matchday: int = Query(20),
):
    if not home_team or not away_team:
        raise HTTPException(400, "home_team and away_team required")

    result = predict_match(home_team, away_team, league, matchday)
    return {
        'home_team': home_team,
        'away_team': away_team,
        'league': league,
        **result,
    }


@router.get("/batch")
def predict_batch(league: str = Query("EPL")):
    """Predict sample matchups for a league"""
    TEAMS = {
        'EPL': [
            'Manchester City FC', 'Arsenal FC', 'Liverpool FC',
            'Chelsea FC', 'Tottenham Hotspur FC', 'Manchester United FC',
            'Newcastle United FC', 'Aston Villa FC',
        ],
        'LA_LIGA': [
            'Real Madrid CF', 'FC Barcelona', 'Atletico de Madrid',
            'Real Sociedad de Fútbol', 'Villarreal CF', 'Athletic Club',
        ],
        'BUNDESLIGA': [
            'FC Bayern München', 'Borussia Dortmund', 'RB Leipzig',
            'Bayer 04 Leverkusen', 'Eintracht Frankfurt', 'VfL Wolfsburg',
        ],
    }

    teams = TEAMS.get(league, TEAMS['EPL'])
    predictions = []

    for i in range(0, min(len(teams) - 1, 6), 2):
        pred = predict_match(teams[i], teams[i+1], league, 20)
        predictions.append({
            'home_team': teams[i],
            'away_team': teams[i+1],
            'league': league,
            **pred,
        })

    return {
        'league': league,
        'predictions': predictions,
        'count': len(predictions),
    }


@router.get("/teams")
def get_known_teams(league: str = Query("EPL")):
    """Get all known teams from training data"""
    df = ModelLoader.get_training_data()
    if df is None:
        return {"teams": [], "count": 0}

    if league:
        mask = df['league'] == league
        teams = sorted(set(df[mask]['home_team'].tolist() +
                           df[mask]['away_team'].tolist()))
    else:
        teams = sorted(set(df['home_team'].tolist() + df['away_team'].tolist()))

    return {"league": league, "teams": teams, "count": len(teams)}