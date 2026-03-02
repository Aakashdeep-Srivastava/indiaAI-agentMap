"""Speech-to-Text service — Sarvam Saras STT."""

import logging
import os
import random
import re
from pathlib import Path

from dotenv import load_dotenv

# Ensure .env is loaded before reading keys
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE = "https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_MODEL = "qwen/qwen3.5-397b-a17b"

from services.gemini_limiter import gemini_limiter

USE_MOCK_STT = os.getenv("USE_MOCK_STT", "false" if (SARVAM_API_KEY or GEMINI_API_KEY) else "true").lower() == "true"

_stt_chain = []
if SARVAM_API_KEY:
    _stt_chain.append("Sarvam")
if GEMINI_API_KEY:
    _stt_chain.append("Gemini")
if NVIDIA_API_KEY:
    _stt_chain.append("NVIDIA/Qwen")
_stt_chain.append("Mock")
logger.info(f"STT chain: {' → '.join(_stt_chain)}")

# Mock transcription responses per language + field type
_MOCK_RESPONSES: dict[str, dict[str, list[str]]] = {
    "en": {
        "name": [
            "Sharma Handloom Industries",
            "Gupta Spice Trading Company",
            "Rajesh Pottery Works",
            "Lakshmi Silk Emporium",
            "Bharat Organic Farms",
        ],
        "description": [
            "We manufacture handloom cotton sarees and export across South India",
            "We are a spice trading company dealing in turmeric, chilli, and cumin",
            "We make traditional clay pottery and terracotta items for home decor",
            "We produce pure silk sarees with traditional Banarasi weaving patterns",
            "We grow organic vegetables and supply to local markets in Maharashtra",
        ],
        "products": [
            "Cotton sarees, Silk fabric, Dupattas",
            "Turmeric powder, Red chilli, Cumin seeds, Coriander",
            "Clay pots, Terracotta tiles, Decorative items",
            "Banarasi sarees, Silk stoles, Brocade fabric",
            "Organic tomatoes, Onions, Potatoes, Green vegetables",
        ],
    },
    "hi": {
        "name": [
            "शर्मा हथकरघा उद्योग",
            "गुप्ता मसाला व्यापार कंपनी",
            "राजेश मिट्टी के बर्तन कार्यशाला",
            "लक्ष्मी सिल्क एम्पोरियम",
            "भारत ऑर्गेनिक फार्म्स",
        ],
        "description": [
            "हम हथकरघा सूती साड़ियां बनाते हैं और पूरे दक्षिण भारत में निर्यात करते हैं",
            "हम हल्दी, मिर्च और जीरे का व्यापार करते हैं",
            "हम पारंपरिक मिट्टी के बर्तन और टेराकोटा की वस्तुएं बनाते हैं",
            "हम शुद्ध रेशमी साड़ियां बनाते हैं बनारसी बुनाई के साथ",
            "हम जैविक सब्जियां उगाते हैं और महाराष्ट्र के स्थानीय बाजारों में बेचते हैं",
        ],
        "products": [
            "सूती साड़ी, रेशमी कपड़ा, दुपट्टे",
            "हल्दी पाउडर, लाल मिर्च, जीरा, धनिया",
            "मिट्टी के बर्तन, टेराकोटा टाइल्स, सजावटी सामान",
            "बनारसी साड़ी, सिल्क स्टोल, ब्रोकेड कपड़ा",
            "जैविक टमाटर, प्याज, आलू, हरी सब्जियां",
        ],
    },
    "ta": {
        "name": ["அருண் ஜவுளிக் கடை", "தமிழ் மசாலா வர்த்தகம்"],
        "description": [
            "நாங்கள் கைத்தறி பருத்தி புடவைகள் தயாரிக்கிறோம்",
            "நாங்கள் மஞ்சள், மிளகாய் மற்றும் சீரகம் விற்பனை செய்கிறோம்",
        ],
        "products": [
            "பருத்தி புடவை, பட்டு துணி",
            "மஞ்சள் தூள், சிவப்பு மிளகாய், சீரகம்",
        ],
    },
    "te": {
        "name": ["రాజేష్ చేనేత పరిశ్రమ", "లక్ష్మీ మసాలా వ్యాపారం"],
        "description": [
            "మేము చేనేత పట్టు చీరలు తయారు చేస్తాము",
            "మేము పసుపు, మిర్చి మరియు జీలకర్ర వ్యాపారం చేస్తాము",
        ],
        "products": [
            "పట్టు చీరలు, చేనేత వస్త్రాలు",
            "పసుపు పొడి, ఎరుపు మిర్చి, జీలకర్ర",
        ],
    },
    "kn": {
        "name": ["ರಾಜೇಶ್ ಕೈಮಗ್ಗ ಉದ್ಯಮ", "ಲಕ್ಷ್ಮೀ ಮಸಾಲೆ ವ್ಯಾಪಾರ"],
        "description": [
            "ನಾವು ಕೈಮಗ್ಗ ಹತ್ತಿ ಸೀರೆಗಳನ್ನು ತಯಾರಿಸುತ್ತೇವೆ",
            "ನಾವು ಅರಿಶಿನ, ಮೆಣಸಿನಕಾಯಿ ಮತ್ತು ಜೀರಿಗೆ ವ್ಯಾಪಾರ ಮಾಡುತ್ತೇವೆ",
        ],
        "products": [
            "ಹತ್ತಿ ಸೀರೆ, ರೇಷ್ಮೆ ಬಟ್ಟೆ",
            "ಅರಿಶಿನ ಪುಡಿ, ಕೆಂಪು ಮೆಣಸಿನಕಾಯಿ",
        ],
    },
    "bn": {
        "name": ["রাজেশ তাঁত শিল্প", "লক্ষ্মী মশলা ব্যবসা"],
        "description": [
            "আমরা হাতে বোনা সুতি শাড়ি তৈরি করি",
            "আমরা হলুদ, মরিচ এবং জিরা ব্যবসা করি",
        ],
        "products": [
            "সুতি শাড়ি, রেশমি কাপড়",
            "হলুদ গুঁড়া, লাল মরিচ, জিরা",
        ],
    },
    "mr": {
        "name": ["राजेश हातमाग उद्योग", "लक्ष्मी मसाला व्यापार"],
        "description": [
            "आम्ही हातमाग सुती साड्या बनवतो",
            "आम्ही हळद, मिरची आणि जिरे यांचा व्यापार करतो",
        ],
        "products": [
            "सुती साडी, रेशमी कापड",
            "हळद पावडर, लाल मिरची, जिरे",
        ],
    },
    "gu": {
        "name": ["રાજેશ હાથવણાટ ઉદ્યોગ", "લક્ષ્મી મસાલા વેપાર"],
        "description": [
            "અમે હાથવણાટ સુતરાઉ સાડીઓ બનાવીએ છીએ",
            "અમે હળદર, મરચાં અને જીરું નો વેપાર કરીએ છીએ",
        ],
        "products": [
            "સુતરાઉ સાડી, રેશમી કાપડ",
            "હળદર પાવડર, લાલ મરચાં, જીરું",
        ],
    },
}


