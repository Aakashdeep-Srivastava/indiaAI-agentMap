"""In-app notifications — scoping, triggers, and the read lifecycle.

The security property under test is isolation: a notification names an
enterprise's approval status, its allocated SNP and its officer's notes, so
the feed must be scoped by the authenticated user's own mse_id and never by
anything the client supplies.

Per the suite-wide constraint (see conftest), this may run against a shared,
fully-seeded database. Every assertion below is therefore scoped to rows the
test itself created — never a global count.
"""

import pytest

from database import MSE, Notification, User


@pytest.fixture
def owned_mse(db_session):
    """An enterprise with a signed-in owner — get-or-create, per conftest."""
    mse = db_session.query(MSE).filter_by(udyam_number="UDYAM-NOTIF-001").first()
    if mse is None:
        mse = MSE(
            udyam_number="UDYAM-NOTIF-001",
            name="Notify Test Traders",
            description="Handloom sarees and cotton dupattas sold wholesale",
            district="Varanasi",
            state="Uttar Pradesh",
            language="en",
            email="notify-test@example.invalid",
        )
        db_session.add(mse)
        db_session.flush()
    return mse


@pytest.fixture
def other_mse(db_session):
    """A second enterprise — the one the first must never be able to read."""
    mse = db_session.query(MSE).filter_by(udyam_number="UDYAM-NOTIF-002").first()
    if mse is None:
        mse = MSE(
            udyam_number="UDYAM-NOTIF-002",
            name="Other Enterprise",
            description="Brass utensils and pooja items",
            district="Moradabad",
            state="Uttar Pradesh",
            language="en",
        )
        db_session.add(mse)
        db_session.flush()
    return mse


@pytest.fixture
def owner_client(client, db_session, owned_mse):
    """Authenticated as the owner of `owned_mse` (role=mse, linked mse_id)."""
    from main import app
    from services.auth import get_current_user, get_optional_user

    user = User(
        id=9101,
        username="notify-owner@example.invalid",
        role="mse",
        hashed_password="not-used",
        is_active=True,
        mse_id=owned_mse.id,
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_optional_user] = lambda: user
    return client


def _seed(db_session, mse_id, event="registration_approved", read=False):
    row = Notification(
        mse_id=mse_id,
        event=event,
        title_en="Test notification",
        title_hi="परीक्षण सूचना",
        body_en="Body text",
        href="/match",
        is_read=read,
    )
    db_session.add(row)
    db_session.flush()
    return row


# ── Scoping ──────────────────────────────────────────────────────────


def test_feed_returns_only_the_callers_own_notifications(
    owner_client, db_session, owned_mse, other_mse
):
    mine = _seed(db_session, owned_mse.id)
    theirs = _seed(db_session, other_mse.id)

    res = owner_client.get("/notifications/")
    assert res.status_code == 200

    ids = {i["id"] for i in res.json()["items"]}
    assert mine.id in ids
    assert theirs.id not in ids, "another enterprise's notification leaked into the feed"


def test_client_supplied_mse_id_is_ignored_for_mse_users(
    owner_client, db_session, owned_mse, other_mse
):
    """The id on the token wins. Honouring the query param would turn the feed
    into an enumeration oracle over every enterprise on the platform."""
    theirs = _seed(db_session, other_mse.id)

    res = owner_client.get(f"/notifications/?mse_id={other_mse.id}")
    assert res.status_code == 200
    assert theirs.id not in {i["id"] for i in res.json()["items"]}


def test_marking_another_enterprises_notification_returns_404(
    owner_client, db_session, other_mse
):
    """404 rather than 403 — a 403 would confirm the row exists."""
    theirs = _seed(db_session, other_mse.id)

    res = owner_client.post(f"/notifications/{theirs.id}/read")
    assert res.status_code == 404
    assert db_session.query(Notification).get(theirs.id).is_read is False


def test_admin_without_mse_id_gets_an_empty_feed_not_an_error(admin_client):
    """The bell is chrome on every portal page — it must never error there."""
    res = admin_client.get("/notifications/")
    assert res.status_code == 200
    assert res.json() == {"items": [], "unread": 0}


def test_anonymous_callers_are_rejected(client):
    assert client.get("/notifications/").status_code in (401, 403)


# ── Read lifecycle ───────────────────────────────────────────────────


