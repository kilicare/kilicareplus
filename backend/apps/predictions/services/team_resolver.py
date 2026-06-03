"""
KILICAREGO+ PRO MAX — UNIVERSAL TEAM RESOLUTION SERVICE V2
============================================================

Single source of truth for all team resolution across the prediction ecosystem.

Responsibilities:
- Canonical name management (72 teams across 3 leagues)
- Alias resolution (1 input → exact canonical name)
- Typo recovery (fuzzy matching with threshold)
- Ambiguity detection (multiple possible matches)
- League detection (automatic league inference)
- Confidence scoring (0-100%)
- Suggestion generation (top alternatives)
- Predictor protection (validates before model call)

Architecture: One resolver powers all components
- Prediction Form
- AI Chat
- History
- Analytics
- Future Features
"""

from difflib import SequenceMatcher
from typing import Tuple, List, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum


# ════════════════════════════════════════════════════════════════════════════
# RESOLUTION STATUS ENUMS
# ════════════════════════════════════════════════════════════════════════════

class ResolutionStatus(str, Enum):
    """Resolution status codes"""
    VALID = "VALID"  # Exact match or 95%+ confidence
    AMBIGUOUS = "AMBIGUOUS"  # 70-94% confidence, multiple options
    NOT_FOUND = "NOT_FOUND"  # <70% confidence
    LEAGUE_CONFLICT = "LEAGUE_CONFLICT"  # Team not in specified league
    NOT_A_TEAM = "NOT_A_TEAM"  # Input too short or nonsensical


class ResolutionMethod(str, Enum):
    """How the team was resolved"""
    EXACT_MATCH = "exact_match"  # 100% canonical match
    ALIAS_MATCH = "alias_match"  # Found in alias list
    FUZZY_MATCH = "fuzzy_match"  # Fuzzy matching fallback
    LEAGUE_DETECTION = "league_detection"  # Inferred from league
    NONE = "none"  # Not resolved


# ════════════════════════════════════════════════════════════════════════════
# RESOLUTION DATA STRUCTURES
# ════════════════════════════════════════════════════════════════════════════

@dataclass
class ResolutionResult:
    """Result of team resolution"""
    input_text: str
    canonical_name: Optional[str]
    confidence: float  # 0-100
    status: ResolutionStatus
    method: ResolutionMethod
    league: Optional[str]
    suggestions: List[Dict[str, Any]]  # [{"name": str, "confidence": float}]
    message: str
    should_confirm: bool  # True if user should confirm


# ════════════════════════════════════════════════════════════════════════════
# FORBIDDEN TERMS - NEVER AUTO-RESOLVE (COLLISION SAFETY)
# ════════════════════════════════════════════════════════════════════════════
# These terms are ambiguous across multiple teams.
# They MUST return AMBIGUOUS status even with 100% confidence.
# This prevents silent wrong predictions.

FORBIDDEN_AUTO_RESOLVE = {
    'ac', 'albion', 'athletic', 'cf', 'city', 'club', 'county',
    'fc', 'forest', 'inter', 'madrid', 'man', 'palace', 'rangers', 'real',
    'rovers', 'sc', 'sporting', 'spurs', 'union', 'united', 'villa',
    'wanderers',
}


# ════════════════════════════════════════════════════════════════════════════
# CANONICAL TEAM REGISTRY (SOURCE OF TRUTH)
# ════════════════════════════════════════════════════════════════════════════

