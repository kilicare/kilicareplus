"""
Betting AI Utilities
- Team resolution via universal resolver
- League detection
- Prediction explanation generation
- Market recommendations

NOTE: This module delegates team resolution to the universal TeamResolverService
in backend/apps/predictions/services/team_resolver.py. This ensures all components
use the same team registry and matching logic.
"""

from typing import Optional, Tuple, Dict, List, Any
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Import universal team resolver
from ..predictions.services.team_resolver import get_resolver, ResolutionStatus

# ════════════════════════════════════════════════════════════════════════════
# TEAM & LEAGUE RESOLUTION (via universal resolver)
# ════════════════════════════════════════════════════════════════════════════

def find_team(query: str, league: Optional[str] = None) -> Optional[Dict[str, str]]:
    """
    Find team using universal resolver.
    
    Uses TeamResolverService for consistent team matching across all components.
    
    Strategy for ambiguous terms:
    - VALID: Return the team directly
    - AMBIGUOUS: Pick first suggestion (AI Chat context - assume user's likely intent)
    - NOT_FOUND: Return None
    
    Returns: {'canonical': 'Manchester City', 'league': 'EPL', 'confidence': 100.0}
    or None if not found
    """
    if not query:
        return None
    
    resolver = get_resolver()
    result = resolver.resolve(query, league)
    
    # Handle VALID results
    if result.status == ResolutionStatus.VALID:
        return {
            'canonical': result.canonical_name,
            'league': result.league or 'EPL',
            'confidence': result.confidence,
            'method': result.method.value,
        }
    
    # Handle AMBIGUOUS results - pick first suggestion for AI Chat context
    # (User is typing in natural language, likely has intent)
    if result.status == ResolutionStatus.AMBIGUOUS and result.suggestions:
        first_suggestion = result.suggestions[0]
        return {
            'canonical': first_suggestion['name'],
            'league': result.league or 'EPL',
            'confidence': first_suggestion.get('confidence', 80.0),
            'method': 'AMBIGUOUS_RESOLVED',
            'note': f'Clarified: {query} → {first_suggestion["name"]}',
        }
    
    # NOT_FOUND or no suggestions - return None
    return None


def find_teams_in_query(query: str) -> Optional[Tuple[str, str, Optional[str]]]:
    """
    Extract two teams from query string using universal resolver.
    
    Examples:
    - "Chelsea vs Arsenal" → ('Chelsea', 'Arsenal', 'EPL')
    - "Man City - Barca" → ('Manchester City', 'Barcelona', 'LA_LIGA')
    
    Returns: (home_team, away_team, league) or None if can't parse
    """
    query = query.lower().strip()
    
    # Common separators: vs, versus, v, against, dhidi ya, -
    separators = [
        ' vs ', ' versus ', ' v ', ' against ', ' dhidi ya ',
        ' - ', ' vs. ', ' -vs- ',
    ]
    
    teams = None
    for sep in separators:
        if sep in query:
            parts = query.split(sep, 1)
            if len(parts) == 2:
                teams = [p.strip() for p in parts]
                break
    
    if not teams or len(teams) != 2:
        return None
    
    # Find team 1
    team1 = find_team(teams[0])
    if not team1:
        return None
    
    # Find team 2
    team2 = find_team(teams[1])
    if not team2:
        return None
    
    # Check league consistency
    league = None
    if team1['league'] == team2['league']:
        league = team1['league']
    
    return (team1['canonical'], team2['canonical'], league)


# ════════════════════════════════════════════════════════════════════════════
# PREDICTION EXPLANATION GENERATOR
# ════════════════════════════════════════════════════════════════════════════

def explain_confidence(confidence: float) -> str:
    """Explain confidence level in human language"""
    if confidence >= 0.85:
        return "Very High confidence — the model is quite certain."
    elif confidence >= 0.70:
        return "High confidence — the model strongly favors this outcome."
    elif confidence >= 0.50:
        return "Medium confidence — this is likely, but not guaranteed."
    elif confidence >= 0.35:
        return "Low confidence — outcomes are fairly uncertain."
    else:
        return "Very Low confidence — this is a toss-up, skip if uncertain."


def explain_probability(label: str, prob: float) -> str:
    """Explain specific outcome probability"""
    if prob >= 0.60:
        return f"Strong likelihood ({prob:.1%})"
    elif prob >= 0.45:
        return f"Good chance ({prob:.1%})"
    elif prob >= 0.30:
        return f"Moderate possibility ({prob:.1%})"
    else:
        return f"Unlikely ({prob:.1%})"