def _detect_language_from_text(text: str) -> str:
    """Detect language from text using Devanagari script detection."""
    devanagari_chars = re.findall(r'[\u0900-\u097F]', text)
    return "hi" if len(devanagari_chars) >= 2 else "en"


def _convert_to_wav(audio_bytes: bytes, filename: str) -> bytes | None:
    """Convert webm/opus audio to WAV using ffmpeg (if available)."""
    import shutil
    import subprocess
    import tempfile

    if filename.endswith(".wav"):
        return None  # already WAV

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        logger.warning("ffmpeg not found — sending raw audio to Sarvam (may fail)")
        return None

    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as inp:
            inp.write(audio_bytes)
            inp_path = inp.name
        out_path = inp_path.replace(".webm", ".wav")

        subprocess.run(
            [ffmpeg, "-y", "-i", inp_path, "-ar", "16000", "-ac", "1", "-f", "wav", out_path],
            capture_output=True, timeout=10,
        )
        with open(out_path, "rb") as f:
            wav_data = f.read()

        os.unlink(inp_path)
        os.unlink(out_path)
        logger.info(f"Converted {len(audio_bytes)} bytes webm → {len(wav_data)} bytes wav")
        return wav_data
    except Exception as e:
        logger.warning(f"Audio conversion failed: {e}")
        return None


async def _transcribe_gemini(audio_bytes: bytes, language: str) -> dict | None:
    """Transcribe audio using Gemini multimodal API with shared rate limiting."""
    if not GEMINI_API_KEY:
        return None

    import base64
    import httpx

    b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
    lang_label = {"en": "English", "hi": "Hindi"}.get(language, "Hindi or English")

    for model in GEMINI_MODELS:
        # Check rate limit before calling
        if not await gemini_limiter.acquire(model, max_wait=8.0):
            logger.info(f"Gemini STT {model}: rate limited, trying next model...")
            continue

        try:
            url = f"{GEMINI_BASE}/{model}:generateContent?key={GEMINI_API_KEY}"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{
                            "role": "user",
                            "parts": [
                                {"inline_data": {"mime_type": "audio/webm", "data": b64_audio}},
                                {"text": f"Transcribe this audio exactly as spoken. The speaker may use {lang_label}, Hinglish, or code-mixed language. Return ONLY the transcription text, nothing else."},
                            ],
                        }],
                        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 500},
                    },
                )
                if resp.status_code == 429:
                    gemini_limiter.mark_429(model)
                    logger.warning(f"Gemini STT {model} got 429 despite limiter, trying next...")
                    continue
                resp.raise_for_status()
                data = resp.json()
                transcript = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                logger.info(f"Gemini STT ({model}) result: '{transcript[:100]}'")
                return {
                    "text": transcript,
                    "language": language,
                    "confidence": 0.90,
                    "engine": f"gemini-{model}",
                    "is_mock": False,
                }
        except Exception as e:
            logger.error(f"Gemini STT {model} failed: {e}")
            continue

    return None


