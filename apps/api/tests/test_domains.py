"""Tests for domain taxonomy routes (/domains)."""


def test_list_domains_is_public(client):
    """The taxonomy is reference data — no session needed to read it."""
    resp = client.get("/domains/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_domains_with_categories(client, seed_domains):
    resp = client.get("/domains/")
    assert resp.status_code == 200
    data = resp.json()
    # The shared DB carries the full 14-domain ONDC taxonomy, so assert the
    # seeded domains are present rather than pinning an exact count.
    codes = {d["code"] for d in data}
    assert {"RET10", "RET12", "RET14", "RET16", "RET18"} <= codes

    grocery = next(d for d in data if d["code"] == "RET10")
    assert grocery["categories"], "RET10 must expose its leaf categories"
    assert "RET10-001" in {c["code"] for c in grocery["categories"]}


def test_list_domains_sorted_by_code(client, seed_domains):
    resp = client.get("/domains/")
    codes = [d["code"] for d in resp.json()]
    assert codes == sorted(codes)
