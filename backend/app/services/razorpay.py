from fastapi import HTTPException
import base64
import hashlib
import hmac
import json
import urllib.error
import urllib.request
from app.core.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_CURRENCY

RAZORPAY_API_BASE = "https://api.razorpay.com/v1"

def get_razorpay_credentials():
    key_id = RAZORPAY_KEY_ID
    key_secret = RAZORPAY_KEY_SECRET
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=503,
            detail="Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the backend environment."
        )
    if not key_id.startswith(("rzp_test_", "rzp_live_")):
        raise HTTPException(
            status_code=503,
            detail="Razorpay key id is invalid. It should start with rzp_test_ or rzp_live_."
        )
    return key_id, key_secret

def call_razorpay_api(method: str, path: str, payload: dict | None = None):
    key_id, key_secret = get_razorpay_credentials()
    request_data = json.dumps(payload or {}).encode("utf-8") if payload is not None else None
    auth_token = base64.b64encode(f"{key_id}:{key_secret}".encode("utf-8")).decode("utf-8")
    request = urllib.request.Request(
        f"{RAZORPAY_API_BASE}{path}",
        data=request_data,
        method=method,
        headers={
            "Authorization": f"Basic {auth_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        message = exc.reason
        try:
            body = json.loads(exc.read().decode("utf-8"))
            message = body.get("error", {}).get("description") or message
        except Exception:
            pass
        if "authentication failed" in str(message).lower():
            raise HTTPException(
                status_code=502,
                detail="Razorpay authentication failed. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are copied from the same Razorpay account and same mode, either both test or both live, then restart the backend."
            )
        raise HTTPException(status_code=502, detail=f"Razorpay error: {message}")
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Razorpay: {exc.reason}")

def build_razorpay_signature(order_id: str, payment_id: str):
    _, key_secret = get_razorpay_credentials()
    payload = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
