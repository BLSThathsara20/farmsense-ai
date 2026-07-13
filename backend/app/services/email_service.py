"""Transactional email via Resend (free tier: https://resend.com).

Without RESEND_API_KEY the link is logged and returned in development
so forgot-password still works for local demos.
"""

from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_password_reset_email(*, to_email: str, reset_url: str, name: str | None = None) -> dict:
    """Send reset email. Returns { sent: bool, provider: str, error?: str }."""
    settings = get_settings()
    greeting = name.split()[0] if name else "there"
    subject = "Reset your FarmSense password"
    html = f"""
    <div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;color:#18181b">
      <h1 style="font-size:20px;margin-bottom:8px">Reset your password</h1>
      <p style="color:#52525b;line-height:1.5">Hi {greeting},</p>
      <p style="color:#52525b;line-height:1.5">
        We received a request to reset your FarmSense AI account password.
        Click the button below — this link expires in {settings.password_reset_expire_minutes} minutes.
      </p>
      <p style="margin:28px 0">
        <a href="{reset_url}"
           style="background:#18181b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Reset password
        </a>
      </p>
      <p style="color:#71717a;font-size:13px;line-height:1.5">
        Or paste this link into your browser:<br/>
        <a href="{reset_url}" style="color:#2563eb;word-break:break-all">{reset_url}</a>
      </p>
      <p style="color:#a1a1aa;font-size:12px;margin-top:32px">
        If you did not request this, you can ignore this email.
      </p>
    </div>
    """
    text = (
        f"Hi {greeting},\n\n"
        f"Reset your FarmSense password (expires in {settings.password_reset_expire_minutes} minutes):\n"
        f"{reset_url}\n\n"
        "If you did not request this, ignore this email.\n"
    )

    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — password reset email not sent. Link: %s", reset_url)
        return {"sent": False, "provider": "console", "error": "RESEND_API_KEY not configured"}

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.email_from,
                "to": [to_email],
                "subject": subject,
                "html": html,
                "text": text,
            },
            timeout=15.0,
        )
        if response.status_code >= 400:
            detail = response.text
            logger.error("Resend failed (%s): %s", response.status_code, detail)
            return {"sent": False, "provider": "resend", "error": detail}
        return {"sent": True, "provider": "resend", "id": response.json().get("id")}
    except Exception as exc:
        logger.exception("Failed to send reset email")
        return {"sent": False, "provider": "resend", "error": str(exc)}
