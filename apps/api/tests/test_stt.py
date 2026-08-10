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
    # Scope to rows this test creates. The shared DB already holds real
    # stt_transcribe entries from live traffic, and an unscoped .first()
    # happily asserts against someone else's transcription.
    baseline = (
        db_session.query(AuditLog.id)
        .filter(AuditLog.action == "stt_transcribe")
        .order_by(AuditLog.id.desc())
        .first()
    )
    baseline_id = baseline[0] if baseline else 0

    fake_audio = io.BytesIO(b"fake audio data")
    client.post(
        "/stt/transcribe",
        files={"file": ("test.wav", fake_audio, "audio/wav")},
        data={"language": "en", "field_hint": "description"},
    )
    log = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "stt_transcribe", AuditLog.id > baseline_id)
        .first()
    )
    assert log is not None
    # No API keys are configured in the test environment, so the chain must
    # fall through to mock — and must say so. Stamping a real engine name on
    # mock output is the exact dishonesty the engine-stamp rule forbids.
    assert "engine=mock" in log.details
