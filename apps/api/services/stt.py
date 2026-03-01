"""Speech-to-Text service — Sarvam Saras STT (mock for PoC)."""

import os
import random

USE_MOCK_STT = os.getenv("USE_MOCK_STT", "true").lower() == "true"
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

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


async def transcribe_audio(
    audio_bytes: bytes,
    language: str = "en",
    field_hint: str = "description",
) -> dict:
    """Transcribe audio to text. Uses mock in PoC, Sarvam Saras in production."""
    if USE_MOCK_STT or not SARVAM_API_KEY:
        return _transcribe_mock(language, field_hint)
    return await _transcribe_sarvam(audio_bytes, language, field_hint)


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
) -> dict:
    """Call Sarvam Saras STT API (production path)."""
    import httpx

    lang_map = {
        "en": "en-IN", "hi": "hi-IN", "ta": "ta-IN", "te": "te-IN",
        "kn": "kn-IN", "bn": "bn-IN", "mr": "mr-IN", "gu": "gu-IN",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": SARVAM_API_KEY},
            files={"file": ("audio.wav", audio_bytes, "audio/wav")},
            data={
                "language_code": lang_map.get(language, "en-IN"),
                "model": "saarika:v2",
            },
        )
        resp.raise_for_status()
        result = resp.json()

    return {
        "text": result.get("transcript", ""),
        "language": language,
        "confidence": result.get("confidence", 0.0),
        "engine": "sarvam-saras",
        "is_mock": False,
    }
