from django.db import models
from django.conf import settings


class ChatRoom(models.Model):
    name = models.CharField(max_length=100, unique=True)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='chat_rooms'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @classmethod
    def get_or_create_dm(cls, user1_id: int, user2_id: int):
        name = f'dm_{min(user1_id, user2_id)}_{max(user1_id, user2_id)}'
        room, created = cls.objects.get_or_create(name=name)
        if created:
            room.participants.add(user1_id, user2_id)
        return room


class Message(models.Model):
    room = models.ForeignKey(
        ChatRoom, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    content = models.TextField()
    attachment = models.FileField(
        upload_to='chat_attachments/', null=True, blank=True
    )
    attachment_type = models.CharField(max_length=10, null=True, blank=True)
    reply_to = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True
    )
    is_delivered = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f'{self.sender.username}: {self.content[:30]}'