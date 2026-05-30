from groq import Groq
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


def chat_with_groq(messages: list, stream: bool = False):
    client = Groq(api_key=settings.GROQ_API_KEY)
    return client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=messages,
        max_tokens=800,
        temperature=0.7,
        stream=stream,
    )


def transcribe_audio(audio_file) -> str:
    """Transcribe audio using Groq Whisper"""
    client = Groq(api_key=settings.GROQ_API_KEY)
    transcription = client.audio.transcriptions.create(
        file=audio_file,
        model='whisper-large-v3',
        language='sw',
        response_format='text',
    )
    return transcription