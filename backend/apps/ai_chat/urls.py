from django.urls import path
from . import views

urlpatterns = [
    path('chat/stream/', views.chat_stream_view),
    path('chat/', views.chat_regular_view),
    path('voice-to-text/', views.voice_to_text_view),
    path('threads/', views.threads_view),
    path('threads/<int:thread_id>/messages/', views.thread_messages_view),
    path('threads/<int:thread_id>/delete/', views.delete_thread_view),
    path('preferences/', views.preferences_view),
    # Betting AI
    path('betting/predict/', views.betting_predict_view),
    path('betting/accumulator/', views.betting_accumulator_view),
    path('betting/prediction/<int:prediction_id>/delete/', views.delete_betting_prediction_view),
    path('betting/history/', views.betting_prediction_history_view),
]