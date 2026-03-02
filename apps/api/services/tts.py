"""Text-to-Speech service — Sarvam Bulbul V3 (mock for PoC)."""

import os

USE_MOCK_TTS = os.getenv("USE_MOCK_TTS", "true").lower() == "true"
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

LANG_MAP = {
    "en": "en-IN", "hi": "hi-IN", "ta": "ta-IN", "te": "te-IN",
    "kn": "kn-IN", "bn": "bn-IN", "mr": "mr-IN", "gu": "gu-IN",
}


async def synthesize_speech(text: str, language: str = "en") -> dict:
    """Synthesize speech from text. Mock for PoC, Sarvam Bulbul V3 in production."""
    if USE_MOCK_TTS or not SARVAM_API_KEY:
        return _synthesize_mock(text, language)
    return await _synthesize_sarvam(text, language)


def _synthesize_mock(text: str, language: str) -> dict:
    """Return mock response — frontend uses browser speechSynthesis as fallback."""
    return {
        "text": text,
        "language": language,
        "audio_base64": None,
        "content_type": None,
        "engine": "mock",
        "is_mock": True,
    }


async def _synthesize_sarvam(text: str, language: str) -> dict:
    """Call Sarvam Bulbul V3 TTS API (production path)."""
    import httpx

    target_lang = LANG_MAP.get(language, "en-IN")

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={"api-subscription-key": SARVAM_API_KEY},
            json={
                "inputs": [text],
                "target_language_code": target_lang,
                "speaker": "meera",
                "model": "bulbul:v1",
            },
        )
        resp.raise_for_status()
        result = resp.json()

    audios = result.get("audios", [])
    audio_b64 = audios[0] if audios else None

    return {
        "text": text,
        "language": language,
        "audio_base64": audio_b64,
        "content_type": "audio/wav",
        "engine": "sarvam-bulbul-v3",
        "is_mock": False,
    }
