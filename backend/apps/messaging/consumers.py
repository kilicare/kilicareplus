from channels.generic.websocket import AsyncWebsocketConsumer
import json


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group = f'chat_{self.room_name}'
        await self.channel_layer.group_add(
            self.room_group, self.channel_name
        )
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            self.room_group, self.channel_name
        )

    async def receive(self, text_data):
        pass

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))