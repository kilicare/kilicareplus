import csv
from datetime import timedelta
from io import StringIO

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone

from core.permissions import IsB2BOrAdmin
from .services import B2BAnalyticsService


@api_view(['GET'])
@permission_classes([IsB2BOrAdmin])
def demand_forecast_view(request):
    location = request.query_params.get('location', 'Tanzania')
    days     = int(request.query_params.get('days', 30))
    
    # Pagination validation
    MAX_DAYS = 365
    MIN_DAYS = 1
    days = min(max(days, MIN_DAYS), MAX_DAYS)  # Clamp between 1 and 365
    
    # Use real analytics service instead of fake random data
    analytics = B2BAnalyticsService()
    forecast_data = analytics.get_demand_forecast(location, days)
    
    return Response(forecast_data)


@api_view(['GET'])
@permission_classes([IsB2BOrAdmin])
def tourist_origins_view(request):
    # Use real analytics service instead of hardcoded data
    analytics = B2BAnalyticsService()
    origins_data = analytics.get_tourist_origins()
    return Response(origins_data)


@api_view(['GET'])
@permission_classes([IsB2BOrAdmin])
def peak_periods_view(request):
    # Use real analytics service instead of hardcoded data
    analytics = B2BAnalyticsService()
    peak_data = analytics.get_peak_periods()
    return Response(peak_data)


@api_view(['GET'])
@permission_classes([IsB2BOrAdmin])
def reports_download_view(request):
    """Download forecast as CSV using real analytics data"""
    location = request.query_params.get('location', 'Tanzania')
    days     = int(request.query_params.get('days', 30))
    today    = timezone.now().date()

    # Pagination validation
    MAX_DAYS = 365
    MIN_DAYS = 1
    days = min(max(days, MIN_DAYS), MAX_DAYS)  # Clamp between 1 and 365

    # Get real forecast data
    analytics = B2BAnalyticsService()
    forecast_data = analytics.get_demand_forecast(location, days)

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Date', 'Day', 'Expected Tourists',
        'Confidence', 'Is Peak', 'Location', 'Historical Reference',
    ])

    for day_data in forecast_data['forecast']:
        writer.writerow([
            day_data['date'],
            day_data['day_name'],
            day_data['expected_tourists'],
            day_data['confidence'],
            day_data['is_peak'],
            location,
            day_data.get('historical_reference', 0),
        ])

    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='text/csv',
    )
    response['Content-Disposition'] = (
        f'attachment; filename="kilicarego_forecast_{today}.csv"'
    )
    return response