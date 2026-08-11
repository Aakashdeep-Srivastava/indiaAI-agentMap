"""Transactional email — Azure Communication Services (primary) + SMTP fallback.

Delivery order, first configured path wins:
  1. Azure Communication Services (ACS) Email  — the Azure-native service.
  2. SMTP relay  — any provider (Zoho, Brevo, MSG91, SES, Gmail app-password,
     or ACS's own SMTP endpoint). Provider-agnostic.
  3. No-op       — logged and skipped, so registration still succeeds and the
     one-time passcode remains shown on-screen.

Email transport is NOT an AI service, so the Sovereign-AI mandate does not
constrain the provider. NEVER commit credentials — this repo is public; all
settings come from environment variables (Azure App Service → Configuration).

Env vars
--------
Azure Communication Services (recommended):
  ACS_CONNECTION_STRING   connection string from the ACS resource (secret).
  ACS_SENDER_ADDRESS      verified MailFrom, e.g. DoNotReply@<your-domain>
                          or DoNotReply@<guid>.azurecomm.net (Azure-managed).

SMTP fallback (used only if ACS is not configured):
  SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASSWORD,
  SMTP_FROM (default SMTP_USER), SMTP_FROM_NAME ("MSMEMate"),
  SMTP_USE_SSL ("false" → STARTTLS on 587; "true" → implicit TLS on 465),
  SMTP_TIMEOUT (15).

Shared:
  APP_LOGIN_URL           sign-in URL used in the email CTA.
"""

import html
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

logger = logging.getLogger(__name__)

# ── Azure Communication Services ──────────────────────────────────────
ACS_CONNECTION_STRING = os.getenv("ACS_CONNECTION_STRING", "")
ACS_SENDER_ADDRESS = os.getenv("ACS_SENDER_ADDRESS", "")

# ── SMTP fallback ─────────────────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or SMTP_USER
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "MSMEMate")
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
SMTP_TIMEOUT = float(os.getenv("SMTP_TIMEOUT", "15"))

APP_LOGIN_URL = os.getenv("APP_LOGIN_URL", "https://www.msmemate.com/login")


def acs_configured() -> bool:
    return bool(ACS_CONNECTION_STRING and ACS_SENDER_ADDRESS)


def smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM)


def is_configured() -> bool:
    """True when any delivery path is configured."""
    return acs_configured() or smtp_configured()


def active_provider() -> str:
    """Which path a send would take right now — for /health and diagnostics."""
    if acs_configured():
        return "azure-communication-services"
    if smtp_configured():
        return "smtp"
    return "none"


