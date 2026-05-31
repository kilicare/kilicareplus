import io
import requests
from requests.exceptions import RequestException
from django.conf import settings

SYSTEM_PROMPT_SW = """
Wewe ni KilicareGO AI — msaidizi bora wa utalii Tanzania.
Unajua Tanzania yote: Kilimanjaro, Zanzibar, Serengeti, Ngorongoro, Dar es Salaam, Pemba, Mafia.
Unajibu kwa Kiswahili kwa kawaida, lakini kama mtumiaji anaandika kwa Kiingereza, jibu kwa Kiingereza.
Daima: wa kweli, wa kusaidia, na wa Tanzania.
Mapendekezo yako ya guides na experiences yanakuja kutoka KilicareGO+ platform yenyewe.
Kamwe usitoe habari za uongo. Kama hujui — sema hivyo waziwazi.
Jibu kwa ufupi na kwa usahihi — si zaidi ya aya 3 isipokuwa kama unaelezea hatua nyingi.
"""

SYSTEM_PROMPT_EN = """
You are KilicareGO AI — Tanzania's best tourism assistant.
You know all of Tanzania: Kilimanjaro, Zanzibar, Serengeti, Ngorongoro, Dar es Salaam.
Reply in English when the user writes in English, Swahili otherwise.
Always: truthful, helpful, and Tanzania-focused.
Recommend guides and experiences from the KilicareGO+ platform.
Never make up information. Keep responses concise — max 3 paragraphs.
"""


def build_messages(history: list, lang: str = 'sw') -> list:
    system = SYSTEM_PROMPT_SW if lang == 'sw' else SYSTEM_PROMPT_EN
    msgs = [{'role': 'system', 'content': system}]
    for msg in history:
        msgs.append({
            'role': msg['role'],
            'content': msg['content'],
        })
    return msgs


GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_AUDIO_TRANSCRIPTIONS_URL = 'https://api.groq.com/v1/audio/transcriptions'


def _groq_headers(content_type: str = 'application/json') -> dict:
    headers = {
        'Authorization': f'Bearer {settings.GROQ_API_KEY}',
    }
    if content_type:
        headers['Content-Type'] = content_type
    return headers


def _post_to_groq(url: str, **kwargs):
    last_exception: Exception | None = None
    for attempt in range(2):
        try:
            response = requests.post(url, timeout=60, **kwargs)
            if response.ok:
                return response
            last_exception = RequestException(
                f'Groq API error {response.status_code}: {response.text}'
            )
        except RequestException as exc:
            last_exception = exc

    raise last_exception if last_exception is not None else RequestException('Groq request failed')


def chat_with_groq(messages: list, stream: bool = False):
    payload = {
        'model': 'llama-3.3-70b-versatile',
        'messages': messages,
        'temperature': 0.7,
        'max_tokens': 800,
        'stream': stream,
    }
    response = _post_to_groq(
        GROQ_CHAT_COMPLETIONS_URL,
        headers=_groq_headers('application/json'),
        json=payload,
        stream=stream,
    )
    return response


def transcribe_audio(audio_file) -> str:
    """Transcribe audio using Groq Whisper"""
    if isinstance(audio_file, tuple):
        filename, content, content_type = audio_file
        file_payload = {'file': (filename, io.BytesIO(content), content_type)}
    else:
        file_payload = {'file': audio_file}

    data = {
        'model': 'whisper-large-v3',
        'language': 'sw',
        'response_format': 'text',
    }

    response = _post_to_groq(
        GROQ_AUDIO_TRANSCRIPTIONS_URL,
        headers=_groq_headers(None),
        files=file_payload,
        data=data,
    )

    if response.headers.get('Content-Type', '').startswith('application/json'):
        json_data = response.json()
        return json_data.get('text', json_data.get('transcription', ''))

    return response.text