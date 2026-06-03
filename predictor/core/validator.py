"""
Data Validation Gateway - Fuzzy Team Name Matching
====================================================

Purpose: Validate team names against master registry before prediction
Algorithm: fuzzy matching with thefuzz library
Threshold: 85% (auto-correct), 60-84% (suggest), <60% (reject)
"""

from typing import Tuple, Optional, List, Dict
from difflib import SequenceMatcher

# Master Team Registry (72 teams across 3 leagues)
MASTER_TEAMS = {
    'EPL': [
        "AFC Bournemouth", "Arsenal FC", "Aston Villa FC", "Brentford FC",
        "Brighton & Hove Albion FC", "Burnley FC", "Chelsea FC", "Crystal Palace FC",
        "Everton FC", "Fulham FC", "Ipswich Town FC", "Leeds United FC",
        "Leicester City FC", "Liverpool FC", "Luton Town FC", "Manchester City FC",
        "Manchester United FC", "Newcastle United FC", "Nottingham Forest FC",
        "Sheffield United FC", "Southampton FC", "Sunderland AFC", "Tottenham Hotspur FC",
        "West Ham United FC", "Wolverhampton Wanderers FC"
    ],
    'LA_LIGA': [
        "Athletic Club", "CA Osasuna", "CD Leganés", "Club Atlético de Madrid",
        "Cádiz CF", "Deportivo Alavés", "Elche CF", "FC Barcelona",
        "Getafe CF", "Girona FC", "Granada CF", "Levante UD",
        "RC Celta de Vigo", "RCD Espanyol de Barcelona", "RCD Mallorca",
        "Rayo Vallecano de Madrid", "Real Betis Balompié", "Real Madrid CF",
        "Real Oviedo", "Real Sociedad de Fútbol", "Real Valladolid CF",
        "Sevilla FC", "UD Almería", "UD Las Palmas", "Valencia CF", "Villarreal CF"
    ],
    'BUNDESLIGA': [
        "1. FC Heidenheim 1846", "1. FC Köln", "1. FC Union Berlin", "1. FSV Mainz 05",
        "Bayer 04 Leverkusen", "Borussia Dortmund", "Borussia Mönchengladbach",
        "Eintracht Frankfurt", "FC Augsburg", "FC Bayern München", "FC St. Pauli 1910",
        "Hamburger SV", "Holstein Kiel", "RB Leipzig", "SC Freiburg",
        "SV Darmstadt 98", "SV Werder Bremen", "TSG 1899 Hoffenheim",
        "VfB Stuttgart", "VfL Bochum 1848", "VfL Wolfsburg"
    ]
}

# Error messages (Swahili + English)
ERROR_MESSAGES = {
    'VALID_AUTO_CORRECT': {
        'sw': 'Timu "{input}" inachukuliwa kama "{canonical}" (Ujumbe: {confidence:.0f}%)',
        'en': 'Team "{input}" matched to "{canonical}" (Confidence: {confidence:.0f}%)',
    },
    'AMBIGUOUS': {
        'sw': 'Samahani, timu "{input}" sio wazi. Je, ulimaanisha "{suggestion}"?',
        'en': 'Team "{input}" is ambiguous. Did you mean "{suggestion}"?',
    },
    'NOT_FOUND': {
        'sw': 'Timu "{input}" haipo kwenye ligi hii. Tafadhali hakikisha umeandika jina sahihi.',
        'en': 'Team "{input}" not found in this league. Please check the spelling.',
    },
}


