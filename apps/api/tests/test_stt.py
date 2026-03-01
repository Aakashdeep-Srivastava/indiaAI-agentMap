"""Tests for STT transcription route (/stt)."""

import io

from database import AuditLog


def test_transcribe_returns_mock_result(client):
    fake_audio = io.BytesIO(b"fake audio data")
    resp = client.post(
        "/stt/transcribe",
        files={"file": ("test.wav", fake_audio, "audio/wav")},
        data={"language": "en", "field_hint": "description"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_mock"] is True
    assert data["engine"] == "mock"
    assert 0.0 < data["confidence"] <= 1.0
    assert isinstance(data["text"], str)
    assert len(data["text"]) > 0


def test_transcribe_hindi(client):
    fake_audio = io.BytesIO(b"fake audio data")
    resp = client.post(
        "/stt/transcribe",
        files={"file": ("test.wav", fake_audio, "audio/wav")},
        data={"language": "hi", "field_hint": "name"},
    )
    assert resp.status_code == 200
    assert resp.json()["language"] == "hi"


def test_transcribe_different_field_hints(client):
    for hint in ("name", "description", "products"):
        fake_audio = io.BytesIO(b"fake audio data")
        resp = client.post(
            "/stt/transcribe",
            files={"file": ("test.wav", fake_audio, "audio/wav")},
            data={"language": "en", "field_hint": hint},
        )
        assert resp.status_code == 200
        assert len(resp.json()["text"]) > 0


def test_transcribe_creates_audit_log(client, db_session):
    fake_audio = io.BytesIO(b"fake audio data")
    client.post(
        "/stt/transcribe",
        files={"file": ("test.wav", fake_audio, "audio/wav")},
        data={"language": "en", "field_hint": "description"},
    )
    log = db_session.query(AuditLog).filter(AuditLog.action == "stt_transcribe").first()
    assert log is not None
    assert "engine=mock" in log.details
