from channels.generic.websocket import AsyncWebsocketConsumer
import json


class SOSConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(
            'sos_global', self.channel_name
        )
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            'sos_global', self.channel_name
        )

    async def receive(self, text_data):
        pass

    async def sos_alert(self, event):
        await self.send(text_data=json.dumps(event))