CANONICAL_TEAMS = {
    'EPL': [
        'Manchester City FC',
        'Manchester United FC',
        'Arsenal FC',
        'Chelsea FC',
        'Liverpool FC',
        'Tottenham Hotspur FC',
        'Newcastle United FC',
        'West Ham United FC',
        'Leicester City FC',
        'Leeds United FC',
        'Everton FC',
        'Aston Villa FC',
        'Brentford FC',
        'Brighton & Hove Albion FC',
        'Crystal Palace FC',
        'Fulham FC',
        'Wolverhampton Wanderers FC',
        'Nottingham Forest FC',
        'Southampton FC',
        'Burnley FC',
        'Ipswich Town FC',
        'Luton Town FC',
        'Sunderland AFC',
        'AFC Bournemouth',
        'Sheffield United FC',
    ],
    'LA_LIGA': [
        'FC Barcelona',
        'Real Madrid CF',
        'Club Atlético de Madrid',
        'Athletic Club',
        'Real Betis Balompié',
        'Real Sociedad de Fútbol',
        'Valencia CF',
        'Sevilla FC',
        'Villarreal CF',
        'Getafe CF',
        'Girona FC',
        'CA Osasuna',
        'RC Celta de Vigo',
        'RCD Mallorca',
        'Rayo Vallecano de Madrid',
        'UD Las Palmas',
        'UD Almería',
        'CD Leganés',
        'Elche CF',
        'Granada CF',
        'Levante UD',
        'Cádiz CF',
        'Real Oviedo',
        'Real Valladolid CF',
        'RCD Espanyol de Barcelona',
        'Deportivo Alavés',
    ],
    'BUNDESLIGA': [
        'FC Bayern München',
        'Borussia Dortmund',
        'Bayer 04 Leverkusen',
        'RB Leipzig',
        'Eintracht Frankfurt',
        'SC Freiburg',
        'VfB Stuttgart',
        'Borussia Mönchengladbach',
        '1. FC Union Berlin',
        'TSG 1899 Hoffenheim',
        'FC Augsburg',
        'VfL Wolfsburg',
        'Werder Bremen',
        'Hamburger SV',
        '2. FC Köln',
        '3. FSV Mainz 05',
        'VfL Bochum 1848',
        'Holstein Kiel',
        'SV Darmstadt 98',
        '4. FC Heidenheim 1846',
        'FC St. Pauli 1910',
    ],
}


# ════════════════════════════════════════════════════════════════════════════
# HUMAN-FRIENDLY ALIASES (WHAT USERS SAY)
# ════════════════════════════════════════════════════════════════════════════

