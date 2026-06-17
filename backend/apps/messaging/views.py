from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from django.db.models import Q, Max
from .models import ChatRoom, Message


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contacts_view(request):
    """Get all chat contacts with last message"""
    rooms = ChatRoom.objects.filter(
        participants=request.user
    ).prefetch_related('participants', 'messages').annotate(
        last_message_time=Max('messages__timestamp')
    ).order_by('-last_message_time')

    result = []
    for room in rooms:
        other = room.participants.exclude(id=request.user.id).first()
        if not other:
            continue
        last_msg = room.messages.order_by('-timestamp').first()
        unread = room.messages.filter(
            is_read=False
        ).exclude(sender=request.user).count()

        result.append({
            'room_name': room.name,
            'other_user': {
                'id': other.id,
                'username': other.username,
                'first_name': other.first_name,
                'role': other.role,
                'is_verified': other.is_verified,
                'avatar': (
                    other.profile.avatar.url
                    if hasattr(other, 'profile') and other.profile.avatar
                    else None
                ),
            },
            'last_message': (
                {
                    'content': last_msg.content,
                    'timestamp': last_msg.timestamp.isoformat(),
                    'is_read': last_msg.is_read,
                    'sender_id': last_msg.sender_id,
                }
                if last_msg
                else None
            ),
            'unread_count': unread,
        })

    return Response(result)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def room_messages_view(request, room_name):
    from .models import ChatRoom, Message
    try:
        room = ChatRoom.objects.get(
            name=room_name, participants=request.user
        )
    except ChatRoom.DoesNotExist:
        return Response({'message': 'Chumba haipatikani.'}, status=404)

    if request.method == 'GET':
        messages = room.messages.select_related(
            'sender', 'sender__profile', 'reply_to'
        ).order_by('timestamp')[:100]

        data = []
        for m in messages:
            data.append({
                'id': m.id,
                'content': m.content,
                'sender_id': m.sender.id,
                'sender_username': m.sender.username,
                'is_delivered': m.is_delivered,
                'is_read': m.is_read,
                'is_deleted': m.is_deleted,
                'reply_to': m.reply_to_id,
                'timestamp': m.timestamp.isoformat(),
                'attachment': m.attachment.url if m.attachment else None,
                'attachment_type': m.attachment_type,
            })
        return Response(data)

    # POST — start DM
    target_id = request.data.get('user_id')
    if not target_id:
        return Response({'message': 'user_id inahitajika.'}, status=400)
    room = ChatRoom.get_or_create_dm(request.user.id, int(target_id))
    return Response({'room_name': room.name})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_room_by_name_view(request, room_name):
    """Get a specific chat room by name (for SOS integration)"""
    try:
        room = ChatRoom.objects.get(
            name=room_name, participants=request.user
        )
    except ChatRoom.DoesNotExist:
        return Response({'message': 'Chumba haipatikani.'}, status=404)

    other = room.participants.exclude(id=request.user.id).first()
    if not other:
        return Response({'message': 'Chumba halina washiriki wengine.'}, status=404)

    last_msg = room.messages.order_by('-timestamp').first()
    unread = room.messages.filter(
        is_read=False
    ).exclude(sender=request.user).count()

    return Response({
        'room_name': room.name,
        'other_user': {
            'id': other.id,
            'username': other.username,
            'first_name': other.first_name,
            'role': other.role,
            'is_verified': other.is_verified,
            'avatar': (
                other.profile.avatar.url
                if hasattr(other, 'profile') and other.profile.avatar
                else None
            ),
        },
        'last_message': (
            {
                'content': last_msg.content,
                'timestamp': last_msg.timestamp.isoformat(),
                'is_read': last_msg.is_read,
                'sender_id': last_msg.sender_id,
            }
            if last_msg
            else None
        ),
        'unread_count': unread,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_dm_view(request):
    """Start or get DM room with another user"""
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'message': 'user_id inahitajika.'}, status=400)
    room = ChatRoom.get_or_create_dm(request.user.id, int(user_id))
    return Response({'room_name': room.name})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_attachment_view(request):
    """Upload chat attachment (image, video, or file)"""
    file = request.FILES.get('file')
    if not file:
        return Response({'message': 'Faili inahitajika.'}, status=400)
    
    # Determine file type
    file_type = 'file'
    if file.content_type.startswith('image/'):
        file_type = 'image'
    elif file.content_type.startswith('video/'):
        file_type = 'video'
    elif file.content_type.startswith('audio/'):
        file_type = 'audio'
    
    try:
        # Save file using Django storage backend (Cloudinary or local)
        from django.core.files.storage import default_storage
        filename = default_storage.save(f'chat_attachments/{file.name}', file)
        file_url = default_storage.url(filename)
        
        return Response({
            'path': filename,  # Return storage path for FileField
            'url': file_url,   # Return URL for immediate display
            'type': file_type,
        })
    except Exception as e:
        return Response({'message': f'Upload failed: {str(e)}'}, status=500)