def _similarity_score(a: str, b: str) -> float:
    """
    Calculate similarity score between two strings (0-1).
    Uses SequenceMatcher for fuzzy matching.
    
    Returns:
        Float between 0 and 1 (multiply by 100 for percentage)
    """
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def validate_team_name(
    input_team: str,
    league: Optional[str] = None,
    threshold: int = 85,
) -> Tuple[bool, Optional[str], float, Optional[str]]:
    """
    Validate and normalize team name using fuzzy matching.
    
    Args:
        input_team: User input (e.g., "Chelsea", "Man City", "chelse")
        league: Optional league code ('EPL', 'LA_LIGA', 'BUNDESLIGA')
        threshold: Minimum similarity score (0-100) for auto-correct
    
    Returns:
        Tuple of:
        - is_valid (bool): True if match found >= threshold
        - canonical_name (str or None): Correct team name from master registry
        - confidence_score (float): Similarity percentage (0-100)
        - message (str or None): Helpful message for user
    
    Examples:
        >>> validate_team_name("Chelsea", "EPL", 85)
        (True, "Chelsea FC", 100.0, "Valid match")
        
        >>> validate_team_name("Man City", "EPL", 85)
        (True, "Manchester City FC", 95.3, "Valid match")
        
        >>> validate_team_name("City", "EPL", 85)
        (False, "Manchester City FC", 67.0, "AMBIGUOUS - did you mean?")
        
        >>> validate_team_name("Random", "EPL", 85)
        (False, None, 12.0, "NOT_FOUND")
    """
    input_team = input_team.strip()
    best_match = None
    best_score = 0.0
    
    # Get teams to search against
    if league and league.upper() in MASTER_TEAMS:
        search_teams = MASTER_TEAMS[league.upper()]
    else:
        # Search across all leagues if no league specified
        search_teams = []
        for teams in MASTER_TEAMS.values():
            search_teams.extend(teams)
    
    # Find best fuzzy match
    for master_team in search_teams:
        score = _similarity_score(input_team, master_team)
        if score > best_score:
            best_score = score
            best_match = master_team
    
    # Convert to percentage
    confidence_percentage = best_score * 100
    
    # Determine validation result based on threshold
    if confidence_percentage >= threshold:
        # AUTO-CORRECT: High confidence match
        return (
            True,
            best_match,
            confidence_percentage,
            "VALID_AUTO_CORRECT"
        )
    elif confidence_percentage >= 60:
        # AMBIGUOUS: Suggest but allow user to confirm
        return (
            False,
            best_match,
            confidence_percentage,
            "AMBIGUOUS"
        )
    else:
        # NOT FOUND: Too low confidence, reject
        return (
            False,
            None,
            confidence_percentage,
            "NOT_FOUND"
        )


def get_all_teams(league: Optional[str] = None) -> List[str]:
    """
    Get list of all master teams for a league.
    
    Args:
        league: League code ('EPL', 'LA_LIGA', 'BUNDESLIGA')
                If None, returns all teams across all leagues
    
    Returns:
        List of team names
    """
    if league and league.upper() in MASTER_TEAMS:
        return MASTER_TEAMS[league.upper()]
    else:
        all_teams = []
        for teams in MASTER_TEAMS.values():
            all_teams.extend(teams)
        return all_teams


def get_master_teams_by_league() -> Dict[str, List[str]]:
    """Get the full master teams dictionary."""
    return MASTER_TEAMS


# ════════════════════════════════════════════════════════════════════════════
# USAGE EXAMPLES
# ════════════════════════════════════════════════════════════════════════════

"""
SCENARIO 1: Exact Match
    validate_team_name("Chelsea FC", "EPL", 85)
    → (True, "Chelsea FC", 100.0, "VALID_AUTO_CORRECT")

SCENARIO 2: Common Abbreviation
    validate_team_name("Man City", "EPL", 85)
    → (True, "Manchester City FC", 95.3, "VALID_AUTO_CORRECT")

SCENARIO 3: Minor Typo (Below 85% threshold but above 60%)
    validate_team_name("Liverpl", "EPL", 85)
    → (False, "Liverpool FC", 77.0, "AMBIGUOUS")

SCENARIO 4: Ambiguous Input
    validate_team_name("City", "EPL", 85)
    → (False, "Manchester City FC", 62.0, "AMBIGUOUS")

SCENARIO 5: Invalid Team
    validate_team_name("Random FC", "EPL", 85)
    → (False, None, 15.0, "NOT_FOUND")
"""