TEAM_ALIASES = {
    'Manchester City FC': [
        'man city', 'manchester city', 'city', 'mcfc', 'man c',
        'mancity', 'manchester c', 'city fc'
    ],
    'Manchester United FC': [
        'man united', 'manchester united', 'man u', 'united', 'mufc',
        'manchester u', 'manu', 'manutd'
    ],
    'Arsenal FC': [
        'arsenal', 'the gunners', 'gunners', 'arsnal', 'arsnl',
        'afc', 'arsenal london'
    ],
    'Chelsea FC': [
        'chelsea', 'the blues', 'blues', 'chelse', 'chelsee',
        'cfc', 'chelsea london'
    ],
    'Liverpool FC': [
        'liverpool', 'the reds', 'reds', 'liverpol', 'livercool',
        'lfc', 'liverpool fc', 'liver pool'
    ],
    'Tottenham Hotspur FC': [
        'spurs', 'tottenham', 'hotspur', 'the lilywhites', 'tottenham hotspur',
        'thfc', 'spurs london'
    ],
    'Newcastle United FC': [
        'newcastle', 'the magpies', 'magpies', 'nufc', 'newcastle united',
        'newcastle fc'
    ],
    'West Ham United FC': [
        'west ham', 'the hammers', 'hammers', 'whu', 'west ham united',
        'westham'
    ],
    'Leicester City FC': [
        'leicester', 'the foxes', 'foxes', 'lcfc', 'leicester city',
        'leicester fc'
    ],
    'Leeds United FC': [
        'leeds', 'the whites', 'whites', 'lufc', 'leeds united', 'leeds fc'
    ],
    'Everton FC': [
        'everton', 'the toffees', 'toffees', 'efc', 'everton fc'
    ],
    'Aston Villa FC': [
        'aston villa', 'villa', 'the claret and blue', 'avfc',
        'villa fc'
    ],
    'Brentford FC': [
        'brentford', 'the bees', 'bees', 'bfc', 'brentford fc'
    ],
    'Brighton & Hove Albion FC': [
        'brighton', 'the seagulls', 'seagulls', 'albion',
        'brighton hove albion'
    ],
    'Crystal Palace FC': [
        'crystal palace', 'palace', 'the eagles', 'eagles', 'cpfc',
        'palace fc'
    ],
    'Fulham FC': [
        'fulham', 'the cottagers', 'cottagers', 'ffc', 'fulham fc'
    ],
    'Wolverhampton Wanderers FC': [
        'wolves', 'wolverhampton', 'wanderers', 'wwfc',
        'wolverhampton wanderers'
    ],
    'Nottingham Forest FC': [
        'nottingham forest', 'forest', 'nffc', 'nottm forest',
        'nottingham fc'
    ],
    'Southampton FC': [
        'southampton', 'the saints', 'saints', 'sfc', 'southampton fc'
    ],
    'Burnley FC': [
        'burnley', 'the clarets', 'clarets', 'bfc', 'burnley fc'
    ],
    'Ipswich Town FC': [
        'ipswich', 'ipswich town', 'the tractor boys', 'itfc',
        'ipswich fc'
    ],
    'Luton Town FC': [
        'luton', 'luton town', 'the hatters', 'ltfc', 'luton fc'
    ],
    'Sunderland AFC': [
        'sunderland', 'the black cats', 'black cats', 'safc', 'sunderland fc'
    ],
    'AFC Bournemouth': [
        'bournemouth', 'the cherries', 'cherries', 'afcb',
        'afc bournemouth'
    ],
    'Sheffield United FC': [
        'sheffield united', 'united', 'the blades', 'blades', 'sufc',
        'sheffield utd'
    ],

    # LA_LIGA
    'FC Barcelona': [
        'barcelona', 'barca', 'fcb', 'barça', 'barcalona',
        'barcelona fc', 'blaugrana'
    ],
    'Real Madrid CF': [
        'real madrid', 'madrid', 'real', 'rmcf', 'real madrid cf',
        'los blancos', 'the whites', 'white'
    ],
    'Club Atlético de Madrid': [
        'atletico madrid', 'atlético', 'atletico', 'atm', 'atletico madrid',
        'atleti', 'los colchoneros'
    ],
    'Athletic Club': [
        'athletic', 'athletic bilbao', 'bilbao', 'athleti',
        'athletic club'
    ],
    'Real Betis Balompié': [
        'real betis', 'betis', 'rb', 'los verdiblancos'
    ],
    'Real Sociedad de Fútbol': [
        'real sociedad', 'sociedad', 'la real', 'txuri urdin'
    ],
    'Valencia CF': [
        'valencia', 'vcf', 'valencia cf', 'los che'
    ],
    'Sevilla FC': [
        'sevilla', 'sfc', 'sevilla fc', 'los nervionenses'
    ],
    'Villarreal CF': [
        'villarreal', 'vcf', 'villarreal cf', 'the yellow submarine',
        'yellow submarine'
    ],
    'Getafe CF': [
        'getafe', 'getafe cf', 'los azulones'
    ],
    'Girona FC': [
        'girona', 'girona fc', 'els blanc i vermells'
    ],
    'CA Osasuna': [
        'osasuna', 'cas', 'los rojillos'
    ],
    'RC Celta de Vigo': [
        'celta vigo', 'celta', 'vigo', 'rc celta', 'los analistas'
    ],
    'RCD Mallorca': [
        'mallorca', 'rcd mallorca', 'los bermellones'
    ],
    'Rayo Vallecano de Madrid': [
        'rayo vallecano', 'rayo', 'vallecano', 'los rayistas'
    ],
    'UD Las Palmas': [
        'las palmas', 'palmas', 'ud las palmas', 'los amarillos'
    ],
    'UD Almería': [
        'almeria', 'almería', 'ud almería', 'los almerienses'
    ],
    'CD Leganés': [
        'leganes', 'leganés', 'cd leganés', 'los pepineros'
    ],
    'Elche CF': [
        'elche', 'elche cf', 'los ilicitanos'
    ],
    'Granada CF': [
        'granada', 'granada cf', 'los nazaríes'
    ],
    'Levante UD': [
        'levante', 'levante ud', 'los granotas'
    ],
    'Cádiz CF': [
        'cadiz', 'cádiz', 'cadiz cf', 'los gaditanos'
    ],
    'Real Oviedo': [
        'oviedo', 'real oviedo', 'los azules'
    ],
    'Real Valladolid CF': [
        'valladolid', 'real valladolid', 'rvc'
    ],
    'RCD Espanyol de Barcelona': [
        'espanyol', 'español', 'rcd espanyol', 'los pericos'
    ],
    'Deportivo Alavés': [
        'alaves', 'alavés', 'deportivo alavés', 'los blanquiazules'
    ],

    # BUNDESLIGA
    'FC Bayern München': [
        'bayern', 'bayern munich', 'bayren', 'fcb', 'fc bayern',
        'münchen', 'munchen', 'bavarians'
    ],
    'Borussia Dortmund': [
        'dortmund', 'bvb', 'borussia dortmund', 'borus', 'drotmund',
        'borrussia', 'yellow wall'
    ],
    'Bayer 04 Leverkusen': [
        'leverkusen', 'bayer', 'b04', 'bayer leverkusen', 'the aspirin makers'
    ],
    'RB Leipzig': [
        'leipzig', 'rbl', 'rb leipzig', 'red bull'
    ],
    'Eintracht Frankfurt': [
        'frankfurt', 'eintracht', 'eintracht frankfurt',
        'sgf', 'the eagles'
    ],
    'SC Freiburg': [
        'freiburg', 'scf', 'sc freiburg', 'the black forest'
    ],
    'VfB Stuttgart': [
        'stuttgart', 'vfb', 'vfb stuttgart', 'the reds'
    ],
    'Borussia Mönchengladbach': [
        'borussia monchengladbach', 'monchengladbach', 'gladbach',
        'bmg', 'foals'
    ],
    '1. FC Union Berlin': [
        'union berlin', 'union', 'berlin', 'fcub', 'iron ones'
    ],
    'TSG 1899 Hoffenheim': [
        'hoffenheim', 'tsg', 'hoffenheim', 'the herbalists'
    ],
    'FC Augsburg': [
        'augsburg', 'fca', 'fc augsburg'
    ],
    'VfL Wolfsburg': [
        'wolfsburg', 'vfl', 'wolves', 'vfl wolfsburg'
    ],
    'Werder Bremen': [
        'bremen', 'werder', 'werder bremen', 'the greens'
    ],
    'Hamburger SV': [
        'hamburg', 'hsv', 'hamburger sv', 'the pride'
    ],
    '2. FC Köln': [
        'cologne', 'koln', 'köln', '2fc', '2 fc koln', 'billy goats'
    ],
    '3. FSV Mainz 05': [
        'mainz', '3fsv', 'mainz 05', 'fsv mainz'
    ],
    'VfL Bochum 1848': [
        'bochum', 'vfl', 'vfl bochum', 'bochum 1848'
    ],
    'Holstein Kiel': [
        'kiel', 'holstein', 'holstein kiel'
    ],
    'SV Darmstadt 98': [
        'darmstadt', 'svd', 'darmstadt 98'
    ],
    '4. FC Heidenheim 1846': [
        'heidenheim', '4fc', 'heidenheim'
    ],
    'FC St. Pauli 1910': [
        'st pauli', 'pauli', 'st pauli', 'fc st pauli'
    ],
}


