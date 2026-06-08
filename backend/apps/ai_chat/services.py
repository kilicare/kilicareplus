import io
import time
import requests
import socket
from requests.exceptions import RequestException, ConnectionError, Timeout
from urllib3.exceptions import NameResolutionError, MaxRetryError
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Reusable session for connection pooling
_groq_session = requests.Session()
_groq_session.headers.update({
    'Authorization': f'Bearer {settings.GROQ_API_KEY}',
})

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

BETTING_SYSTEM_PROMPT_EN = """
🎯 KILICAREGO+ PRO MAX — ADVANCED BETTING ANALYST

YOU ARE A PROFESSIONAL BETTING EXPERT. NOT A TOURISM GUIDE.
STAY 100% FOCUSED ON FOOTBALL BETTING ANALYSIS.

═══════════════════════════════════════════════════════════════

YOUR IDENTITY:
- Expert betting analyst with deep football knowledge
- Data-driven predictor powered by ML models
- Conversational expert who explains complex metrics simply
- Professional who admits uncertainty, never guarantees outcomes

═══════════════════════════════════════════════════════════════

CORE RESPONSIBILITIES:
1. Analyze football matches using predictor engine data
2. Explain probabilities in human language
3. Identify value bets and edges
4. Suggest accumulators
5. Answer any question about betting markets/football
6. Maintain conversation context (remember previous matches)

═══════════════════════════════════════════════════════════════

YOUR CONVERSATION STYLE:
- Friendly but professional
- Use emojis: 📊 for analysis, 💎 for value, ⚠️ for risk
- Explain technical terms (ELO, xG, BTTS, etc.) simply
- Always show your reasoning
- Acknowledge edge cases and uncertainty

═══════════════════════════════════════════════════════════════

WHEN USER ASKS "...kwa iyo una shauri nini?" (what's your advice?):
DO NOT give tourism advice.
DO continue the betting analysis.
Explain: "Best bet on this match is [X] because [reasoning]"

═══════════════════════════════════════════════════════════════

RESPONSE FORMAT:
For predictions: Show probabilities + explain + risk + recommendation
For questions: Answer betting-focused, use match data if available
Follow-ups: Continue betting conversation, reference previous data

═══════════════════════════════════════════════════════════════

CRITICAL RULES:
❌ NEVER mention tourism, travel, Kilimanjaro, Zanzibar, etc
❌ NEVER recommend guides or experiences  
❌ NEVER say "I'm a tourism assistant"
✅ ALWAYS stay in betting/football mode
✅ ALWAYS use prediction data for answers
✅ ALWAYS be professional and helpful

═══════════════════════════════════════════════════════════════

When confused about scope: Ask about betting markets, not tourism!
"""

BETTING_SYSTEM_PROMPT_SW = """
🎯 KILICAREGO+ PRO MAX — MCHAMBUZI BETTING WA KUMBUKA

WEWE NI MTAALAMU WA BETTING. SI MWONGOZO WA UTALII.
JIBU TU KUHUSU BETTING YA MPIRA NA UBAO WA LIGI.

═══════════════════════════════════════════════════════════════

UTAMBULISHO WAKO:
- Mtaalamu wa betting aliyejaliwa kwa uchambuzi wa mpira
- Kichambaji kinachotumia mifumo ya kufanya ubashiri
- Mzungumzaji aliyejua kufafanua vitu vigumu kwa urahisi
- Mtaalamu anayekubali kutokuwa na uhakika, hakikaka matokeo

═══════════════════════════════════════════════════════════════

KAZI ZA MSINGI:
1. Chambua mechi za mpira ukitumia data ya ubashiri
2. Fafanua uwezekano kwa lugha rahisi
3. Tafuta hisa nzuri (value bets) na edge
4. Buni accumulators
5. Jibu maswali kuhusu soko la betting
6. Kumbuka muktadha ya mazungumzo yaliyopita

═══════════════════════════════════════════════════════════════

MTINDO WA MAZUNGUMZO:
- Kirafiki lakini kwa kipaji
- Tumia alama: 📊 uchambuzi, 💎 kwa thamani, ⚠️ kwa hatari
- Fafanua maneno magumu (ELO, xG, BTTS) kwa urahisi
- Daima onyesha sababu yako
- Ikubali kutokuwa na uhakika

═══════════════════════════════════════════════════════════════

WAKATI USER ANASEMA "...kwa iyo una shauri nini?" (una shauri gani?):
USITOE SHAURI LA UTALII.
ENDELEA NA UCHAMBUZI WA BETTING.
Sema: "Bet nzuri kwa mechi hii ni [X] kwa sababu [sababu]"

═══════════════════════════════════════════════════════════════

MUUNDO WA JIBU:
Ubashiri: Onyesha % + fafanua + hatari + pendekezo
Maswali: Jibu kwa betting, tumia data ya mechi
Ufuataji: Endelea na betting, rejelea data ya awali

═══════════════════════════════════════════════════════════════

SHERIA MUHIMU:
❌ KAMWE usitaje utalii, Kilimanjaro, Zanzibar, n.k
❌ KAMWE usipendekeze wajumbe au uzoefu wa utalii
❌ KAMWE usiseme "Mimi ni msaada wa utalii"
✅ DAIMA jibu juu ya betting pekee
✅ DAIMA tumia data ya ubashiri
✅ DAIMA kuwa na sikali na msaada

═══════════════════════════════════════════════════════════════

Ikiwa haujuelewa: Uliza kuhusu soko la betting, si utalii!
"""


