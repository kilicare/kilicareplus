"""
Team name validation for predictions.

DEPRECATED: This module uses the legacy validation approach.

⚠️ DO NOT USE THIS DIRECTLY
   Use: TeamResolverService from services.team_resolver
   
This validator is kept for BACKWARDS COMPATIBILITY ONLY.
All new code must use the universal resolver service in services/team_resolver.py.
"""

from typing import Tuple, Dict, Any
from .services.team_resolver import get_resolver, ResolutionStatus


def validate_team_name(
    input_team: str,
    league: str,
    threshold: int = 85
) -> Tuple[bool, str, float, str]:
    """
    DEPRECATED: Use TeamResolverService.resolve() instead.
    
    Validate and correct team name using the universal resolver.
    
    Args:
        input_team: User-provided team name
        league: EPL, LA_LIGA, or BUNDESLIGA
        threshold: Confidence threshold (0-100) for auto-correction
    
    Returns:
        Tuple of (is_valid, canonical_name, confidence_score, status)
        - is_valid: Whether to proceed with prediction
        - canonical_name: Corrected team name (or input_team if no match)
        - confidence_score: Fuzzy match confidence (0-100)
        - status: 'VALID' | 'AMBIGUOUS' | 'NOT_FOUND'
    """
    resolver = get_resolver()
    result = resolver.resolve(input_team, league, confidence_threshold=threshold / 100.0)
    
    # Map new status to legacy tuple format
    is_valid = result.status == ResolutionStatus.VALID
    canonical = result.canonical_name or ''
    confidence = result.confidence
    status_str = result.status.value  # 'VALID', 'AMBIGUOUS', 'NOT_FOUND'
    
    return (is_valid, canonical, confidence, status_str)


def validate_teams_for_prediction(
    home_team: str,
    away_team: str,
    league: str,
    threshold: int = 85
) -> Tuple[bool, Dict[str, Any], str]:
    """
    DEPRECATED: Use TeamResolverService.resolve() for each team instead.
    
    Validate both teams for a prediction request using the universal resolver.
    
    Args:
        home_team: Home team name
        away_team: Away team name
        league: League code
        threshold: Auto-correction threshold
    
    Returns:
        Tuple of (all_valid, validation_data, error_message)
        - all_valid: Whether both teams passed validation
        - validation_data: Dict with validation metadata for both teams
        - error_message: Bilingual error message (Swahili + English) or ''
    """
    resolver = get_resolver()
    
    # Resolve both teams
    home_result = resolver.resolve(home_team, league, confidence_threshold=threshold / 100.0)
    away_result = resolver.resolve(away_team, league, confidence_threshold=threshold / 100.0)
    
    # Check if both are valid (for predictor, we need VALID status, not AMBIGUOUS)
    all_valid = (
        home_result.status == ResolutionStatus.VALID
        and away_result.status == ResolutionStatus.VALID
    )
    
    # Build validation data
    validation_data = {
        'home_team': {
            'input': home_team,
            'canonical': home_result.canonical_name or '',
            'confidence': round(home_result.confidence, 1),
            'status': home_result.status.value,
            'method': home_result.method.value,
        },
        'away_team': {
            'input': away_team,
            'canonical': away_result.canonical_name or '',
            'confidence': round(away_result.confidence, 1),
            'status': away_result.status.value,
            'method': away_result.method.value,
        },
        'threshold': threshold,
        'phase': 'universal_resolver_v2',
    }
    
    # Generate bilingual error messages
    error_message = ''
    
    if home_result.status != ResolutionStatus.VALID:
        error_message = (
            f"Jina la timu nyumbani limetokea kuwa '{home_result.status.value}': "
            f"'{home_team}'. {home_result.message}\n"
            f"---\n"
            f"Home team '{home_team}' status: {home_result.status.value}. "
            f"{home_result.message}"
        )
    
    if away_result.status != ResolutionStatus.VALID:
        if error_message:
            error_message += "\n\n"
        
        error_message += (
            f"Jina la timu nje limetokea kuwa '{away_result.status.value}': "
            f"'{away_team}'. {away_result.message}\n"
            f"---\n"
            f"Away team '{away_team}' status: {away_result.status.value}. "
            f"{away_result.message}"
        )
    
    return (all_valid, validation_data, error_message)


def get_all_teams(league: str) -> list:
    """Get list of all valid teams for a league using the universal resolver."""
    resolver = get_resolver()
    return resolver.get_all_teams(league)


def get_master_teams_by_league() -> Dict[str, list]:
    """Get full master registry of teams by league using the universal resolver."""
    resolver = get_resolver()
    return {
        'EPL': resolver.get_all_teams('EPL'),
        'LA_LIGA': resolver.get_all_teams('LA_LIGA'),
        'BUNDESLIGA': resolver.get_all_teams('BUNDESLIGA'),
    }

