"""Unit tests for the explainer service."""

from types import SimpleNamespace

from services.explainer import generate_explainer, _label


def _make_scores(**overrides):
    defaults = {
        "domain": 0.8,
        "geo": 0.6,
        "commission": 0.5,
        "history": 0.7,
        "sentiment": 0.6,
        "composite": 0.65,
    }
    defaults.update(overrides)
    return defaults


def test_generate_explainer_returns_both_languages():
    mse = SimpleNamespace(name="Test MSE")
    snp = SimpleNamespace(name="Test SNP", commission_pct=5.0)
    result = generate_explainer(mse, snp, _make_scores(), "yellow")
    assert "en" in result
    assert "hi" in result
    assert len(result["en"]) > 0
    assert len(result["hi"]) > 0


def test_generate_explainer_contains_names():
    mse = SimpleNamespace(name="My Kirana Shop")
    snp = SimpleNamespace(name="GroceryMart India", commission_pct=3.0)
    result = generate_explainer(mse, snp, _make_scores(), "green")
    assert "GroceryMart India" in result["en"]
    assert "My Kirana Shop" in result["en"]


def test_generate_explainer_green_band():
    mse = SimpleNamespace(name="MSE")
    snp = SimpleNamespace(name="SNP", commission_pct=3.0)
    result = generate_explainer(mse, snp, _make_scores(), "green")
    assert "High" in result["en"]
    assert "उच्च" in result["hi"]


def test_label_boundaries():
    # Domain labels
    en, hi = _label("domain", 0.9)
    assert en == "strong"

    en, hi = _label("domain", 0.5)
    assert en == "moderate"

    en, hi = _label("domain", 0.2)
    assert en == "weak"
