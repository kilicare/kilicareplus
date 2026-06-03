

# ============================================================================
# UNIVERSAL TEAM RESOLVER ENDPOINTS (V2)
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_team_view(request):
    """
    POST /api/predictions/resolve-team/
    
    Resolve a single team name to canonical form.
    
    Body:
    {
        "team": "Man City",
        "league": "EPL" (optional)
    }
    
    Response:
    {
        "canonical_name": "Manchester City FC",
        "confidence": 100.0,
        "status": "VALID",
        "method": "alias_match",
        "league": "EPL",
        "suggestions": [],
        "message": "✓ Resolved: Manchester City FC (100%)",
        "should_confirm": false
    }
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
    
    Resolve both teams for a match (includes league detection).
    
    Body:
    {
        "home_team": "Man City",
        "away_team": "Arsenal",
        "league": "EPL" (optional - auto-detected if omitted)
    }
    
    Response:
    {
        "home_team": { ...resolution... },
        "away_team": { ...resolution... },
        "detected_league": "EPL",
        "all_valid": true,
        "explanation_panel": {
            "you_entered": "Man City vs Arsenal",
            "resolved_to": "Manchester City FC vs Arsenal FC",
            "league": "EPL",
            "confidence_average": 100.0,
            "method": "Both teams resolved via alias matching"
        }
    }
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
    
    Query params:
    - canonical_name: Full canonical name (e.g., "Manchester City FC")
    
    Response:
    {
        "canonical_name": "Manchester City FC",
        "aliases": [
            "Man City",
            "Manchester City",
            "City",
            "MCFC",
            "Man C",
            ...
        ],
        "league": "EPL"
    }
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
    
    Get statistics on team resolution for this user.
    (Requires tracking implementation in UserPrediction model)
    
    Response:
    {
        "total_resolutions": 42,
        "auto_resolved": 35,
        "user_confirmed": 5,
        "not_found": 2,
        "by_league": {...},
        "most_common_aliases": {...},
        "most_common_typos": {...}
    }
    """
    # This is a placeholder - requires UserPrediction model updates
    # to track resolution_method and user_input separately
    
    return Response({
        'message': 'Resolution analytics tracking not yet implemented',
        'suggestion': 'Update UserPrediction model to track resolution metadata',
        'total_predictions': UserPrediction.objects.filter(user=request.user).count(),
    })
