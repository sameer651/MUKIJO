import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USER = os.getenv("EMAIL_USER", "sameerjansayed05@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "fylodmkaarbeyllt")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_verification_email(to_email: str, token: str):
    verify_link = f"http://192.168.1.30:8000/verify?token={token}"

    msg = EmailMessage()
    msg["Subject"] = "Verify your Mukijo Club Email"
    msg["From"] = EMAIL_USER
    msg["To"] = to_email

    msg.set_content(f"Click this link to verify your email: {verify_link}")

    msg.add_alternative(f"""
    <html>
      <body style="font-family: Arial; background:#f4f4f4; padding:30px;">
        <div style="max-width:500px; margin:auto; background:white; padding:25px; border-radius:10px; text-align:center;">
          <h2>Verify your email</h2>
          <p>Thank you for registering with Mukijo Club.</p>
          <p>Click the button below to verify your email.</p>

          <a href="{verify_link}"
             style="display:inline-block; padding:12px 20px; background:#2563eb; color:white; text-decoration:none; border-radius:6px;">
             Verify Email
          </a>

          <p style="margin-top:25px; font-size:13px; color:#777;">
            Already have an account? Log in
          </p>
        </div>
      </body>
    </html>
    """, subtype="html")

    with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)