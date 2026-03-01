"""Unit tests for the classifier service (keyword mock mode)."""

from services.classifier import classify_mse_description, _classify_with_keywords


def test_keyword_classifier_grocery():
    predictions = _classify_with_keywords("We sell rice, dal, atta and spices")
    assert predictions[0]["domain"] == "RET10"
    assert predictions[0]["confidence"] > 0


def test_keyword_classifier_fashion():
    predictions = _classify_with_keywords("Traditional silk saree weaving and kurta garments")
    assert predictions[0]["domain"] == "RET12"


def test_keyword_classifier_electronics():
    predictions = _classify_with_keywords("Mobile phone repair and laptop computer service")
    assert predictions[0]["domain"] == "RET14"


def test_keyword_classifier_home_kitchen():
    predictions = _classify_with_keywords("Wooden furniture and steel kitchen utensils")
    assert predictions[0]["domain"] == "RET16"


def test_keyword_classifier_health():
    predictions = _classify_with_keywords("Ayurvedic herbal medicine and organic wellness products")
    assert predictions[0]["domain"] == "RET18"


def test_keyword_classifier_returns_3_predictions():
    predictions = _classify_with_keywords("some random text about nothing specific")
    assert len(predictions) == 3
    for p in predictions:
        assert "domain" in p
        assert "confidence" in p


def test_keyword_classifier_confidence_floor():
    """Even with no matching keywords, top prediction has >= 0.10 confidence."""
    predictions = _classify_with_keywords("xyz abc 123 nothing relevant here")
    assert predictions[0]["confidence"] >= 0.10


def test_keyword_classifier_case_insensitive():
    lower = _classify_with_keywords("rice dal flour grocery")
    upper = _classify_with_keywords("RICE DAL FLOUR GROCERY")
    assert lower[0]["domain"] == upper[0]["domain"]


def test_classify_mse_description_returns_predictions():
    """Public API should return predictions in keyword mock mode."""
    predictions = classify_mse_description("We sell spices and dal wholesale", "en")
    assert len(predictions) == 3
    assert predictions[0]["domain"] in ("RET10", "RET12", "RET14", "RET16", "RET18")
