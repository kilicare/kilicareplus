from django.urls import path
from . import views

urlpatterns = [
    path('demand-forecast/',  views.demand_forecast_view),
    path('tourist-origins/',  views.tourist_origins_view),
    path('peak-periods/',     views.peak_periods_view),
    path('reports/download/', views.reports_download_view),
]