def test_unread_count_reflects_only_own_unread(
    owner_client, db_session, owned_mse, other_mse
):
    _seed(db_session, owned_mse.id, read=False)
    _seed(db_session, owned_mse.id, read=True)
    _seed(db_session, other_mse.id, read=False)

    body = owner_client.get("/notifications/").json()
    own_unread = [i for i in body["items"] if not i["is_read"]]
    assert body["unread"] == len(own_unread)


def test_mark_read_sets_the_flag_and_timestamp(owner_client, db_session, owned_mse):
    row = _seed(db_session, owned_mse.id)

    res = owner_client.post(f"/notifications/{row.id}/read")
    assert res.status_code == 200
    assert res.json()["is_read"] is True

    db_session.refresh(row)
    assert row.is_read is True
    assert row.read_at is not None


def test_read_all_clears_only_the_callers_unread(
    owner_client, db_session, owned_mse, other_mse
):
    _seed(db_session, owned_mse.id)
    _seed(db_session, owned_mse.id)
    theirs = _seed(db_session, other_mse.id)

    res = owner_client.post("/notifications/read-all")
    assert res.status_code == 200
    assert res.json()["updated"] >= 2

    assert owner_client.get("/notifications/").json()["unread"] == 0
    db_session.refresh(theirs)
    assert theirs.is_read is False, "read-all crossed an enterprise boundary"


def test_unread_only_filter(owner_client, db_session, owned_mse):
    unread = _seed(db_session, owned_mse.id, read=False)
    read = _seed(db_session, owned_mse.id, read=True)

    ids = {i["id"] for i in owner_client.get("/notifications/?unread_only=true").json()["items"]}
    assert unread.id in ids
    assert read.id not in ids


# ── Triggers ─────────────────────────────────────────────────────────


def test_officer_approval_notifies_the_owner(admin_client, db_session, owned_mse):
    before = _notif_ids(db_session, owned_mse.id)

    res = admin_client.post(
        f"/mse/{owned_mse.id}/review",
        json={"action": "approve", "note": "Verified against Udyam records"},
    )
    assert res.status_code == 200

    new = _new_notifications(db_session, owned_mse.id, before)
    assert [n.event for n in new] == ["registration_approved"]
    assert new[0].title_hi, "Hindi copy missing — the audience is bilingual"


def test_officer_rejection_notifies_the_owner(admin_client, db_session, owned_mse):
    before = _notif_ids(db_session, owned_mse.id)

    res = admin_client.post(
        f"/mse/{owned_mse.id}/review", json={"action": "reject", "note": "Udyam mismatch"}
    )
    assert res.status_code == 200

    new = _new_notifications(db_session, owned_mse.id, before)
    assert [n.event for n in new] == ["registration_rejected"]


def test_allocation_notifies_and_links_to_the_certificate(
    admin_client, db_session, owned_mse, seed_snps
):
    """The whole point: an allocated owner must be told the certificate exists.

    Until this shipped, nothing on the platform announced it and no page
    linked there from the enterprise side.
    """
    owned_mse.status = "approved"
    db_session.flush()
    before = _notif_ids(db_session, owned_mse.id)

    res = admin_client.post(
        f"/mse/{owned_mse.id}/allocate", json={"snp_id": seed_snps[0].id}
    )
    assert res.status_code == 200

    new = _new_notifications(db_session, owned_mse.id, before)
    allocated = [n for n in new if n.event == "snp_allocated"]
    assert len(allocated) == 1
    assert allocated[0].href == "/certificate"
    assert seed_snps[0].name in (allocated[0].body_en or "")


def test_a_failed_notification_never_blocks_the_officers_decision(
    admin_client, db_session, owned_mse, monkeypatch
):
    """The officer's approval is the authoritative act. A notification is a
    courtesy, and a courtesy must not be able to fail an official decision.

    Breaks the notifier at its source (`services.notifications.notify`) rather
    than the route's imported name, so what is under test is the `safe_notify`
    guard itself — patching the guard away would prove nothing.
    """
    import services.notifications as notif

    def boom(*a, **kw):
        raise RuntimeError("notification backend down")

    monkeypatch.setattr(notif, "notify", boom)

    res = admin_client.post(f"/mse/{owned_mse.id}/review", json={"action": "approve"})
    assert res.status_code == 200, "a broken notifier took down the review endpoint"

    db_session.refresh(owned_mse)
    assert owned_mse.status == "approved", "the officer's decision was lost"


