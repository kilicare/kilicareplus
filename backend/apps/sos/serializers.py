from rest_framework import serializers
from .models import SOSAlert, SOSResponse, SOSEvent


class SOSEventSerializer(serializers.ModelSerializer):
    """Serializer for SOS events with actor and related data."""
    actor_id = serializers.IntegerField(source='actor.id', allow_null=True)
    actor_username = serializers.CharField(source='actor.username', allow_null=True)
    actor_first_name = serializers.CharField(source='actor.first_name', allow_null=True)
    actor_avatar = serializers.SerializerMethodField()
    response_data = serializers.SerializerMethodField()
    message_data = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSEvent
        fields = [
            'id',
            'event_type',
            'actor_id',
            'actor_username',
            'actor_first_name',
            'actor_avatar',
            'data',
            'created_at',
            'response_data',
            'message_data',
        ]
    
    def get_actor_avatar(self, obj):
        """Get actor avatar URL if available."""
        if obj.actor and hasattr(obj.actor, 'profile') and obj.actor.profile.avatar:
            return obj.actor.profile.avatar.url
        return None
    
    def get_response_data(self, obj):
        """Get response data if applicable."""
        if obj.response:
            return {
                'id': obj.response.id,
                'message': obj.response.message,
                'eta_minutes': obj.response.eta_minutes,
                'responder_username': obj.response.responder.username,
            }
        return None
    
    def get_message_data(self, obj):
        """Get message data if applicable."""
        if obj.message:
            return {
                'id': obj.message.id,
                'content': obj.message.content,
                'sender_id': obj.message.sender.id,
                'sender_username': obj.message.sender.username,
                'timestamp': obj.message.timestamp.isoformat(),
            }
        return None


class SOSResponseSerializer(serializers.ModelSerializer):
    """Serializer for SOS responses with responder details."""
    responder_id = serializers.IntegerField(source='responder.id')
    responder_username = serializers.CharField(source='responder.username')
    responder_first_name = serializers.CharField(source='responder.first_name')
    responder_avatar = serializers.SerializerMethodField()
    chat_room_name = serializers.CharField(source='alert.chat_room.name', read_only=True, allow_null=True)
    guide_status = serializers.CharField(read_only=True)
    is_primary = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSResponse
        fields = [
            'id',
            'responder_id',
            'responder_username',
            'responder_first_name',
            'responder_avatar',
            'message',
            'eta_minutes',
            'guide_status',
            'is_onsite',
            'onsite_at',
            'accepted_at',
            'on_the_way_at',
            'arrived_at',
            'completed_at',
            'created_at',
            'chat_room_name',
            'is_primary',
        ]
    
    def get_responder_avatar(self, obj):
        """Get responder avatar URL if available."""
        if hasattr(obj.responder, 'profile') and obj.responder.profile.avatar:
            return obj.responder.profile.avatar.url
        return None
    
    def get_is_primary(self, obj):
        """Check if this responder is the primary responder for the alert."""
        return obj.alert.primary_responder_id == obj.responder_id


