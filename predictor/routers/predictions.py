from fastapi import APIRouter, HTTPException, Query
from core.predictor import predict_match
from core.model_loader import ModelLoader
from core.validator import validate_team_name, get_all_teams
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
    """
    Predict match outcome with DATA VALIDATION GATEWAY.
    
    PHASE 1: Fuzzy validation of team names
    - Score >= 85%: Auto-correct and use
    - Score 60-84%: Return suggestion (AMBIGUOUS)
    - Score < 60%: Reject (NOT_FOUND)
    
    Args:
        home_team: Home team name (will be validated)
        away_team: Away team name (will be validated)
        league: League code ('EPL', 'LA_LIGA', 'BUNDESLIGA')
        matchday: Match day number (default 20)
    
    Returns:
        Prediction with validation metadata
    """
    if not home_team or not away_team:
        raise HTTPException(400, "home_team and away_team required")
    
    # ════════════════════════════════════════════════════════════════════════════
    # VALIDATION GATEWAY - PHASE 1
    # ════════════════════════════════════════════════════════════════════════════
    
    h_valid, h_canonical, h_confidence, h_status = validate_team_name(
        home_team, league, threshold=85
    )
    a_valid, a_canonical, a_confidence, a_status = validate_team_name(
        away_team, league, threshold=85
    )
    
    # Handle home team validation
    if h_status == "AMBIGUOUS":
        # Suggest closest match
        raise HTTPException(
            422,
            f"AMBIGUOUS_HOME_TEAM: Jina '{home_team}' sio wazi. "
            f"Je, ulimaanisha '{h_canonical}'? (Ujumbe: {h_confidence:.0f}%) | "
            f"Team '{home_team}' is ambiguous. Did you mean '{h_canonical}'? "
            f"(Confidence: {h_confidence:.0f}%)"
        )
    elif h_status == "NOT_FOUND":
        # Team not found
        raise HTTPException(
            404,
            f"HOME_TEAM_NOT_FOUND: Timu '{home_team}' haipo kwenye ligi {league}. "
            f"Tafadhali hakikisha umeandika jina sahihi. | "
            f"Team '{home_team}' not found in league {league}. Please check spelling."
        )
    
    # Handle away team validation
    if a_status == "AMBIGUOUS":
        # Suggest closest match
        raise HTTPException(
            422,
            f"AMBIGUOUS_AWAY_TEAM: Jina '{away_team}' sio wazi. "
            f"Je, ulimaanisha '{a_canonical}'? (Ujumbe: {a_confidence:.0f}%) | "
            f"Team '{away_team}' is ambiguous. Did you mean '{a_canonical}'? "
            f"(Confidence: {a_confidence:.0f}%)"
        )
    elif a_status == "NOT_FOUND":
        # Team not found
        raise HTTPException(
            404,
            f"AWAY_TEAM_NOT_FOUND: Timu '{away_team}' haipo kwenye ligi {league}. "
            f"Tafadhali hakikisha umeandika jina sahihi. | "
            f"Team '{away_team}' not found in league {league}. Please check spelling."
        )
    
    # ════════════════════════════════════════════════════════════════════════════
    # BOTH TEAMS VALIDATED - NOW USE CANONICAL NAMES
    # ════════════════════════════════════════════════════════════════════════════
    
    result = predict_match(h_canonical, a_canonical, league, matchday)
    
    output = {
        'home_team': h_canonical, 
        'away_team': a_canonical,
        'league': league,
        'meta': {
            'validation': {
                'home_team': {
                    'input': home_team,
                    'canonical': h_canonical,
                    'confidence': round(h_confidence, 2),
                    'status': 'VALID'
                },
                'away_team': {
                    'input': away_team,
                    'canonical': a_canonical,
                    'confidence': round(a_confidence, 2),
                    'status': 'VALID'
                },
                'threshold': 85,
                'phase': 'data_validation_gateway_v1',
            }
        },
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