def explain_elo_advantage(home_elo: float, away_elo: float) -> str:
    """Explain ELO rating difference"""
    diff = home_elo - away_elo
    
    if abs(diff) < 50:
        return "Teams are evenly matched in quality."
    elif diff > 0:
        strength = "significantly" if abs(diff) > 150 else "notably"
        return f"Home team is {strength} stronger ({diff:+.0f} ELO difference)."
    else:
        strength = "significantly" if abs(diff) > 150 else "notably"
        return f"Away team is {strength} stronger ({diff:+.0f} ELO difference)."


def explain_btts(btts_prob: float) -> str:
    """Explain BTTS probability"""
    if btts_prob >= 0.65:
        return "High probability that both teams will score."
    elif btts_prob >= 0.50:
        return "Good chance of both teams scoring."
    elif btts_prob >= 0.40:
        return "Moderate chance of both teams scoring."
    else:
        return "One team is likely to keep a clean sheet."


def explain_over_goals(over_prob: float, threshold: float = 2.5) -> str:
    """Explain over/under goals probability"""
    under_prob = 1.0 - over_prob
    
    if over_prob >= 0.60:
        return f"Likely to see more than {threshold} goals (high-scoring match expected)."
    elif over_prob >= 0.50:
        return f"Good chance of over {threshold} goals."
    elif under_prob >= 0.60:
        return f"Likely to be a low-scoring match (under {threshold} goals)."
    else:
        return f"Could go either way regarding {threshold} goals."


def explain_signal(signal: str) -> str:
    """Explain betting signal"""
    signals = {
        'STRONG': "Strong betting edge detected. Back this pick.",
        'MODERATE': "Decent edge identified. Worth considering.",
        'WEAK': "Some edge but not compelling. Only if good odds.",
        'SKIP': "No clear edge. Better opportunities available.",
        'CONTRARIAN': "Odds may undervalue this outcome.",
    }
    return signals.get(signal, "No clear signal.")


def generate_explanation_block(prediction: Dict[str, Any]) -> Dict[str, str]:
    """
    Generate human-readable explanations for all metrics.
    
    Returns dict with explanations for display.
    """
    explanations = {
        'match_analysis': "",
        'confidence_note': "",
        'elo_insight': "",
        'probability_summary': "",
        'btts_outlook': "",
        'over_goals_outlook': "",
        'betting_signal': "",
        'best_market': "",
        'risk_level': "",
    }
    
    # Extract metrics
    home_win = prediction.get('home_win_prob', 0)
    draw = prediction.get('draw_prob', 0)
    away_win = prediction.get('away_win_prob', 0)
    confidence = prediction.get('confidence', 0)
    btts = prediction.get('btts_prob', 0)
    over_25 = prediction.get('over_25_prob', 0)
    home_elo = prediction.get('home_elo', 1500)
    away_elo = prediction.get('away_elo', 1500)
    value_bet = prediction.get('value_bet', '')
    signal = prediction.get('signal', 'SKIP')
    
    # Normalize confidence to 0-1 range if needed
    if confidence > 1:
        confidence = confidence / 100.0
    
    # Normalize probabilities if needed
    if home_win > 1:
        home_win = home_win / 100.0
    if draw > 1:
        draw = draw / 100.0
    if away_win > 1:
        away_win = away_win / 100.0
    if btts > 1:
        btts = btts / 100.0
    if over_25 > 1:
        over_25 = over_25 / 100.0
    
    # Match Analysis
    max_prob = max(home_win, draw, away_win)
    if max_prob == home_win and home_win > 0.45:
        explanations['match_analysis'] = "The model favors a home win."
    elif max_prob == away_win and away_win > 0.45:
        explanations['match_analysis'] = "The model favors an away win."
    elif max_prob == draw and draw > 0.35:
        explanations['match_analysis'] = "This looks like a very balanced match. A draw is possible."
    else:
        explanations['match_analysis'] = "This is a competitive match with no dominant outcome."
    
    # Confidence
    conf_pct = int(confidence * 100)
    explanations['confidence_note'] = f"🎯 Confidence: {conf_pct}% — {explain_confidence(confidence)}"
    
    # ELO
    explanations['elo_insight'] = explain_elo_advantage(home_elo, away_elo)
    
    # Probabilities
    outcomes = []
    if home_win > 0.30:
        outcomes.append(f"🏠 Home win: {int(home_win*100)}%")
    if draw > 0.25:
        outcomes.append(f"🤝 Draw: {int(draw*100)}%")
    if away_win > 0.30:
        outcomes.append(f"⚽ Away win: {int(away_win*100)}%")
    explanations['probability_summary'] = " | ".join(outcomes)
    
    # BTTS
    explanations['btts_outlook'] = f"⚽⚽ BTTS: {int(btts*100)}% — {explain_btts(btts)}"
    
    # Over/Under
    explanations['over_goals_outlook'] = f"📈 Over 2.5: {int(over_25*100)}% — {explain_over_goals(over_25)}"
    
    # Signal
    explanations['betting_signal'] = f"🎯 Signal: {explain_signal(signal)}"
    
    # Best Market
    if value_bet:
        explanations['best_market'] = f"💎 Best value: {value_bet}"
    else:
        if home_win > 0.50:
            explanations['best_market'] = "💎 Best market: Home Win (1)"
        elif away_win > 0.50:
            explanations['best_market'] = "💎 Best market: Away Win (2)"
        elif draw > 0.35:
            explanations['best_market'] = "💎 Best market: Draw (X)"
        else:
            explanations['best_market'] = "💎 Best market: Double Chance or BTTS"
    
    # Risk Level
    if confidence >= 0.70 and signal in ['STRONG', 'MODERATE']:
        explanations['risk_level'] = "✅ Risk: LOW — Strong signal with high confidence"
    elif confidence >= 0.50:
        explanations['risk_level'] = "⚠️ Risk: MEDIUM — Reasonable edge, but hedge bets"
    else:
        explanations['risk_level'] = "🔴 Risk: HIGH — Low confidence, only small stakes"
    
    return explanations


