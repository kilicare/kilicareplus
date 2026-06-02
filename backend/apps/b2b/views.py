from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
import random


def _require_b2b(user):
    return user.role in ('B2B', 'ADMIN')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def demand_forecast_view(request):
    """Simulated demand forecast data"""
    location = request.query_params.get('location', 'Tanzania')
    days = int(request.query_params.get('days', 30))

    today = timezone.now().date()
    data = []
    base = random.randint(200, 400)

    for i in range(days):
        day = today + timedelta(days=i)
        # Simulate weekend peaks + random variation
        is_weekend = day.weekday() >= 5
        tourists = base + (
            random.randint(50, 150) if is_weekend
            else random.randint(-30, 80)
        )
        data.append({
            'date': day.isoformat(),
            'expected_tourists': max(0, tourists),
            'confidence': round(random.uniform(0.7, 0.95), 2),
            'is_peak': tourists > (base * 1.3),
        })

    return Response({
        'location': location,
        'forecast': data,
        'summary': {
            'avg_daily': round(
                sum(d['expected_tourists'] for d in data) / len(data)
            ),
            'peak_days': sum(1 for d in data if d['is_peak']),
            'trend': 'increasing',
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tourist_origins_view(request):
    return Response([
        {'country': 'United States', 'code': 'US', 'percent': 22},
        {'country': 'United Kingdom', 'code': 'GB', 'percent': 18},
        {'country': 'Germany',        'code': 'DE', 'percent': 12},
        {'country': 'France',         'code': 'FR', 'percent': 9},
        {'country': 'China',          'code': 'CN', 'percent': 8},
        {'country': 'Kenya',          'code': 'KE', 'percent': 7},
        {'country': 'South Africa',   'code': 'ZA', 'percent': 6},
        {'country': 'India',          'code': 'IN', 'percent': 5},
        {'country': 'Others',         'code': 'XX', 'percent': 13},
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def peak_periods_view(request):
    today = timezone.now().date()
    return Response([
        {
            'period': 'Julai – Agosti',
            'demand_increase': '45%',
            'reason': 'High season — Serengeti wildebeest migration',
            'recommendation': 'Panda bei kwa 30–40%',
        },
        {
            'period': 'Desemba – Januari',
            'demand_increase': '38%',
            'reason': 'Christmas & New Year — watalii kutoka Ulaya',
            'recommendation': 'Panda bei kwa 25–35%',
        },
        {
            'period': 'Januari – Februari',
            'demand_increase': '20%',
            'reason': 'Zanzibar beach season',
            'recommendation': 'Promote beach experiences',
        },
    ])