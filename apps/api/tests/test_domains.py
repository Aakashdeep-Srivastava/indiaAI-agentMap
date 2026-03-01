"""Tests for domain taxonomy routes (/domains)."""


def test_list_domains_empty(client):
    resp = client.get("/domains/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_domains_with_categories(client, seed_domains):
    resp = client.get("/domains/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 5

    grocery = next(d for d in data if d["code"] == "RET10")
    assert grocery["name"] == "Grocery"
    assert len(grocery["categories"]) >= 1
    assert grocery["categories"][0]["code"] == "RET10-001"


def test_list_domains_sorted_by_code(client, seed_domains):
    resp = client.get("/domains/")
    codes = [d["code"] for d in resp.json()]
    assert codes == sorted(codes)
