"""In-app notifications for MSE owners.

Every event that changes an enterprise's standing is triggered by somebody
else — an NSIC officer approves the registration, an officer allocates the
SNP, the classifier finishes a run. The owner was never told about any of it.
The concrete cost: an enterprise approved and allocated in July had a
Certificate of ONDC Onboarding Allocation waiting the whole time and no way
to learn it existed.

Copy is bilingual EN/HI and template-based — no AI call, matching
`explainer.py`. Titles and bodies are written into the row rather than
derived at read time, so a notification remains a faithful record of what the
owner was told even after the underlying enterprise changes.

Emitting must never break the action that triggered it: an officer's approval
is the authoritative act, and a failed notification insert is not a reason to
fail it. `notify()` therefore swallows and logs its own errors, and callers
add it to the same transaction the action already commits.
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session

from database import Notification

logger = logging.getLogger(__name__)

# Event → (title_en, title_hi, href). Bodies are built per-call because they
# carry specifics (the SNP name, the domain, the officer's note).
_EVENTS = {
    "registration_approved": (
        "Registration approved",
        "पंजीकरण स्वीकृत",
        "/match",
    ),
    "registration_rejected": (
        "Registration needs attention",
        "पंजीकरण पर ध्यान देने की आवश्यकता है",
        "/register",
    ),
    "snp_allocated": (
        "Seller Network Partner allocated",
        "विक्रेता नेटवर्क पार्टनर आवंटित",
        "/certificate",
    ),
    "classification_complete": (
        "Business category identified",
        "व्यवसाय श्रेणी पहचानी गई",
        "/match",
    ),
    "action_needed": (
        "Action needed to get ONDC-ready",
        "ONDC के लिए तैयार होने हेतु कार्रवाई आवश्यक",
        "/catalogue",
    ),
    # Platform news — a new capability shipping, or a change owners should
    # know about. Unlike the others this is not derived from one enterprise's
    # state, so its copy is supplied by the officer who broadcasts it.
    "announcement": (
        "What's new on MSMEMate",
        "MSMEMate पर नया क्या है",
        None,
    ),
}

# Events whose title is written by the sender rather than fixed by the event.
_CUSTOM_TITLE_EVENTS = {"announcement"}

# Events worth an email as well as a bell. Deliberately not all of them: a
# classification finishes on every re-run and a readiness nudge recomputes on
# every /match visit, so emailing those trains owners to mute the sender — and
# then the allocation email, the one that actually matters, gets missed too.
_EMAIL_EVENTS = {
    "registration_approved",
    "registration_rejected",
    "snp_allocated",
    "announcement",
}


def safe_notify(db: Session, *args, **kwargs) -> Optional["Notification"]:
    """`notify()` with a hard guarantee that it cannot raise.

    Call this from request handlers. The action that triggers a notification —
    an officer approving a registration, an officer allocating an SNP — is the
    authoritative act; the notification is a courtesy. A courtesy must never be
    able to fail an official decision, and guarding only inside `notify()` is
    not enough: an import error, a schema drift or a plain bug in the notifier
    would still propagate out and 500 the officer's request.
    """
    try:
        return notify(db, *args, **kwargs)
    except Exception:
        logger.exception("Notification emission failed — continuing with the action")
        return None


def notify(
    db: Session,
    mse_id: Optional[int],
    event: str,
    body_en: Optional[str] = None,
    body_hi: Optional[str] = None,
    href: Optional[str] = None,
    title_en: Optional[str] = None,
    title_hi: Optional[str] = None,
    background_tasks=None,
    email_to: Optional[str] = None,
    business_name: Optional[str] = None,
) -> Optional[Notification]:
    """Queue one notification on the caller's existing transaction.

    Does NOT commit — the caller owns the transaction, so the notification
    lands atomically with the action that caused it or not at all. Returns the
    pending row, or None if it could not be built (never raises).

    Pass `background_tasks` + `email_to` to also send the email copy. It goes
    out after the response, so a slow or failing mail provider can never delay
    or fail an officer's decision. Only `_EMAIL_EVENTS` are emailed.
    """
    if not mse_id or event not in _EVENTS:
        if event not in _EVENTS:
            logger.warning("notify() called with unknown event %r", event)
        return None

    default_title_en, default_title_hi, default_href = _EVENTS[event]
    resolved_title_en = title_en or default_title_en
    resolved_title_hi = title_hi or default_title_hi
    resolved_href = href or default_href

    try:
        row = Notification(
            mse_id=mse_id,
            event=event,
            title_en=resolved_title_en,
            title_hi=resolved_title_hi,
            body_en=body_en,
            body_hi=body_hi,
            href=resolved_href,
        )
        db.add(row)
    except Exception:  # pragma: no cover — defensive, see module docstring
        logger.exception("Failed to queue notification %r for MSE %s", event, mse_id)
        return None

    if background_tasks is not None and email_to and event in _EMAIL_EVENTS:
        try:
            from services.email import send_notification_email

            background_tasks.add_task(
                send_notification_email,
                to_email=email_to,
                title=resolved_title_en,
                body=body_en or "",
                href=resolved_href,
                business_name=business_name,
                title_hi=resolved_title_hi,
                body_hi=body_hi,
            )
        except Exception:  # pragma: no cover — mail must never break the action
            logger.exception("Could not queue notification email for MSE %s", mse_id)

    return row


# ── Body builders ────────────────────────────────────────────────────
# Kept here so the wording of an event lives in one place rather than being
# spelled out at each call site.


def registration_reviewed(approved: bool, note: Optional[str] = None):
    """(event, body_en, body_hi) for an officer's approve/reject decision."""
    if approved:
        return (
            "registration_approved",
            "An NSIC officer has verified and approved your enterprise. "
            "The next step is your Seller Network Partner allocation."
            + (f" Officer note: {note}" if note else ""),
            "NSIC अधिकारी ने आपके उद्यम को सत्यापित और स्वीकृत कर दिया है। "
            "अगला चरण आपका विक्रेता नेटवर्क पार्टनर आवंटन है।",
        )
    return (
        "registration_rejected",
        "Your registration could not be approved as submitted."
        + (f" Officer note: {note}" if note else "")
        + " You can update your details and submit again.",
        "आपका पंजीकरण प्रस्तुत रूप में स्वीकृत नहीं हो सका। "
        "आप अपना विवरण अद्यतन कर पुनः प्रस्तुत कर सकते हैं।",
    )


