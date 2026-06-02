from fastapi import APIRouter, HTTPException, Query
from core.predictor import predict_match
from core.model_loader import ModelLoader
import numpy as np

router = APIRouter()

LEAGUE_TEAMS = {
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

# Hii function itasaidia kusafisha dictionary yoyote ya numpy
def clean_data(data):
    if isinstance(data, dict):
        return {k: clean_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_data(v) for v in data]
    elif isinstance(data, (np.integer, np.floating)):
        return data.item()
    elif isinstance(data, np.bool_):
        return bool(data)
    else:
        return data

@router.get("/accuracy")
def get_accuracy():
    meta = ModelLoader.get_metadata()
    data = {
        'version':      meta.get('version', 'unknown'),
        'architecture': meta.get('architecture', 'per_league'),
        'leagues':      meta.get('leagues_trained', []),
        'league_stats': meta.get('league_stats', {}),
        'total_matches': meta.get('total_matches', 0),
        'model_loaded':  ModelLoader.is_loaded(),
        'loaded_leagues': ModelLoader.get_loaded_leagues(),
    }
    return clean_data(data)

@router.get("/predict")
def predict(
    home_team: str = Query(...),
    away_team: str = Query(...),
    league: str   = Query("EPL"),
    matchday: int = Query(20),
):
    if not home_team or not away_team:
        raise HTTPException(400, "home_team and away_team required")
    
    result = predict_match(home_team, away_team, league, matchday)
    
    output = {
        'home_team': home_team, 
        'away_team': away_team,
        'league': league, 
        **result
    }
    return clean_data(output)

@router.get("/batch")
def predict_batch(league: str = Query("EPL")):
    teams = LEAGUE_TEAMS.get(league, LEAGUE_TEAMS['EPL'])
    preds = []
    for i in range(0, min(len(teams)-1, 6), 2):
        p = predict_match(teams[i], teams[i+1], league, 20)
        preds.append({
            'home_team': teams[i], 
            'away_team': teams[i+1],
            'league': league, 
            **p
        })
    
    return clean_data({
        'league': league, 
        'predictions': preds, 
        'count': len(preds)
    })

@router.get("/teams")
def get_teams(league: str = Query("EPL")):
    df = ModelLoader.get_training_data()
    if df is None:
        return clean_data({
            'teams': LEAGUE_TEAMS.get(league, []), 
            'count': 0,
            'source': 'default'
        })
    
    mask = df['league'] == league
    teams = sorted(set(df[mask]['home_team'].tolist() +
                       df[mask]['away_team'].tolist()))
    
    return clean_data({
        'league': league, 
        'teams': teams, 
        'count': len(teams)
    })