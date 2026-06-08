import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return
        self.group = f'notifications_{self.user.id}'
        await self.channel_layer.group_add(
            self.group, self.channel_name
        )
        await self.accept()

        # Send unread count on connect
        count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': count,
        }))

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            self.group, self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action == 'mark_read':
                nid = data.get('notification_id')
                if nid:
                    await self.mark_read(nid)
                    count = await self.get_unread_count()
                    await self.send(text_data=json.dumps({
                        'type': 'unread_count',
                        'count': count,
                    }))
            elif action == 'mark_all_read':
                await self.mark_all_read()
                await self.send(text_data=json.dumps({
                    'type': 'all_read',
                    'count': 0,
                }))
        except Exception as e:
            logger.warning(f'[NotifConsumer receive] {e}')

    async def notification_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'notification',
            **event.get('notification', {}),
        }))

    async def unread_count_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': event.get('count', 0),
        }))

    async def gamification_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'gamification_update',
            'update_type': event.get('update_type'),
            'data': event.get('data', {}),
        }))

    @database_sync_to_async
    def get_unread_count(self):
        from .models import Notification
        return Notification.objects.filter(
            recipient=self.user, is_read=False
        ).count()

    @database_sync_to_async
    def mark_read(self, notif_id):
        from .models import Notification
        Notification.objects.filter(
            id=notif_id, recipient=self.user
        ).update(is_read=True)

    @database_sync_to_async
    def mark_all_read(self):
        from .models import Notification
        Notification.objects.filter(
            recipient=self.user, is_read=False
        ).update(is_read=True)