# ── Broadcast (feature-launch announcements) ─────────────────────────


def test_broadcast_reaches_enterprises_with_a_login(
    admin_client, db_session, owned_mse, owner_client
):
    # owner_client's fixture links a user to owned_mse via dependency override,
    # but broadcast joins the real users table — so persist the link.
    user = db_session.query(User).filter_by(username="broadcast-owner@example.invalid").first()
    if user is None:
        db_session.add(User(
            username="broadcast-owner@example.invalid",
            role="mse",
            hashed_password="not-used",
            is_active=True,
            mse_id=owned_mse.id,
        ))
        db_session.flush()

    before = _notif_ids(db_session, owned_mse.id)
    res = admin_client.post(
        "/notifications/broadcast",
        json={
            "title_en": "Certificates are now available in-app",
            "body_en": "Allocated enterprises can view and print their certificate.",
            "title_hi": "प्रमाणपत्र अब ऐप में उपलब्ध हैं",
            "href": "/certificate",
        },
    )
    assert res.status_code == 200
    assert res.json()["notified"] >= 1
    # Email is opt-in per broadcast and was not requested here.
    assert res.json()["emailed"] == 0

    new = _new_notifications(db_session, owned_mse.id, before)
    assert any(n.event == "announcement" for n in new)
    assert any(n.href == "/certificate" for n in new)


def test_broadcast_rejects_an_unknown_audience(admin_client):
    res = admin_client.post(
        "/notifications/broadcast",
        json={"title_en": "x", "body_en": "y", "audience": "everyone-ever"},
    )
    assert res.status_code == 422


def test_broadcast_is_admin_only(owner_client):
    res = owner_client.post(
        "/notifications/broadcast", json={"title_en": "x", "body_en": "y"}
    )
    assert res.status_code == 403


def test_broadcast_href_must_be_an_in_app_path(admin_client):
    """An announcement is mailed from the platform's verified sender, so an
    off-site href would be a phishing link with our branding on it.

    `//host` is the case a naive startswith('/') check misses — browsers read
    it as protocol-relative and follow it off-site.
    """
    for bad in ["https://evil.example", "//evil", "javascript:alert(1)"]:
        res = admin_client.post(
            "/notifications/broadcast",
            json={"title_en": "News", "body_en": "Body", "href": bad},
        )
        assert res.status_code == 422, f"href {bad!r} should have been rejected"


# ── Cross-enterprise write protection ────────────────────────────────


def test_cannot_classify_another_enterprise(owner_client, other_mse):
    """Registration is public, so an mse token proves nothing about ownership.

    Before this check, any registered user could reclassify a stranger's record
    and push a notification into that owner's feed.
    """
    res = owner_client.post("/classify/", json={"mse_id": other_mse.id})
    assert res.status_code == 404, "classified an enterprise the caller does not own"


def test_cannot_match_another_enterprise(owner_client, other_mse, seed_snps):
    res = owner_client.post("/match/", json={"mse_id": other_mse.id})
    assert res.status_code == 404, "matched an enterprise the caller does not own"


def test_a_cross_enterprise_call_writes_no_notification(
    owner_client, db_session, other_mse, seed_snps
):
    """The point of the check: nothing reaches the victim's bell."""
    before = _notif_ids(db_session, other_mse.id)

    owner_client.post("/match/", json={"mse_id": other_mse.id})
    owner_client.post("/classify/", json={"mse_id": other_mse.id})

    assert _new_notifications(db_session, other_mse.id, before) == [], (
        "a stranger posted into another enterprise's notification feed"
    )


def test_officers_may_still_act_on_any_enterprise(admin_client, other_mse, seed_snps):
    """Cross-enterprise access is an officer's job — the fix must not break it."""
    res = admin_client.post("/match/", json={"mse_id": other_mse.id})
    assert res.status_code == 200


# ── Helpers ──────────────────────────────────────────────────────────


def _notif_ids(db_session, mse_id) -> set[int]:
    """Baseline snapshot — the shared DB may already hold rows for this MSE."""
    return {
        n.id for n in db_session.query(Notification).filter_by(mse_id=mse_id).all()
    }


def _new_notifications(db_session, mse_id, before: set[int]) -> list[Notification]:
    rows = db_session.query(Notification).filter_by(mse_id=mse_id).all()
    return [n for n in rows if n.id not in before]