def build_messages(history: list, lang: str = 'sw', context: str = 'tourism', moment_context: dict | None = None) -> list:
    """
    Build message list for Groq API.
    
    Args:
        history: List of {'role': 'user'/'assistant', 'content': '...'}
        lang: 'sw' or 'en'
        context: 'tourism' or 'betting'
        moment_context: Optional dict with moment details (caption, location, media_type, posted_by)
    """
    if context == 'betting':
        system = BETTING_SYSTEM_PROMPT_SW if lang == 'sw' else BETTING_SYSTEM_PROMPT_EN
    else:
        system = SYSTEM_PROMPT_SW if lang == 'sw' else SYSTEM_PROMPT_EN
    
    # Add moment context to system prompt if provided
    if moment_context:
        moment_info = f"""
        
CONTEXT: User is asking about a specific moment/post from KilicareGO+:
- Caption: {moment_context.get('caption', 'N/A')}
- Location: {moment_context.get('location', 'Tanzania')}
- Media Type: {moment_context.get('media_type', 'image/video')}
- Posted By: @{moment_context.get('posted_by', 'user')}

Focus your responses on this specific moment. Answer questions about the location, provide travel tips for this area, or explain what's shown in the post. Be helpful and specific to this context.
"""
        system += moment_info
    
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
    headers = {}
    if content_type:
        headers['Content-Type'] = content_type
    return headers


class AIServiceError(Exception):
    """Base exception for AI service errors with safe user-facing messages"""
    def __init__(self, user_message: str, log_details: str | None = None):
        self.user_message = user_message
        self.log_details = log_details or user_message
        super().__init__(user_message)


def _post_to_groq(url: str, **kwargs):
    """Post to Groq API with exponential backoff retry logic using reusable session"""
    last_exception: Exception | None = None
    max_retries = 3
    base_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            response = _groq_session.post(url, timeout=60, **kwargs)
            if response.ok:
                return response
            last_exception = RequestException(
                f'Groq API error {response.status_code}: {response.text}'
            )
        except (ConnectionError, Timeout) as exc:
            last_exception = exc
            logger.warning(f"[AI Service] Connection/timeout error on attempt {attempt + 1}/{max_retries}")
        except NameResolutionError as exc:
            logger.error(f"[AI Service] DNS resolution failed: {exc}")
            raise AIServiceError(
                "Unable to connect to AI service. Please check your internet connection.",
                f"DNS resolution failed for Groq API: {exc}"
            )
        except socket.gaierror as exc:
            logger.error(f"[AI Service] Socket DNS error: {exc}")
            raise AIServiceError(
                "Unable to connect to AI service. Please check your internet connection.",
                f"Socket DNS error: {exc}"
            )
        except socket.timeout as exc:
            logger.warning(f"[AI Service] Socket timeout on attempt {attempt + 1}/{max_retries}")
            last_exception = exc
        except socket.error as exc:
            logger.error(f"[AI Service] Socket error: {exc}")
            raise AIServiceError(
                "Network error. Please check your internet connection.",
                f"Socket error: {exc}"
            )
        except MaxRetryError as exc:
            logger.error(f"[AI Service] Max retries exceeded: {exc}")
            raise AIServiceError(
                "AI service is temporarily unavailable. Please try again later.",
                f"Max retries exceeded: {exc}"
            )
        except RequestException as exc:
            last_exception = exc
            logger.warning(f"[AI Service] Request exception on attempt {attempt + 1}/{max_retries}")
        except Exception as exc:
            logger.error(f"[AI Service] Unexpected error: {exc}")
            raise AIServiceError(
                "AI service is temporarily unavailable. Please try again later.",
                f"Unexpected error: {exc}"
            )
        
        # Exponential backoff before retry
        if attempt < max_retries - 1:
            delay = base_delay * (2 ** attempt)
            time.sleep(delay)

    # All retries exhausted
    if last_exception is not None:
        logger.error(f"[AI Service] All {max_retries} retries exhausted")
        raise AIServiceError(
            "AI service is temporarily unavailable. Please try again later.",
            f"All retries exhausted. Last error: {last_exception}"
        )
    
    raise AIServiceError(
        "AI service is temporarily unavailable. Please try again later.",
        "Groq request failed with unknown error"
    )


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