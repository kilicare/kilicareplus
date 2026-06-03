import json
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import (
    api_view, permission_classes, parser_classes,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AIThread, AIMessage, UserAIPreference
from .services import build_messages, chat_with_groq, transcribe_audio


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_stream_view(request):
    """Streaming AI response — real-time typewriter"""

    message = request.data.get('message', '').strip()
    thread_id = request.data.get('thread_id')
    lang = request.data.get('lang', 'sw')
    context = request.data.get('context', 'tourism')  # 'tourism' or 'betting'

    print("\n" + "=" * 60)
    print(f"CONTEXT: {context}")
    print(f"MESSAGE RAW: {repr(message)}")
    print("=" * 60 + "\n")

    if not message:
        return Response(
            {'message': 'Ujumbe haujaandikwa.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check daily limit
    pref, _ = UserAIPreference.objects.get_or_create(
        user=request.user
    )
    is_premium = False
    try:
        sub = request.user.subscriptions.filter(
            status__in=('ACTIVE', 'TRIAL'),
            plan__has_ai_unlimited=True,
        ).first()
        is_premium = sub is not None
    except Exception:
        pass

    if not pref.can_send_message(is_premium):
        return Response(
            {'message': 'Umefika kikomo cha ujumbe 20 kwa leo. '
                        'Jaribu tena kesho au jiunga Premium.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Get or create thread
    if thread_id:
        try:
            thread = AIThread.objects.get(
                id=thread_id, user=request.user
            )
        except AIThread.DoesNotExist:
            thread = AIThread.objects.create(user=request.user)
    else:
        thread = AIThread.objects.create(user=request.user)

    # Save user message
    AIMessage.objects.create(
        thread=thread, role='user', content=message
    )

    # Build history (last 10 messages)
    history = list(
        thread.messages.order_by('created_at')
        .values('role', 'content')
    )

    # Update thread title from first message
    if thread.messages.count() == 1:
        thread.title = message[:60]
        thread.save(update_fields=['title'])

    # Update count
    pref.daily_message_count += 1
    pref.save(update_fields=['daily_message_count'])

    def _parse_stream_event(line: str) -> tuple[str | None, str | None]:
        if not line:
            return None, None

        if line.strip() == 'data: [DONE]':
            return 'DONE', None

        if not line.startswith('data:'):
            return None, None

        payload = line[len('data:'):].strip()
        if not payload:
            return None, None

        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            return None, None

        error = event.get('error')
        if error:
            return 'ERROR', str(error)

        choice = event.get('choices', [{}])[0]
        delta = choice.get('delta', {}) or {}
        text = delta.get('content') or ''
        if text:
            return 'TEXT', text

        return None, None

    def generate():
        full_response = ''
        try:
            msgs = build_messages(history, lang=lang, context=context)
            stream = chat_with_groq(msgs, stream=True)
            stream.raise_for_status()
            for line in stream.iter_lines(decode_unicode=True):
                event_type, text = _parse_stream_event(line)
                if event_type == 'TEXT' and text:
                    full_response += text
                    yield f"data: {json.dumps({'text': text, 'thread_id': thread.id})}\n\n"
                elif event_type == 'DONE':
                    break
                elif event_type == 'ERROR':
                    yield f"data: {json.dumps({'error': text})}\n\n"
                    return

            AIMessage.objects.create(
                thread=thread,
                role='assistant',
                content=full_response,
            )
            yield f"data: {json.dumps({'done': True, 'thread_id': thread.id})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    response = StreamingHttpResponse(
        generate(), content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_regular_view(request):
    """Non-streaming for simple requests"""
    message = request.data.get('message', '').strip()
    thread_id = request.data.get('thread_id')
    lang = request.data.get('lang', 'sw')

    if not message:
        return Response(
            {'message': 'Ujumbe haujaandikwa.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    thread, _ = (
        AIThread.objects.get_or_create(id=thread_id, user=request.user)
        if thread_id
        else (AIThread.objects.create(user=request.user), True)
    )

    AIMessage.objects.create(thread=thread, role='user', content=message)
    history = list(
        thread.messages.order_by('created_at').values('role', 'content')
    )
    msgs = build_messages(history, lang=lang)

    try:
        response = chat_with_groq(msgs, stream=False)
        response.raise_for_status()
        data = response.json()
        reply = (
            data.get('choices', [])[0]
            .get('message', {})
            .get('content', '')
        )
    except Exception as e:
        return Response(
            {'message': f'AI error: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    AIMessage.objects.create(
        thread=thread, role='assistant', content=reply
    )
    return Response({
        'reply': reply,
        'thread_id': thread.id,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def voice_to_text_view(request):
    """Transcribe voice to text using Groq Whisper"""
    audio = request.FILES.get('audio')
    if not audio:
        return Response(
            {'message': 'Faili ya sauti inahitajika.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        text = transcribe_audio((audio.name, audio.read(), audio.content_type))
        return Response({'text': text})
    except Exception as e:
        return Response(
            {'message': f'Transcription imeshindwa: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def threads_view(request):
    threads = AIThread.objects.filter(
        user=request.user
    ).order_by('-updated_at')[:20]
    data = [
        {
            'id': t.id,
            'title': t.title,
            'created_at': t.created_at,
            'updated_at': t.updated_at,
            'message_count': t.messages.count(),
        }
        for t in threads
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def thread_messages_view(request, thread_id):
    try:
        thread = AIThread.objects.get(id=thread_id, user=request.user)
    except AIThread.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)
    messages = thread.messages.order_by('created_at')
    data = [
        {
            'id': m.id,
            'role': m.role,
            'content': m.content,
            'created_at': m.created_at,
        }
        for m in messages
    ]
    return Response(data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_thread_view(request, thread_id):
    try:
        thread = AIThread.objects.get(id=thread_id, user=request.user)
        thread.delete()
    except AIThread.DoesNotExist:
        pass
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def preferences_view(request):
    pref, _ = UserAIPreference.objects.get_or_create(user=request.user)
    if request.method == 'GET':
        return Response({
            'preferred_language': pref.preferred_language,
            'daily_message_count': pref.daily_message_count,
        })
    lang = request.data.get('preferred_language', pref.preferred_language)
    if lang in ('sw', 'en'):
        pref.preferred_language = lang
        pref.save(update_fields=['preferred_language'])
    return Response({'preferred_language': pref.preferred_language})


# ════════════════════════════════════════════════════════════════════════════
# BETTING AI ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def betting_predict_view(request):
    """
    Get prediction for a match with explanations.
    
    Body:
    {
        "query": "Chelsea vs Arsenal",  // or "Manchester City - Liverpool"
        "league": "EPL"  // optional
    }
    """
    from .betting_utils import (
        find_teams_in_query, call_predictor, 
        generate_explanation_block
    )
    
    query = request.data.get('query', '').strip()
    league = request.data.get('league', '').upper() or None
    
    if not query:
        return Response(
            {'error': 'Match query required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # Parse teams from query
    result = find_teams_in_query(query)
    if not result:
        return Response(
            {
                'error': 'Could not parse teams from query',
                'example': 'Try "Chelsea vs Arsenal" or "Man City - Liverpool"',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    home_team, away_team, detected_league = result
    final_league = league or detected_league or 'EPL'
    
    # Call predictor
    prediction = call_predictor(home_team, away_team, final_league)
    if not prediction:
        return Response(
            {'error': 'Predictor engine unavailable'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    
    # Map signal_category to signal for explanations
    if 'signal_category' in prediction and 'signal' not in prediction:
        # Extract signal type from category
        category = prediction['signal_category']
        if 'STRONG' in category:
            prediction['signal'] = 'STRONG'
        elif 'MEDIUM' in category:
            prediction['signal'] = 'MODERATE'
        elif 'WEAK' in category:
            prediction['signal'] = 'WEAK'
        else:
            prediction['signal'] = 'SKIP'
    
    # Generate explanations
    explanations = generate_explanation_block(prediction)
    
    return Response({
        'home_team': home_team,
        'away_team': away_team,
        'league': final_league,
        'prediction': prediction,
        'explanations': explanations,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def betting_accumulator_view(request):
    """
    Build accumulator suggestions from matches.
    
    Body:
    {
        "matches": [
            {"home_team": "Chelsea", "away_team": "Arsenal", ...prediction data...},
            ...
        ],
        "size": 3
    }
    """
    from .betting_utils import build_accumulator_suggestions
    
    matches = request.data.get('matches', [])
    size = request.data.get('size', 3)
    
    if not matches:
        return Response(
            {'error': 'Matches required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    accumulators = build_accumulator_suggestions(matches, size=size)
    
    return Response({
        'accumulators': accumulators,
        'count': len(accumulators),
    })