# ════════════════════════════════════════════════════════════════════════════
# PREDICTOR ENGINE INTEGRATION
# ════════════════════════════════════════════════════════════════════════════

def call_predictor(home_team: str, away_team: str, league: str) -> Optional[Dict]:
    """
    Call the predictor engine microservice.
    
    Returns raw prediction data or None if error.
    """
    try:
        predictor_url = settings.PREDICTOR_ENGINE_URL or "http://localhost:8001"
        response = requests.get(
            f"{predictor_url}/predictions/predict",
            params={
                'home_team': home_team,
                'away_team': away_team,
                'league': league,
                'matchday': 20,
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Predictor error: {e}")
        return None


# ════════════════════════════════════════════════════════════════════════════
# ACCUMULATOR BUILDER
# ════════════════════════════════════════════════════════════════════════════

def build_accumulator_suggestions(matches: List[Dict], size: int = 3) -> List[Dict]:
    """
    Build accumulator suggestions from available matches.
    
    Args:
        matches: List of prediction dicts
        size: Number of legs in accumulator
    
    Returns: List of suggested accumulators
    """
    # Filter for strong confidence matches
    strong_matches = [
        m for m in matches
        if m.get('confidence', 0) >= 0.70
    ]
    
    if len(strong_matches) < size:
        return []
    
    # Sort by confidence descending
    strong_matches.sort(key=lambda x: x.get('confidence', 0), reverse=True)
    
    accumulators = []
    
    # Safest accumulator (all favorites)
    legs = []
    for match in strong_matches[:size]:
        home_win = match.get('home_win_prob', 0)
        away_win = match.get('away_win_prob', 0)
        
        if home_win > away_win:
            legs.append({
                'match': f"{match['home_team']} vs {match['away_team']}",
                'pick': f"{match['home_team']} Win",
                'confidence': match.get('confidence', 0),
            })
        else:
            legs.append({
                'match': f"{match['home_team']} vs {match['away_team']}",
                'pick': f"{match['away_team']} Win",
                'confidence': match.get('confidence', 0),
            })
    
    if legs:
        accumulators.append({
            'name': 'Safest Accumulator',
            'type': 'favorites',
            'legs': legs,
            'combined_confidence': min(l['confidence'] for l in legs),
        })
    
    # Value accumulator (value bets + over goals)
    legs = []
    for match in strong_matches[:size]:
        value_bet = match.get('value_bet')
        if value_bet:
            legs.append({
                'match': f"{match['home_team']} vs {match['away_team']}",
                'pick': f"Value: {value_bet}",
                'confidence': match.get('confidence', 0),
            })
    
    if len(legs) >= size:
        accumulators.append({
            'name': 'Value Accumulator',
            'type': 'value',
            'legs': legs[:size],
            'combined_confidence': min(l['confidence'] for l in legs[:size]),
        })
    
    return accumulators
