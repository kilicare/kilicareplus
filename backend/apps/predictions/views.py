from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
import requests
from django.conf import settings

from .models import Match
from .validators import get_all_teams
from .services.team_resolver import get_resolver, ResolutionStatus

PREDICTOR_URL = getattr(settings, 'PREDICTOR_URL', 'http://localhost:8001')


def _is_premium(user):
    """Check if user has premium subscription with predictions access"""
    try:
        today = timezone.now().date()
        return user.subscriptions.filter(
            status__in=('ACTIVE', 'TRIAL'),
            end_date__gte=today,
            plan__has_predictions_all=True,
        ).exists()
    except:
        return False


# ════════════════════════════════════════════════════════════════════════════
# SYSTEM PREDICTIONS - Available to all users
# ════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predictions_today_view(request):
    """
    GET /api/predictions/today/
    
    Get system-wide match predictions for today
    - Premium users: see all predictions
    - Free users: see 2 locked predictions per day
    """
    # SETTINGS GUARD: Check if Predictions is enabled for this user
    from apps.settings.guards import require_feature_enabled
    require_feature_enabled(request.user, 'predictions')
    
    league = request.query_params.get('league', 'EPL')
    today = timezone.now().date()

    qs = Match.objects.filter(
        scheduled_at__date=today,
        home_win_prob__isnull=False,
        league=league,
    ).order_by('scheduled_at')

    is_premium = _is_premium(request.user)
    data, free_count = [], 0

    for m in qs:
        locked = not is_premium and free_count >= 2
        if not locked and not is_premium:
            free_count += 1
        data.append({
            'id': m.id,
            'league': m.league,
            'home_team': m.home_team,
            'away_team': m.away_team,
            'home_team_logo': m.home_team_logo,
            'away_team_logo': m.away_team_logo,
            'scheduled_at': m.scheduled_at.isoformat(),
            'home_win_prob': m.home_win_prob if not locked else None,
            'draw_prob': m.draw_prob if not locked else None,
            'away_win_prob': m.away_win_prob if not locked else None,
            'over_25_prob': m.over_25_prob if not locked else None,
            'btts_prob': m.btts_prob if not locked else None,
            'value_bet': m.value_bet if not locked else None,
            'confidence': m.confidence if not locked else None,
            'is_locked': locked,
        })

    return Response({
        'matches': data,
        'is_premium': is_premium,
        'free_views_used': free_count if not is_premium else None,
        'free_views_limit': 2,
        'league': league,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predictions_upcoming_view(request):
    """
    GET /api/predictions/upcoming/
    
    Get system-wide upcoming match predictions (next 20 matches)
    """
    # SETTINGS GUARD: Check if Predictions is enabled for this user
    from apps.settings.guards import require_feature_enabled
    require_feature_enabled(request.user, 'predictions')
    
    league = request.query_params.get('league', 'EPL')
    today = timezone.now().date()
    is_premium = _is_premium(request.user)

    qs = Match.objects.filter(
        scheduled_at__date__gt=today,
        home_win_prob__isnull=False,
        league=league,
    ).order_by('scheduled_at')[:20]

    data = [{
        'id': m.id,
        'league': m.league,
        'home_team': m.home_team,
        'away_team': m.away_team,
        'scheduled_at': m.scheduled_at.isoformat(),
        'home_win_prob': m.home_win_prob if is_premium else None,
        'draw_prob': m.draw_prob if is_premium else None,
        'away_win_prob': m.away_win_prob if is_premium else None,
        'value_bet': m.value_bet if is_premium else None,
        'confidence': m.confidence if is_premium else None,
        'is_locked': not is_premium,
    } for m in qs]

    return Response({'matches': data, 'is_premium': is_premium})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def accuracy_stats_view(request):
    """
    GET /api/predictions/accuracy/
    
    Get system prediction accuracy statistics
    """
    try:
        r = requests.get(f"{PREDICTOR_URL}/predictions/accuracy", timeout=5)
        if r.status_code == 200:
            return Response(r.json())
    except:
        pass

    total = Match.objects.filter(prediction_correct__isnull=False).count()
    correct = Match.objects.filter(prediction_correct=True).count()
    return Response({
        'total_predictions': total,
        'correct': correct,
        'accuracy_percent': round(correct / total * 100, 1) if total else 0,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leagues_view(request):
    """
    GET /api/predictions/leagues/
    
    Get available prediction leagues
    """
    return Response([
        {'key': 'EPL', 'label': 'Premier League', 'flag': '🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
        {'key': 'LA_LIGA', 'label': 'La Liga', 'flag': '🇪🇸'},
        {'key': 'BUNDESLIGA', 'label': 'Bundesliga', 'flag': '🇩🇪'},
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_suggestions_view(request):
    """
    GET /api/predictions/teams/
    
    Get team suggestions for autocomplete (used by AI Chat)
    
    Query params:
    - query: Team name query string
    - league: League filter (EPL, LA_LIGA, BUNDESLIGA)
    """
    query = request.query_params.get('query', '').strip()
    league = request.query_params.get('league', 'EPL').strip().upper()

    if not query or len(query) < 2:
        return Response({'suggestions': []})

    try:
        teams = get_all_teams(league)
        if not teams:
            return Response({'suggestions': []})

        from difflib import SequenceMatcher
        suggestions = []

        for team in teams:
            ratio = SequenceMatcher(None, query.lower(), team.lower()).ratio()
            confidence = ratio * 100

            if confidence > 40:
                status = 'VALID' if confidence >= 85 else 'AMBIGUOUS'
                suggestions.append({
                    'name': team,
                    'confidence': round(confidence, 1),
                    'status': status,
                })

        suggestions.sort(key=lambda x: x['confidence'], reverse=True)
        return Response({'suggestions': suggestions[:5]})

    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ════════════════════════════════════════════════════════════════════════════
# NOTE: USER PREDICTION HISTORY AND ANALYTICS
# ════════════════════════════════════════════════════════════════════════════
#
# User predictions are now tracked via:
# - Backend: /api/ai-chat/betting/predict/ → BettingPredictionRecord
# - History: /api/ai-chat/betting/history/ → BettingPredictionRecord
# - Deletion: /api/ai-chat/betting/prediction/{id}/delete/ → soft delete
#
# The form-based prediction endpoints have been deprecated.
# All user predictions now go through AI Chat betting endpoints.

# ============================================================================
# UNIVERSAL TEAM RESOLVER ENDPOINTS (V2)
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_team_view(request):
    """
    POST /api/predictions/resolve-team/
    
    Resolve a single team name to canonical form.
    Uses universal TeamResolverService.
    """
    team_input = request.data.get('team', '').strip()
    league = request.data.get('league', None)
    
    if not team_input:
        return Response({'error': 'team parameter required'}, status=400)
    
    resolver = get_resolver()
    result = resolver.resolve(team_input, league)
    
    return Response({
        'canonical_name': result.canonical_name,
        'confidence': result.confidence,
        'status': result.status.value,
        'method': result.method.value,
        'league': result.league,
        'suggestions': result.suggestions,
        'message': result.message,
        'should_confirm': result.should_confirm,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_match_view(request):
    """
    POST /api/predictions/resolve-match/
    
    Resolve both teams for a match with league detection.
    Returns explanation panel for UI rendering.
    """
    home_team = request.data.get('home_team', '').strip()
    away_team = request.data.get('away_team', '').strip()
    league = request.data.get('league', None)
    
    if not home_team or not away_team:
        return Response({
            'error': 'home_team and away_team are required'
        }, status=400)
    
    resolver = get_resolver()
    
    # Resolve both teams
    home_result = resolver.resolve(home_team, league)
    away_result = resolver.resolve(away_team, league)
    
    # Detect league if not provided
    detected_league = league
    if not detected_league:
        detected_league = resolver.detect_league(home_team, away_team)
    
    # Both teams must be VALID for prediction
    all_valid = (
        home_result.status == ResolutionStatus.VALID
        and away_result.status == ResolutionStatus.VALID
    )
    
    # Calculate average confidence
    avg_confidence = (home_result.confidence + away_result.confidence) / 2
    
    # Build explanation panel
    explanation = {
        'you_entered': f"{home_team} vs {away_team}",
        'resolved_to': f"{home_result.canonical_name or '?'} vs {away_result.canonical_name or '?'}",
        'league': detected_league or 'Auto-detect',
        'confidence_average': round(avg_confidence, 1),
        'home_team_resolution': home_result.method.value,
        'away_team_resolution': away_result.method.value,
    }
    
    return Response({
        'home_team': {
            'input': home_result.input_text,
            'canonical': home_result.canonical_name,
            'confidence': home_result.confidence,
            'status': home_result.status.value,
            'method': home_result.method.value,
            'suggestions': home_result.suggestions,
        },
        'away_team': {
            'input': away_result.input_text,
            'canonical': away_result.canonical_name,
            'confidence': away_result.confidence,
            'status': away_result.status.value,
            'method': away_result.method.value,
            'suggestions': away_result.suggestions,
        },
        'detected_league': detected_league,
        'all_valid': all_valid,
        'explanation_panel': explanation,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_aliases_view(request):
    """
    GET /api/predictions/team-aliases/
    
    Get all aliases for a team.
    Query params: canonical_name
    """
    canonical_name = request.query_params.get('canonical_name', '').strip()
    
    if not canonical_name:
        return Response({'error': 'canonical_name parameter required'}, status=400)
    
    resolver = get_resolver()
    aliases = resolver.get_aliases(canonical_name)
    league = resolver.team_to_league.get(canonical_name)
    
    if not aliases:
        return Response({
            'error': f"Team '{canonical_name}' not found in registry"
        }, status=404)
    
    return Response({
        'canonical_name': canonical_name,
        'aliases': aliases,
        'league': league,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resolution_stats_view(request):
    """
    GET /api/predictions/resolution-stats/
    
    Get statistics on team resolution.
    (Placeholder - requires UserPrediction model updates)
    """
    return Response({
        'message': 'Resolution analytics tracking not yet implemented',
        'suggestion': 'Update UserPrediction model to track resolution metadata',
    })
