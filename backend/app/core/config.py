import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

RAZORPAY_KEY_ID = (os.getenv("RAZORPAY_KEY_ID") or "").strip().strip('"').strip("'")
RAZORPAY_KEY_SECRET = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip().strip('"').strip("'")
RAZORPAY_CURRENCY = os.getenv("RAZORPAY_CURRENCY", "INR")

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USER = os.getenv("EMAIL_USER", "sameerjansayed05@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "fylodmkaarbeyllt")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
