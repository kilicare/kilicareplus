import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group = f'chat_{self.room_name}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group, self.channel_name
        )
        await self.accept()

        # Mark as delivered on connect
        await self.mark_delivered()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            self.room_group, self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'message':
            msg = await self.save_message(
                data.get('content', ''),
                data.get('reply_to'),
            )
            payload = {
                'type': 'chat_message',
                'message': {
                    'id': msg.id,
                    'content': msg.content,
                    'sender_id': self.user.id,
                    'sender_username': self.user.username,
                    'reply_to': data.get('reply_to'),
                    'timestamp': msg.timestamp.isoformat(),
                    'is_read': False,
                    'is_deleted': False,
                },
            }
            await self.channel_layer.group_send(
                self.room_group, payload
            )

        elif action == 'typing':
            await self.channel_layer.group_send(self.room_group, {
                'type': 'typing_event',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_typing': data.get('is_typing', False),
            })

        elif action == 'read':
            msg_ids = data.get('message_ids', [])
            await self.mark_messages_read(msg_ids)
            await self.channel_layer.group_send(self.room_group, {
                'type': 'read_receipt',
                'reader_id': self.user.id,
                'message_ids': msg_ids,
            })

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            **event['message'],
        }))

    async def typing_event(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            'type': 'read',
            'reader_id': event['reader_id'],
            'message_ids': event['message_ids'],
        }))

    @database_sync_to_async
    def save_message(self, content, reply_to_id=None):
        from .models import ChatRoom, Message
        room = ChatRoom.objects.get(name=self.room_name)
        return Message.objects.create(
            room=room,
            sender=self.user,
            content=content,
            reply_to_id=reply_to_id,
        )

    @database_sync_to_async
    def mark_messages_read(self, ids):
        from .models import Message
        Message.objects.filter(
            id__in=ids,
            is_read=False,
        ).exclude(sender=self.user).update(is_read=True)

    @database_sync_to_async
    def mark_delivered(self):
        from .models import Message, ChatRoom
        try:
            room = ChatRoom.objects.get(name=self.room_name)
            Message.objects.filter(
                room=room, is_delivered=False
            ).exclude(sender=self.user).update(is_delivered=True)
        except Exception:
            pass