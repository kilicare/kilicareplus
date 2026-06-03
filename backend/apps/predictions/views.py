from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
import requests
from django.conf import settings
from django.db.models import Q, Count

from .models import Match, UserPrediction, PredictionView
from apps.ai_chat.services import chat_with_groq, build_messages

PREDICTOR_URL = getattr(settings, 'PREDICTOR_URL', 'http://localhost:8001')


def _is_premium(user):
    try:
        today = timezone.now().date()
        return user.subscriptions.filter(
            status__in=('ACTIVE','TRIAL'),
            end_date__gte=today,
            plan__has_predictions_all=True,
        ).exists()
    except: return False


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predictions_today_view(request):
    league = request.query_params.get('league', 'EPL')
    today  = timezone.now().date()

    qs = Match.objects.filter(
        scheduled_at__date=today,
        home_win_prob__isnull=False,
        league=league,
    ).order_by('scheduled_at')

    is_premium = _is_premium(request.user)
    tracker, _ = PredictionView.objects.get_or_create(user=request.user, date=today)

    data, free_count = [], 0
    for m in qs:
        locked = not is_premium and free_count >= 2
        if not locked and not is_premium:
            free_count += 1
        data.append({
            'id':            m.id,
            'league':        m.league,
            'home_team':     m.home_team,
            'away_team':     m.away_team,
            'home_team_logo': m.home_team_logo,
            'away_team_logo': m.away_team_logo,
            'scheduled_at':  m.scheduled_at.isoformat(),
            'home_win_prob': m.home_win_prob if not locked else None,
            'draw_prob':     m.draw_prob     if not locked else None,
            'away_win_prob': m.away_win_prob if not locked else None,
            'over_25_prob':  m.over_25_prob  if not locked else None,
            'btts_prob':     m.btts_prob     if not locked else None,
            'value_bet':     m.value_bet     if not locked else None,
            'confidence':    m.confidence    if not locked else None,
            'is_locked':     locked,
        })

    if not is_premium:
        tracker.count = min(free_count, tracker.count + free_count)
        tracker.save(update_fields=['count'])

    return Response({
        'matches': data, 'is_premium': is_premium,
        'free_views_used': tracker.count if not is_premium else None,
        'free_views_limit': 2, 'league': league,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predictions_upcoming_view(request):
    league = request.query_params.get('league', 'EPL')
    today  = timezone.now().date()
    is_premium = _is_premium(request.user)

    qs = Match.objects.filter(
        scheduled_at__date__gt=today,
        home_win_prob__isnull=False,
        league=league,
    ).order_by('scheduled_at')[:20]

    data = [{
        'id':            m.id,
        'league':        m.league,
        'home_team':     m.home_team,
        'away_team':     m.away_team,
        'scheduled_at':  m.scheduled_at.isoformat(),
        'home_win_prob': m.home_win_prob if is_premium else None,
        'draw_prob':     m.draw_prob     if is_premium else None,
        'away_win_prob': m.away_win_prob if is_premium else None,
        'value_bet':     m.value_bet     if is_premium else None,
        'confidence':    m.confidence    if is_premium else None,
        'is_locked':     not is_premium,
    } for m in qs]

    return Response({'matches': data, 'is_premium': is_premium})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def accuracy_stats_view(request):
    """Fetch from predictor and add DB stats"""
    try:
        r = requests.get(f"{PREDICTOR_URL}/predictions/accuracy", timeout=5)
        if r.status_code == 200:
            return Response(r.json())
    except: pass

    total   = Match.objects.filter(prediction_correct__isnull=False).count()
    correct = Match.objects.filter(prediction_correct=True).count()
    return Response({
        'total_predictions': total,
        'correct': correct,
        'accuracy_percent': round(correct/total*100, 1) if total else 0,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leagues_view(request):
    return Response([
        {'key':'EPL',       'label':'Premier League','flag':'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
        {'key':'LA_LIGA',   'label':'La Liga',        'flag':'🇪🇸'},
        {'key':'BUNDESLIGA','label':'Bundesliga',     'flag':'🇩🇪'},
    ])


# ============================================================================
# NEW ENDPOINTS - CUSTOM PREDICTIONS
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_prediction_view(request):
    """
    POST /api/predictions/generate/
    
    Generate custom prediction for any teams
    
    Body:
    {
        "home_team": "Chelsea",
        "away_team": "Manchester City",
        "league": "EPL"
    }
    """
    home_team = request.data.get('home_team', '').strip()
    away_team = request.data.get('away_team', '').strip()
    league = request.data.get('league', 'EPL').strip()
    
    if not home_team or not away_team or not league:
        return Response({
            'error': 'home_team, away_team, and league are required'
        }, status=400)
    
    try:
        # Call predictor engine
        resp = requests.get(
            f'{PREDICTOR_URL}/predictions/predict',
            params={
                'home_team': home_team,
                'away_team': away_team,
                'league': league,
                'matchday': 20,  # Default
            },
            timeout=15
        )
        
        if resp.status_code != 200:
            return Response({
                'error': f'Predictor error: {resp.status_code}'
            }, status=400)
        
        pred_data = resp.json()
        
        # Save to UserPrediction for history
        user_pred = UserPrediction.objects.create(
            user=request.user,
            home_team=home_team,
            away_team=away_team,
            league=league,
            prediction_data=pred_data,
        )
        
        return Response({
            'id': user_pred.id,
            'home_team': home_team,
            'away_team': away_team,
            'league': league,
            'prediction': pred_data,  # ALL fields from predictor
            'created_at': user_pred.created_at.isoformat(),
        })
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def prediction_history_view(request):
    """
    GET /api/predictions/history/
    
    Get user's prediction history
    
    Query params:
    - league: filter by league
    - limit: default 50
    """
    league = request.query_params.get('league')
    limit = int(request.query_params.get('limit', 50))
    
    qs = UserPrediction.objects.filter(user=request.user)
    
    if league:
        qs = qs.filter(league=league)
    
    qs = qs.order_by('-created_at')[:limit]
    
    data = [{
        'id': p.id,
        'home_team': p.home_team,
        'away_team': p.away_team,
        'league': p.league,
        'prediction': p.prediction_data,
        'user_feedback': p.user_feedback,
        'created_at': p.created_at.isoformat(),
    } for p in qs]
    
    return Response({
        'count': len(data),
        'predictions': data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def prediction_feedback_view(request, prediction_id):
    """
    POST /api/predictions/{id}/feedback/
    
    Record actual match result
    
    Body:
    {
        "result": "1"  # "1" = home win, "X" = draw, "2" = away win
    }
    """
    result = request.data.get('result', '').strip()
    
    if result not in ('1', 'X', '2'):
        return Response({
            'error': 'result must be "1", "X", or "2"'
        }, status=400)
    
    try:
        pred = UserPrediction.objects.get(id=prediction_id, user=request.user)
        pred.user_feedback = result
        pred.user_feedback_date = timezone.now()
        pred.save()
        
        return Response({
            'success': True,
            'message': 'Feedback recorded',
            'prediction_id': prediction_id,
        })
    except UserPrediction.DoesNotExist:
        return Response({
            'error': 'Prediction not found'
        }, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def prediction_analytics_view(request):
    """
    GET /api/predictions/analytics/
    
    Get user's prediction analytics
    """
    user = request.user
    
    # Total predictions
    total = UserPrediction.objects.filter(user=user).count()
    
    # By league
    by_league = {}
    for league in ['EPL', 'LA_LIGA', 'BUNDESLIGA']:
        league_count = UserPrediction.objects.filter(user=user, league=league).count()
        by_league[league] = league_count
    
    # Feedback stats
    with_feedback = UserPrediction.objects.filter(user=user, user_feedback__isnull=False).count()
    without_feedback = total - with_feedback
    
    # Feedback breakdown
    feedback_1 = UserPrediction.objects.filter(user=user, user_feedback='1').count()
    feedback_x = UserPrediction.objects.filter(user=user, user_feedback='X').count()
    feedback_2 = UserPrediction.objects.filter(user=user, user_feedback='2').count()
    
    return Response({
        'total_predictions': total,
        'with_feedback': with_feedback,
        'without_feedback': without_feedback,
        'by_league': by_league,
        'feedback_breakdown': {
            'home_wins': feedback_1,
            'draws': feedback_x,
            'away_wins': feedback_2,
        },
    })


# ============================================================================
# AI PREDICTION ANALYSIS (PREMIUM ONLY)
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_predict_analyze_view(request):
    """
    POST /api/predictions/ai-analyze/
    
    Get AI analysis of a prediction
    
    Premium only!
    
    Body:
    {
        "home_team": "Chelsea",
        "away_team": "Manchester City",
        "league": "EPL",
        "question": "Who will win?"
    }
    """
    if not _is_premium(request.user):
        return Response({
            'error': 'Premium subscription required'
        }, status=403)
    
    home_team = request.data.get('home_team', '').strip()
    away_team = request.data.get('away_team', '').strip()
    league = request.data.get('league', 'EPL').strip()
    question = request.data.get('question', 'Who will win?').strip()
    
    if not home_team or not away_team:
        return Response({'error': 'home_team and away_team required'}, status=400)
    
    try:
        # Get prediction from predictor
        pred_resp = requests.get(
            f'{PREDICTOR_URL}/predictions/predict',
            params={
                'home_team': home_team,
                'away_team': away_team,
                'league': league,
                'matchday': 20,
            },
            timeout=15
        )
        
        if pred_resp.status_code != 200:
            return Response({'error': 'Prediction failed'}, status=400)
        
        pred_data = pred_resp.json()
        
        # Format data for AI
        pred_text = f"""
        Match: {home_team} vs {away_team} ({league})
        
        Prediction Data:
        {pred_data}
        
        User Question: {question}
        """
        
        # Call AI
        messages = build_messages(
            [{'role': 'user', 'content': pred_text}],
            lang='sw'
        )
        
        ai_response = chat_with_groq(messages)
        response_json = ai_response.json()
        ai_text = response_json['choices'][0]['message']['content']
        
        # Save to history
        user_pred = UserPrediction.objects.create(
            user=request.user,
            home_team=home_team,
            away_team=away_team,
            league=league,
            prediction_data=pred_data,
        )
        
        return Response({
            'prediction_id': user_pred.id,
            'home_team': home_team,
            'away_team': away_team,
            'league': league,
            'prediction_data': pred_data,
            'ai_analysis': ai_text,
            'created_at': user_pred.created_at.isoformat(),
        })
    
    except Exception as e:
        return Response({'error': str(e)}, status=500)