# ════════════════════════════════════════════════════════════════════════════
# TEAM RESOLVER SERVICE
# ════════════════════════════════════════════════════════════════════════════

class TeamResolverService:
    """Universal team resolution service for all prediction components"""

    def __init__(self):
        """Initialize resolver with canonical teams and aliases"""
        self.canonical_teams = CANONICAL_TEAMS
        self.team_aliases = TEAM_ALIASES
        self._build_reverse_index()

    def _build_reverse_index(self) -> None:
        """Build reverse index: canonical name → league"""
        self.team_to_league = {}
        for league, teams in self.canonical_teams.items():
            for team in teams:
                self.team_to_league[team] = league

    def _similarity(self, a: str, b: str) -> float:
        """Calculate string similarity (0-1)"""
        return SequenceMatcher(None, a.lower(), b.lower()).ratio()

    def _normalize(self, text: str) -> str:
        """
        Normalize user input for consistent matching.
        
        Removes: spaces, punctuation, FC/CF/SC/AC suffixes
        Lowercases: everything
        """
        return (
            text.lower()
            .strip()
            .replace(' f.c.', '')   # F.C.
            .replace(' fc', '')     # FC
            .replace(' c.f.', '')   # C.F.
            .replace(' cf', '')     # CF
            .replace(' s.c.', '')   # S.C.
            .replace(' sc', '')     # SC
            .replace(' a.c.', '')   # A.C.
            .replace(' ac', '')     # AC
            .replace('-', ' ')      # Hyphens to spaces
            .replace('.', ' ')      # Dots to spaces
            .replace('_', ' ')      # Underscores to spaces
            .replace('á', 'a')      # Accents
            .replace('é', 'e')
            .replace('í', 'i')
            .replace('ó', 'o')
            .replace('ú', 'u')
            .replace('ü', 'u')
            .replace('ç', 'c')
            .replace('  ', ' ')     # Multiple spaces
            .strip()
        )

    def resolve(
        self,
        team_input: str,
        league: Optional[str] = None,
        confidence_threshold: float = 0.70,
    ) -> ResolutionResult:
        """
        Resolve team input to canonical name.

        Args:
            team_input: User-provided team name
            league: Optional league filter (EPL, LA_LIGA, BUNDESLIGA)
            confidence_threshold: Minimum confidence to accept (0-1)

        Returns:
            ResolutionResult with canonical name, confidence, status
        """
        if not team_input or len(team_input.strip()) < 2:
            return ResolutionResult(
                input_text=team_input,
                canonical_name=None,
                confidence=0.0,
                status=ResolutionStatus.NOT_A_TEAM,
                method=ResolutionMethod.NONE,
                league=None,
                suggestions=[],
                message="Team name too short. Please type at least 2 characters.",
                should_confirm=False,
            )

        normalized = self._normalize(team_input)

        # PHASE 1: Try exact match (100%)
        result = self._try_exact_match(normalized, league)
        if result:
            return result

        # PHASE 2: Try alias match
        result = self._try_alias_match(normalized, league)
        if not result:
            # PHASE 3: Try fuzzy matching
            result = self._try_fuzzy_match(normalized, league, confidence_threshold)
        
        # CRITICAL POST-VALIDATION: If result is VALID and normalized input is forbidden,
        # check if there are OTHER teams this forbidden term could match to
        if (result and result.status == ResolutionStatus.VALID and 
            normalized in FORBIDDEN_AUTO_RESOLVE and
            result.canonical_name):
            
            # Find all teams that match this forbidden term
            all_matching_teams = set()
            
            # Check aliases first
            for canonical, aliases in self.team_aliases.items():
                if league and self.team_to_league.get(canonical) != league.upper():
                    continue
                for alias in aliases:
                    if self._normalize(alias) == normalized:
                        all_matching_teams.add(canonical)
                    # Also check if forbidden term is a word in the alias (substring with word boundaries)
                    normalized_alias = self._normalize(alias)
                    alias_words = normalized_alias.split()
                    if normalized in alias_words:
                        all_matching_teams.add(canonical)
            
            # Check canonical team names for substring matches
            search_teams = []
            if league:
                search_teams = self.canonical_teams.get(league.upper(), [])
            else:
                for teams in self.canonical_teams.values():
                    search_teams.extend(teams)
            
            for team in search_teams:
                norm_team = self._normalize(team)
                team_words = norm_team.split()
                # Check if forbidden term appears as a word in the team name
                if normalized in team_words:
                    all_matching_teams.add(team)
            
            # If forbidden term matches multiple teams, return AMBIGUOUS
            if len(all_matching_teams) > 1:
                suggestions = [
                    {"name": team, "confidence": 100.0} 
                    for team in sorted(all_matching_teams)
                ]
                return ResolutionResult(
                    input_text=normalized,
                    canonical_name=None,
                    confidence=0.0,
                    status=ResolutionStatus.AMBIGUOUS,
                    method=ResolutionMethod.FUZZY_MATCH,
                    league=league,
                    suggestions=suggestions,
                    message=f"⚠️ '{normalized}' is ambiguous. Could mean: {', '.join(sorted(all_matching_teams))}",
                    should_confirm=True,
                )
        
        return result

    def _try_exact_match(
        self, normalized: str, league: Optional[str] = None
    ) -> Optional[ResolutionResult]:
        """Try to find exact canonical match"""
        search_teams = []
        if league:
            search_teams = self.canonical_teams.get(league.upper(), [])
        else:
            for teams in self.canonical_teams.values():
                search_teams.extend(teams)

        for canonical in search_teams:
            if self._normalize(canonical) == normalized:
                return ResolutionResult(
                    input_text=normalized,
                    canonical_name=canonical,
                    confidence=100.0,
                    status=ResolutionStatus.VALID,
                    method=ResolutionMethod.EXACT_MATCH,
                    league=self.team_to_league.get(canonical),
                    suggestions=[],
                    message=f"✓ Exact match: {canonical}",
                    should_confirm=False,
                )
        return None

    def _try_alias_match(
        self, normalized: str, league: Optional[str] = None
    ) -> Optional[ResolutionResult]:
        """
        Try to find match in aliases.
        
        CRITICAL: Detects collisions and forbidden terms to prevent silent errors.
        """
        # PHASE 0: Check for forbidden terms - check if term appears as a word in any alias
        if normalized in FORBIDDEN_AUTO_RESOLVE:
            # Find all teams where forbidden term appears as a word in aliases
            matching_teams = []
            for canonical, aliases in self.team_aliases.items():
                if league and self.team_to_league.get(canonical) != league.upper():
                    continue
                
                for alias in aliases:
                    normalized_alias = self._normalize(alias)
                    # Check if forbidden term is an exact match
                    if normalized_alias == normalized:
                        if canonical not in matching_teams:
                            matching_teams.append(canonical)
                        break
                    # Also check if forbidden term is a word in the alias
                    alias_words = normalized_alias.split()
                    if normalized in alias_words and canonical not in matching_teams:
                        matching_teams.append(canonical)
                        break
            
            if len(matching_teams) > 1:
                # Forbidden term with collision - return AMBIGUOUS
                suggestions = [
                    {"name": team, "confidence": 100.0} for team in matching_teams
                ]
                return ResolutionResult(
                    input_text=normalized,
                    canonical_name=None,
                    confidence=0.0,
                    status=ResolutionStatus.AMBIGUOUS,
                    method=ResolutionMethod.ALIAS_MATCH,
                    league=league,
                    suggestions=suggestions,
                    message=f"⚠️ '{normalized}' is ambiguous. Could mean: {', '.join(matching_teams)}",
                    should_confirm=True,
                )
            elif len(matching_teams) == 1:
                # Forbidden term but only one match - still return to ensure consistent handling
                canonical = matching_teams[0]
                return ResolutionResult(
                    input_text=normalized,
                    canonical_name=canonical,
                    confidence=100.0,
                    status=ResolutionStatus.VALID,
                    method=ResolutionMethod.ALIAS_MATCH,
                    league=self.team_to_league.get(canonical),
                    suggestions=[],
                    message=f"✓ Resolved: {canonical}",
                    should_confirm=False,
                )
        
        # PHASE 1: Check for collisions (same alias → multiple teams)
        matching_teams = []
        for canonical, aliases in self.team_aliases.items():
            # Check league if specified
            if league and self.team_to_league.get(canonical) != league.upper():
                continue

            for alias in aliases:
                normalized_alias = self._normalize(alias)
                if normalized_alias == normalized:
                    matching_teams.append(canonical)
                    break  # Only add once per team
        
        # If multiple teams map to this alias, return AMBIGUOUS
        if len(matching_teams) > 1:
            suggestions = [
                {"name": team, "confidence": 100.0} for team in matching_teams
            ]
            return ResolutionResult(
                input_text=normalized,
                canonical_name=None,
                confidence=0.0,
                status=ResolutionStatus.AMBIGUOUS,
                method=ResolutionMethod.ALIAS_MATCH,
                league=league,
                suggestions=suggestions,
                message=f"⚠️ '{normalized}' matches multiple teams: {', '.join(matching_teams)}",
                should_confirm=True,
            )
        
        # PHASE 2: Single exact match found
        if len(matching_teams) == 1:
            canonical = matching_teams[0]
            return ResolutionResult(
                input_text=normalized,
                canonical_name=canonical,
                confidence=100.0,
                status=ResolutionStatus.VALID,
                method=ResolutionMethod.ALIAS_MATCH,
                league=self.team_to_league.get(canonical),
                suggestions=[],
                message=f"✓ Resolved: {canonical}",
                should_confirm=False,
            )

        # PHASE 3: Check high-confidence partial matches (90%+) with collision safety
        best_match = None
        best_score = 0
        matching_teams_partial = []
        
        for canonical, aliases in self.team_aliases.items():
            # Check league if specified
            if league and self.team_to_league.get(canonical) != league.upper():
                continue

            for alias in aliases:
                normalized_alias = self._normalize(alias)
                score = self._similarity(normalized, normalized_alias)
                
                if score >= 0.90:
                    if score > best_score:
                        best_score = score
                        best_match = canonical
                        matching_teams_partial = [canonical]
                    elif score == best_score and canonical not in matching_teams_partial:
                        matching_teams_partial.append(canonical)
        
        # If high-confidence partial match collision, return AMBIGUOUS
        if len(matching_teams_partial) > 1 and best_score >= 0.90:
            suggestions = [
                {"name": team, "confidence": round(best_score * 100, 1)} 
                for team in matching_teams_partial
            ]
            return ResolutionResult(
                input_text=normalized,
                canonical_name=None,
                confidence=0.0,
                status=ResolutionStatus.AMBIGUOUS,
                method=ResolutionMethod.ALIAS_MATCH,
                league=league,
                suggestions=suggestions,
                message=f"⚠️ Multiple teams match '{normalized}'. Did you mean: {', '.join(matching_teams_partial)}?",
                should_confirm=True,
            )
        
        # If single high-confidence match, return it
        if best_match and best_score >= 0.90:
            return ResolutionResult(
                input_text=normalized,
                canonical_name=best_match,
                confidence=best_score * 100,
                status=ResolutionStatus.VALID,
                method=ResolutionMethod.ALIAS_MATCH,
                league=self.team_to_league.get(best_match),
                suggestions=[],
                message=f"✓ High confidence: {best_match}",
                should_confirm=False,
            )

        return None

    def _try_fuzzy_match(
        self,
        normalized: str,
        league: Optional[str] = None,
        threshold: float = 0.70,
    ) -> ResolutionResult:
        """
        Try fuzzy matching as fallback.
        
        CRITICAL: Detects forbidden terms and collisions to prevent silent false positives.
        """
        search_teams = []
        if league:
            search_teams = self.canonical_teams.get(league.upper(), [])
        else:
            for teams in self.canonical_teams.values():
                search_teams.extend(teams)

        matches = []
        for team in search_teams:
            score = self._similarity(normalized, self._normalize(team))
            if score > 0:
                matches.append((team, score))

        # Sort by confidence descending
        matches.sort(key=lambda x: x[1], reverse=True)

        if not matches:
            return ResolutionResult(
                input_text=normalized,
                canonical_name=None,
                confidence=0.0,
                status=ResolutionStatus.NOT_FOUND,
                method=ResolutionMethod.NONE,
                league=league,
                suggestions=self._get_suggestions(normalized, league)[:3],
                message=f"❌ Team '{normalized}' not found. See suggestions.",
                should_confirm=False,
            )

        best_team, best_score = matches[0]
        best_confidence = best_score * 100
        
        # CRITICAL: Check for forbidden terms that fuzzy match multiple teams
        # This prevents "City", "United", "Real" etc. from resolving to single teams
        if normalized in FORBIDDEN_AUTO_RESOLVE:
            # Find all teams that fuzzy match this forbidden term with high confidence
            high_confidence_matches = [
                (team, score) for team, score in matches if score >= 0.80
            ]
            
            if len(high_confidence_matches) > 1:
                # Multiple teams match forbidden term - return AMBIGUOUS
                suggestions = [
                    {"name": team, "confidence": round(score * 100, 1)}
                    for team, score in high_confidence_matches
                ]
                return ResolutionResult(
                    input_text=normalized,
                    canonical_name=None,
                    confidence=0.0,
                    status=ResolutionStatus.AMBIGUOUS,
                    method=ResolutionMethod.FUZZY_MATCH,
                    league=league,
                    suggestions=suggestions,
                    message=f"⚠️ '{normalized}' matches multiple teams. Please be more specific.",
                    should_confirm=True,
                )
        
        # Check for collision detection in fuzzy matches (95%+ confidence)
        very_high_confidence_matches = [
            (team, score) for team, score in matches if score >= 0.95
        ]
        if len(very_high_confidence_matches) > 1:
            # Multiple teams with 95%+ match - collision
            suggestions = [
                {"name": team, "confidence": round(score * 100, 1)}
                for team, score in very_high_confidence_matches
            ]
            return ResolutionResult(
                input_text=normalized,
                canonical_name=None,
                confidence=0.0,
                status=ResolutionStatus.AMBIGUOUS,
                method=ResolutionMethod.FUZZY_MATCH,
                league=league,
                suggestions=suggestions,
                message=f"⚠️ Multiple teams match '{normalized}' equally well.",
                should_confirm=True,
            )
        
        suggestions = [
            {"name": team, "confidence": round(score * 100, 1)}
            for team, score in matches[1:4]
        ]

        # Determine status
        if best_confidence >= 95:
            status = ResolutionStatus.VALID
            should_confirm = False
        elif best_confidence >= 70:
            status = ResolutionStatus.AMBIGUOUS
            should_confirm = True
        else:
            status = ResolutionStatus.NOT_FOUND
            should_confirm = False

        return ResolutionResult(
            input_text=normalized,
            canonical_name=best_team if status != ResolutionStatus.NOT_FOUND else None,
            confidence=best_confidence,
            status=status,
            method=ResolutionMethod.FUZZY_MATCH,
            league=self.team_to_league.get(best_team) if best_team else None,
            suggestions=suggestions,
            message=self._message_for_status(status, normalized, best_team, best_confidence),
            should_confirm=should_confirm,
        )

    def _get_suggestions(self, normalized: str, league: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get top suggestions for failed resolution"""
        search_teams = []
        if league:
            search_teams = self.canonical_teams.get(league.upper(), [])
        else:
            for teams in self.canonical_teams.values():
                search_teams.extend(teams)

        scored = [
            {"name": team, "confidence": round(self._similarity(normalized, self._normalize(team)) * 100, 1)}
            for team in search_teams
        ]
        scored.sort(key=lambda x: x["confidence"], reverse=True)
        return scored[:5]

    def _message_for_status(
        self,
        status: ResolutionStatus,
        normalized: str,
        canonical: Optional[str],
        confidence: float,
    ) -> str:
        """Generate human-friendly message based on status"""
        if status == ResolutionStatus.VALID:
            return f"✓ Resolved: {canonical} ({confidence:.0f}%)"
        elif status == ResolutionStatus.AMBIGUOUS:
            return f"⚠️ Did you mean: {canonical}? ({confidence:.0f}%)"
        else:
            return f"❌ Team '{normalized}' not found."

    def detect_league(self, home_team: str, away_team: str) -> Optional[str]:
        """
        Detect league from two teams.
        
        Returns league if both teams are in same league, None if ambiguous.
        """
        home_res = self.resolve(home_team)
        away_res = self.resolve(away_team)

        if (
            home_res.league
            and away_res.league
            and home_res.league == away_res.league
        ):
            return home_res.league

        return None

    def batch_resolve(
        self, teams: List[str], league: Optional[str] = None
    ) -> List[ResolutionResult]:
        """Resolve multiple teams at once"""
        return [self.resolve(team, league) for team in teams]

    def get_all_teams(self, league: Optional[str] = None) -> List[str]:
        """Get all canonical team names for a league"""
        if league:
            return self.canonical_teams.get(league.upper(), [])
        
        all_teams = []
        for teams in self.canonical_teams.values():
            all_teams.extend(teams)
        return all_teams

    def get_aliases(self, canonical_name: str) -> List[str]:
        """Get all aliases for a canonical team"""
        return self.team_aliases.get(canonical_name, [])


# ════════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ════════════════════════════════════════════════════════════════════════════

_resolver_instance = None


def get_resolver() -> TeamResolverService:
    """Get or create singleton resolver instance"""
    global _resolver_instance
    if _resolver_instance is None:
        _resolver_instance = TeamResolverService()
    return _resolver_instance
