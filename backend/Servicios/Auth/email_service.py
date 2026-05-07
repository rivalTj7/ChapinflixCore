# email_service.py
import ssl
import traceback
from email.message import EmailMessage
import sys

from config import get_settings

settings = get_settings()

def send_verification_email(email: str, username: str, verification_link: str) -> bool:
    """
    Send the verification email using Gmail SMTP + app password.
    Returns True if SMTP accepted the message; False otherwise.
    Always prints the verification link to console for dev convenience.
    """
    # Build message
    msg = EmailMessage()
    sender = f"{settings.email_from_name} <{settings.smtp_user}>"
    msg["From"] = sender
    msg["To"] = email
    msg["Subject"] = "Verify your email address"

    # Plain-text fallback
    msg.set_content(
        f"Welcome {username}!\n\nPlease verify your email:\n{verification_link}\n\nThis link expires in 24 hours."
    )

    # HTML body
    html = f"""
    <h2>Welcome {username}!</h2>
    <p>Please click the link below to verify your email address:</p>
    <a href="{verification_link}" style="background-color:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">
        Verify Email
    </a>
    <p>Or copy this link: {verification_link}</p>
    <p>This link will expire in 24 hours.</p>
    """
    msg.add_alternative(html, subtype="html")

    print(f"[Email] Attempt Gmail SMTP send -> to={email} from={sender}")

    try:
        context = ssl.create_default_context()
        # Gmail SMTP over implicit TLS (port 465). For STARTTLS use port 587.
        import smtplib
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
            server.login(settings.smtp_user, settings.smtp_pass.replace(" ", ""))  # strip spaces in app password
            server.send_message(msg)

        print(f"[Email] Sent via Gmail SMTP to {email}")
        # Always print link for dev convenience
        print(f"[DEV] Verification link for {email}: {verification_link}")
        return True

    except Exception as e:
        print("[Email] Gmail SMTP send FAILED")
        print(f"[Email] Exception: {e!r}")
        traceback.print_exc(file=sys.stdout)
        # Print the link so you can proceed in dev even if email failed
        print(f"[DEV-FALLBACK] Use this link to verify {email}: {verification_link}")
        return False