async def _transcribe_nvidia(audio_bytes: bytes, language: str) -> dict | None:
    """Transcribe audio using NVIDIA NIM (Qwen multimodal). Falls back gracefully.

    Note: NVIDIA NIM Qwen doesn't natively support audio input via the chat API.
    This is a placeholder for when audio support becomes available. Currently skipped.
    """
    # NVIDIA NIM chat completions API does not support audio input natively.
    # When audio-capable models are available, this will be implemented.
    return None


async def transcribe_audio(
    audio_bytes: bytes,
    language: str = "en",
    field_hint: str = "description",
    filename: str = "audio.webm",
    content_type: str = "audio/webm",
) -> dict:
    """Transcribe audio. Chain: Sarvam → Gemini → NVIDIA → Mock."""
    is_auto = language == "auto"
    effective_lang = "en" if is_auto else language

    logger.info(f"STT request: {len(audio_bytes)} bytes, lang={language}, file={filename}, type={content_type}")

    if USE_MOCK_STT:
        logger.warning("Using MOCK STT (forced by env)")
        if is_auto:
            effective_lang = random.choice(["en", "hi"])
        result = _transcribe_mock(effective_lang, field_hint)
        result["detected_language"] = _detect_language_from_text(result["text"])
        return result

    # 1. Try Sarvam Saras STT
    if SARVAM_API_KEY:
        result = await _transcribe_sarvam(audio_bytes, effective_lang, field_hint, filename, content_type)
        if result.get("engine") != "mock-fallback":
            result["detected_language"] = _detect_language_from_text(result["text"])
            return result
        logger.info("Sarvam STT failed, trying Gemini...")

    # 2. Try Gemini multimodal STT
    gemini_result = await _transcribe_gemini(audio_bytes, effective_lang)
    if gemini_result and gemini_result.get("text"):
        gemini_result["detected_language"] = _detect_language_from_text(gemini_result["text"])
        return gemini_result

    # 3. Try NVIDIA (placeholder — audio not yet supported)
    nvidia_result = await _transcribe_nvidia(audio_bytes, effective_lang)
    if nvidia_result and nvidia_result.get("text"):
        nvidia_result["detected_language"] = _detect_language_from_text(nvidia_result["text"])
        return nvidia_result

    # 4. Last resort: mock
    logger.warning("All STT engines failed, using mock")
    if is_auto:
        effective_lang = random.choice(["en", "hi"])
    result = _transcribe_mock(effective_lang, field_hint)
    result["detected_language"] = _detect_language_from_text(result["text"])
    return result


def _transcribe_mock(language: str, field_hint: str) -> dict:
    """Return realistic mock transcription for the given language and field."""
    lang_data = _MOCK_RESPONSES.get(language, _MOCK_RESPONSES["en"])
    field_data = lang_data.get(field_hint, lang_data.get("description", ["Mock text"]))
    text = random.choice(field_data)
    return {
        "text": text,
        "language": language,
        "confidence": round(random.uniform(0.82, 0.97), 2),
        "engine": "mock",
        "is_mock": True,
    }


async def _transcribe_sarvam(
    audio_bytes: bytes,
    language: str,
    field_hint: str,
    filename: str = "audio.webm",
    content_type: str = "audio/webm",
) -> dict:
    """Call Sarvam Saras STT API."""
    import httpx

    lang_map = {
        "en": "en-IN", "hi": "hi-IN", "ta": "ta-IN", "te": "te-IN",
        "kn": "kn-IN", "bn": "bn-IN", "mr": "mr-IN", "gu": "gu-IN",
    }

    lang_code = lang_map.get(language, "en-IN")
    logger.info(f"Calling Sarvam STT: {len(audio_bytes)} bytes, lang={lang_code}, file={filename}")

    # Convert webm/opus to WAV for Sarvam API compatibility
    wav_bytes = _convert_to_wav(audio_bytes, filename)
    if wav_bytes:
        send_bytes = wav_bytes
        send_name = "audio.wav"
        send_type = "audio/wav"
    else:
        send_bytes = audio_bytes
        send_name = filename
        send_type = content_type

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.sarvam.ai/speech-to-text",
                headers={"api-subscription-key": SARVAM_API_KEY},
                files={"file": (send_name, send_bytes, send_type)},
                data={
                    "language_code": lang_code,
                    "model": "saarika:v2.5",
                },
            )
            if resp.status_code != 200:
                logger.error(f"Sarvam STT HTTP {resp.status_code}: {resp.text[:500]}")
                resp.raise_for_status()
            result = resp.json()

        transcript = result.get("transcript", "")
        logger.info(f"Sarvam STT result: '{transcript[:100]}' (confidence={result.get('confidence', 0)})")

        return {
            "text": transcript,
            "language": language,
            "confidence": result.get("confidence", 0.0),
            "engine": "sarvam-saras",
            "is_mock": False,
        }
    except Exception as e:
        logger.error(f"Sarvam STT FAILED: {e} — falling back to mock")
        result = _transcribe_mock(language, field_hint)
        result["engine"] = "mock-fallback"
        return result