def snp_allocated(snp_name: str):
    """(event, body_en, body_hi) for an official allocation."""
    return (
        "snp_allocated",
        f"You have been officially allocated to {snp_name} for ONDC "
        "onboarding. Your Certificate of ONDC Onboarding Allocation is now "
        "available to view and print.",
        f"ONDC ऑनबोर्डिंग के लिए आपको आधिकारिक रूप से {snp_name} को आवंटित "
        "किया गया है। आपका प्रमाणपत्र अब देखने और प्रिंट करने के लिए उपलब्ध है।",
    )


def classification_complete(domain_name: str, band: str):
    """(event, body_en, body_hi) for a finished classification run."""
    confidence = {"green": "high", "yellow": "medium", "red": "low"}.get(band, band)
    confidence_hi = {"green": "उच्च", "yellow": "मध्यम", "red": "निम्न"}.get(band, band)
    return (
        "classification_complete",
        f"Your business has been categorised under {domain_name} with "
        f"{confidence} confidence. You can now see the Seller Network "
        "Partners matched to it.",
        f"आपके व्यवसाय को {domain_name} श्रेणी में {confidence_hi} विश्वास के "
        "साथ वर्गीकृत किया गया है। अब आप इससे मेल खाने वाले विक्रेता नेटवर्क "
        "पार्टनर देख सकते हैं।",
    )


def action_needed(nudges: list[str]):
    """(event, body_en, body_hi) for JodakAI readiness nudges.

    Returns None when there is nothing to nudge about — an empty notification
    is worse than none, because it teaches owners to ignore the bell.
    """
    items = [n for n in (nudges or []) if n]
    if not items:
        return None
    return (
        "action_needed",
        "To improve your ONDC readiness: " + "; ".join(items[:3]) + ".",
        "अपनी ONDC तैयारी बेहतर करने के लिए: " + "; ".join(items[:3]) + "।",
    )
