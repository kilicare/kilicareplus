import os
import time
import requests
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta

router = APIRouter()

API_KEY  = os.getenv("FOOTBALL_API_KEY", "")
BASE_URL = "https://api.football-data.org/v4"
HEADERS  = {"X-Auth-Token": API_KEY}

LEAGUE_CODES = {
    "EPL":       "PL",
    "LA_LIGA":   "PD",
    "BUNDESLIGA": "BL1",
}


def _fetch(endpoint, params=None):
    if not API_KEY:
        return None
    try:
        r = requests.get(
            f"{BASE_URL}/{endpoint}",
            headers=HEADERS,
            params=params or {},
            timeout=15,
        )
        if r.status_code == 200:
            return r.json()
        elif r.status_code == 429:
            time.sleep(65)
            return _fetch(endpoint, params)
        return None
    except Exception as e:
        print(f"API error: {e}")
        return None


@router.get("/leagues")
def get_leagues():
    return [
        {'key': 'EPL',       'label': 'Premier League', 'flag': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'country': 'England'},
        {'key': 'LA_LIGA',   'label': 'La Liga',         'flag': '🇪🇸', 'country': 'Spain'},
        {'key': 'BUNDESLIGA','label': 'Bundesliga',      'flag': '🇩🇪', 'country': 'Germany'},
    ]


@router.get("/upcoming")
def get_upcoming(league: str = Query("EPL")):
    code = LEAGUE_CODES.get(league)
    if not code:
        raise HTTPException(400, f"League {league} not supported")

    if not API_KEY:
        return _sample_upcoming(league)

    data = _fetch(f"competitions/{code}/matches", {"status": "SCHEDULED", "limit": 10})
    if not data:
        return _sample_upcoming(league)

    matches = []
    for m in data.get("matches", [])[:10]:
        matches.append({
            "external_id":    str(m.get("id")),
            "league":         league,
            "home_team":      m["homeTeam"]["name"],
            "away_team":      m["awayTeam"]["name"],
            "home_team_logo": m["homeTeam"].get("crest"),
            "away_team_logo": m["awayTeam"].get("crest"),
            "scheduled_at":   m.get("utcDate"),
            "matchday":       m.get("matchday", 1),
            "status":         m.get("status"),
        })

    return {"league": league, "matches": matches, "count": len(matches)}


@router.get("/standings")
def get_standings(league: str = Query("EPL")):
    code = LEAGUE_CODES.get(league)
    if not code:
        raise HTTPException(400, f"League {league} not supported")

    if not API_KEY:
        return {"message": "API key required"}

    data = _fetch(f"competitions/{code}/standings")
    if not data:
        return {"message": "Could not fetch standings"}

    standings = []
    try:
        for e in data["standings"][0]["table"][:20]:
            standings.append({
                "position":      e["position"],
                "team":          e["team"]["name"],
                "played":        e["playedGames"],
                "won":           e["won"],
                "drawn":         e["draw"],
                "lost":          e["lost"],
                "goals_for":     e["goalsFor"],
                "goals_against": e["goalsAgainst"],
                "goal_diff":     e["goalDifference"],
                "points":        e["points"],
            })
    except Exception:
        pass

    return {"league": league, "standings": standings}


def _sample_upcoming(league: str):
    SAMPLES = {
        'EPL': [
            ('Manchester City FC', 'Arsenal FC'),
            ('Liverpool FC', 'Chelsea FC'),
            ('Tottenham Hotspur FC', 'Manchester United FC'),
            ('Newcastle United FC', 'Aston Villa FC'),
        ],
        'LA_LIGA': [
            ('Real Madrid CF', 'FC Barcelona'),
            ('Atletico de Madrid', 'Real Sociedad de Fútbol'),
            ('Villarreal CF', 'Athletic Club'),
        ],
        'BUNDESLIGA': [
            ('FC Bayern München', 'Borussia Dortmund'),
            ('RB Leipzig', 'Bayer 04 Leverkusen'),
            ('Eintracht Frankfurt', 'VfL Wolfsburg'),
        ],
    }
    base = datetime.now()
    matches = []
    for i, (h, a) in enumerate(SAMPLES.get(league, [])):
        matches.append({
            "external_id":    f"sample_{league}_{i}",
            "league":         league,
            "home_team":      h,
            "away_team":      a,
            "home_team_logo": None,
            "away_team_logo": None,
            "scheduled_at":   (base + timedelta(days=i*2+1)).isoformat(),
            "matchday":       20,
            "status":         "SCHEDULED",
        })
    return {"league": league, "matches": matches, "count": len(matches), "source": "sample"}