class SOSAlertSerializer(serializers.ModelSerializer):
    """Serializer for SOS alerts with optional responses and timeline."""
    responses = SOSResponseSerializer(many=True, read_only=True)
    user_id = serializers.IntegerField(source='user.id')
    user_username = serializers.CharField(source='user.username')
    user_first_name = serializers.CharField(source='user.first_name')
    user_avatar = serializers.SerializerMethodField()
    chat_room_name = serializers.CharField(source='chat_room.name', read_only=True, allow_null=True)
    latest_chat_message = serializers.SerializerMethodField()
    chat_unread_count = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    responders = serializers.SerializerMethodField()
    primary_responder_id = serializers.IntegerField(source='primary_responder.id', read_only=True, allow_null=True)
    primary_responder_username = serializers.CharField(source='primary_responder.username', read_only=True, allow_null=True)
    primary_responder_first_name = serializers.CharField(source='primary_responder.first_name', read_only=True, allow_null=True)
    primary_responder_avatar = serializers.SerializerMethodField()
    standby_responders = serializers.SerializerMethodField()
    assigned_at = serializers.DateTimeField(read_only=True, allow_null=True)
    coverage_level = serializers.SerializerMethodField()
    
    class Meta:
        model = SOSAlert
        fields = [
            'id',
            'user_id',
            'user_username',
            'user_first_name',
            'user_avatar',
            'latitude',
            'longitude',
            'location_address',
            'severity',
            'status',
            'message',
            'responder_count',
            'first_response_at',
            'avg_response_time_minutes',
            'created_at',
            'updated_at',
            'resolved_at',
            'cancelled_at',
            'escalated_at',
            'escalation_reason',
            'responses',
            'chat_room_name',
            'latest_chat_message',
            'chat_unread_count',
            'timeline',
            'responders',
            'primary_responder_id',
            'primary_responder_username',
            'primary_responder_first_name',
            'primary_responder_avatar',
            'standby_responders',
            'assigned_at',
            'coverage_level',
        ]
    
    def get_user_avatar(self, obj):
        """Get user avatar URL if available."""
        if hasattr(obj.user, 'profile') and obj.user.profile.avatar:
            return obj.user.profile.avatar.url
        return None
    
    def get_latest_chat_message(self, obj):
        """Get latest chat message preview if chat room exists."""
        if not obj.chat_room:
            return None
        from apps.messaging.models import Message
        latest_msg = Message.objects.filter(
            room=obj.chat_room
        ).select_related('sender', 'sender__profile').order_by('-timestamp').first()
        if not latest_msg:
            return None
        return {
            'id': latest_msg.id,
            'content': latest_msg.content,
            'sender_id': latest_msg.sender.id,
            'sender_username': latest_msg.sender.username,
            'sender_first_name': latest_msg.sender.first_name,
            'sender_avatar': (
                latest_msg.sender.profile.avatar.url
                if hasattr(latest_msg.sender, 'profile') and latest_msg.sender.profile.avatar
                else None
            ),
            'timestamp': latest_msg.timestamp.isoformat(),
            'is_read': latest_msg.is_read,
        }
    
    def get_chat_unread_count(self, obj):
        """Get unread message count for the current user."""
        if not obj.chat_room:
            return 0
        from apps.messaging.models import Message
        request = self.context.get('request')
        if not request:
            return 0
        return Message.objects.filter(
            room=obj.chat_room,
            is_read=False
        ).exclude(sender=request.user).count()
    
    def get_timeline(self, obj):
        """Get structured timeline for this SOS alert."""
        from .services import SOSEventService
        return SOSEventService.get_timeline(obj.id)
    
    def get_responders(self, obj):
        """Get list of guides who have responded to this SOS alert."""
        from .models import SOSResponse
        responders = []
        for response in obj.responses.select_related('responder__profile').order_by('created_at'):
            profile = getattr(response.responder, 'profile', None)
            responders.append({
                'id': response.responder.id,
                'username': response.responder.username,
                'first_name': response.responder.first_name,
                'avatar': profile.avatar.url if profile and profile.avatar else None,
                'eta_minutes': response.eta_minutes,
                'guide_status': response.guide_status,
                'is_primary': obj.primary_responder_id == response.responder.id,
            })
        return responders
    
    def get_primary_responder_avatar(self, obj):
        """Get primary responder avatar URL if available."""
        if obj.primary_responder and hasattr(obj.primary_responder, 'profile') and obj.primary_responder.profile.avatar:
            return obj.primary_responder.profile.avatar.url
        return None
    
    def get_standby_responders(self, obj):
        """Get list of standby responders (not primary)."""
        from .models import SOSResponse
        standby = []
        for response in obj.responses.exclude(responder=obj.primary_responder).select_related('responder__profile').order_by('created_at'):
            profile = getattr(response.responder, 'profile', None)
            standby.append({
                'id': response.responder.id,
                'username': response.responder.username,
                'first_name': response.responder.first_name,
                'avatar': profile.avatar.url if profile and profile.avatar else None,
                'eta_minutes': response.eta_minutes,
                'guide_status': response.guide_status,
            })
        return standby
    
    def get_coverage_level(self, obj):
        """Calculate rescue coverage level based on responders and status."""
        responder_count = obj.responses.count()
        has_primary = obj.primary_responder is not None
        has_standby = responder_count > (1 if has_primary else 0)
        
        # Calculate coverage level
        if has_primary and has_standby and responder_count >= 3:
            return 'EXCELLENT'
        elif has_primary and has_standby:
            return 'GOOD'
        elif has_primary:
            return 'ADEQUATE'
        elif responder_count >= 2:
            return 'LIMITED'
        elif responder_count == 1:
            return 'MINIMAL'
        else:
            return 'NONE'


class SOSAlertListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no responses)."""
    user_id = serializers.IntegerField(source='user.id')
    user_username = serializers.CharField(source='user.username')
    user_first_name = serializers.CharField(source='user.first_name')
    
    class Meta:
        model = SOSAlert
        fields = [
            'id',
            'user_id',
            'user_username',
            'user_first_name',
            'latitude',
            'longitude',
            'location_address',
            'severity',
            'status',
            'message',
            'responder_count',
            'first_response_at',
            'avg_response_time_minutes',
            'created_at',
            'resolved_at',
            'escalated_at',
        ]