def send_email(to: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    """Send one email via the first configured provider.

    Returns True on success, False on any failure or when unconfigured — never
    raises, so a mail outage can never break the caller (registration must still
    succeed even if the passcode email bounces).
    """
    if not to:
        logger.warning("send_email called with empty recipient — skipping")
        return False

    if acs_configured():
        return _send_acs(to, subject, text_body, html_body)
    if smtp_configured():
        return _send_smtp(to, subject, text_body, html_body)

    logger.info("Email not configured — skipping email to %s (subject: %s)", to, subject)
    return False


def _send_acs(to: str, subject: str, text_body: str, html_body: str | None) -> bool:
    """Send via Azure Communication Services Email."""
    try:
        from azure.communication.email import EmailClient

        client = EmailClient.from_connection_string(ACS_CONNECTION_STRING)
        message = {
            "senderAddress": ACS_SENDER_ADDRESS,
            "recipients": {"to": [{"address": to}]},
            "content": {
                "subject": subject,
                "plainText": text_body,
                "html": html_body or "",
            },
        }
        poller = client.begin_send(message)
        result = poller.result()
        status = (result.get("status") if isinstance(result, dict) else getattr(result, "status", None))
        logger.info("ACS email to %s → status=%s (subject: %s)", to, status, subject)
        return str(status).lower() in ("succeeded", "outfordelivery", "running")
    except Exception as e:  # noqa: BLE001 — mail must never break the request
        logger.error("ACS email to %s failed: %s", to, e)
        return False


def _send_smtp(to: str, subject: str, text_body: str, html_body: str | None) -> bool:
    """Send via an SMTP relay (fallback / any provider)."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM))
    msg["To"] = to
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        if SMTP_USE_SSL:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT, context=context) as server:
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        logger.info("SMTP email sent to %s (subject: %s)", to, subject)
        return True
    except Exception as e:  # noqa: BLE001 — mail must never break the request
        logger.error("SMTP email to %s failed: %s", to, e)
        return False


def send_notification_email(
    to_email: str,
    title: str,
    body: str,
    href: str | None = None,
    business_name: str | None = None,
    title_hi: str | None = None,
    body_hi: str | None = None,
) -> bool:
    """Email the significant in-app notifications (EN + HI in one message).

    Only the events an owner would want to be interrupted for are sent here —
    approval, rejection, allocation and platform announcements. Routine ones
    (a classification finishing, a readiness nudge that recomputes on every
    visit) stay in-app, because an inbox that fills with noise gets muted, and
    then the allocation email gets missed too.
    """
    who = business_name or "there"
    link = f"https://www.msmemate.com{href}" if href and href.startswith("/") else (href or APP_LOGIN_URL)

    # Escape everything before it reaches html_body. The broadcast endpoint
    # constrains `href` to an in-app path precisely so an announcement cannot
    # carry an off-site link — but `body_en` has no character constraint, so
    # raw interpolation would let an anchor tag in the body defeat that check
    # entirely and mail a live off-site link from the platform's own verified
    # sender. Escaping is what actually enforces the intent.
    #
    # The plaintext branch is deliberately left unescaped: it is not markup,
    # and escaping there would show owners literal &amp; in their email.
    e_title = html.escape(title)
    e_body = html.escape(body)
    e_link = html.escape(link, quote=True)
    e_title_hi = html.escape(title_hi) if title_hi else ""
    e_body_hi = html.escape(body_hi) if body_hi else ""

    text_body = (
        f"Namaste {who},\n\n"
        f"{title}\n\n"
        f"{body}\n\n"
        f"View it here: {link}\n\n"
    )
    if title_hi or body_hi:
        text_body += f"--\n{title_hi or ''}\n{body_hi or ''}\n\n"
    text_body += "MSMEMate — Bridging Bharat's Businesses\n"

    hindi_block = ""
    if title_hi or body_hi:
        hindi_block = (
            '<p style="margin:20px 0 0;font-size:12px;line-height:1.7;color:#9EA5BE">'
            f'<b>{e_title_hi}</b><br/>{e_body_hi}</p>'
        )

    html_body = f"""\
<!doctype html>
<html>
  <body style="margin:0;background:#F8F9FC;font-family:'Segoe UI',Arial,sans-serif;color:#4A5170;">
    <div style="height:3px;display:flex">
      <span style="flex:1;background:#FF9933"></span>
      <span style="flex:1;background:#FFFFFF"></span>
      <span style="flex:1;background:#138808"></span>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:28px 16px">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="max-width:480px;background:#ffffff;border:1px solid #E4E7F1;border-radius:16px;overflow:hidden">
          <tr><td style="background:#0B1437;padding:22px 28px">
            <span style="font-size:20px;font-weight:800;color:#FFA942">MSME<span style="color:#fff">Mate</span></span>
          </td></tr>
          <tr><td style="padding:28px">
            <h1 style="margin:0 0 12px;font-size:19px;color:#0B1437">{e_title}</h1>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.7">{e_body}</p>
            <a href="{e_link}"
               style="display:inline-block;background:#1B4FCC;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:12px">
              Open MSMEMate &rarr;
            </a>
            {hindi_block}
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #E4E7F1;font-size:11px;color:#9EA5BE">
            MSMEMate — Bridging Bharat's Businesses
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""

    return send_email(to_email, title, text_body, html_body)


def send_registration_passcode(
    to_email: str,
    login_id: str,
    passcode: str,
    business_name: str | None = None,
    entrepreneur_name: str | None = None,
) -> bool:
    """Email a freshly-registered MSE their one-time login ID + passcode (EN/HI)."""
    who = entrepreneur_name or business_name or "there"
    biz = business_name or "your enterprise"

    subject = "Your MSMEMate login — आपका MSMEMate लॉगिन"

    text_body = (
        f"Namaste {who},\n\n"
        f"Your enterprise \"{biz}\" has been registered on MSMEMate and is now "
        f"with NSIC for confirmation.\n\n"
        f"Sign in to see your AI classification and seller-platform matches:\n\n"
        f"    Login ID : {login_id}\n"
        f"    Passcode : {passcode}\n\n"
        f"Sign in here: {APP_LOGIN_URL}\n\n"
        f"Please keep this passcode safe — it is shown to you only once.\n\n"
        f"--\n"
        f"नमस्ते {who},\n"
        f"आपका उद्यम MSMEMate पर रजिस्टर हो गया है। ऊपर दिए गए लॉगिन ID और पासकोड से "
        f"साइन इन करें। कृपया इस पासकोड को संभालकर रखें।\n\n"
        f"MSMEMate — Bridging Bharat's Businesses\n"
    )

    html_body = f"""\
<!doctype html>
<html>
  <body style="margin:0;background:#F8F9FC;font-family:'Segoe UI',Arial,sans-serif;color:#4A5170;">
    <div style="height:3px;display:flex">
      <span style="flex:1;background:#FF9933"></span>
      <span style="flex:1;background:#FFFFFF"></span>
      <span style="flex:1;background:#138808"></span>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:28px 16px">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="max-width:480px;background:#ffffff;border:1px solid #E4E7F1;border-radius:16px;overflow:hidden">
          <tr><td style="background:#0B1437;padding:22px 28px">
            <span style="font-size:20px;font-weight:800;color:#FFA942">MSME<span style="color:#fff">Mate</span></span>
          </td></tr>
          <tr><td style="padding:28px">
            <h1 style="margin:0 0 6px;font-size:19px;color:#0B1437">Namaste {who},</h1>
            <p style="margin:0 0 18px;font-size:14px;line-height:1.6">
              Your enterprise <b>{biz}</b> has been registered on MSMEMate and is now
              with NSIC for confirmation. Use the credentials below to sign in.
            </p>
            <div style="border:1px solid rgba(232,104,12,0.35);background:rgba(232,104,12,0.05);border-radius:12px;padding:16px 18px;margin-bottom:18px">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#E8680C">
                Your login — save this now (shown only once)
              </p>
              <p style="margin:0;font-family:'Courier New',monospace;font-size:15px;color:#0B1437">
                ID: <b>{login_id}</b>
              </p>
              <p style="margin:2px 0 0;font-family:'Courier New',monospace;font-size:15px;color:#0B1437">
                Passcode: <b style="letter-spacing:.12em">{passcode}</b>
              </p>
            </div>
            <a href="{APP_LOGIN_URL}"
               style="display:inline-block;background:#1B4FCC;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:12px">
              Sign in to continue &rarr;
            </a>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#9EA5BE">
              नमस्ते {who}, आपका उद्यम MSMEMate पर रजिस्टर हो गया है। ऊपर दिए गए लॉगिन ID और
              पासकोड से साइन इन करें। कृपया इस पासकोड को संभालकर रखें — यह केवल एक बार दिखाया जाता है।
            </p>
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid #E4E7F1;font-size:11px;color:#9EA5BE">
            MSMEMate — Bridging Bharat's Businesses
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""

    return send_email(to_email, subject, text_body, html_body)
