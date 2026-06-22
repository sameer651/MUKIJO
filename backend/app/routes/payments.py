from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime
import json

import os
import uuid
import hmac
from app.core.config import RAZORPAY_CURRENCY
from app.services.razorpay import call_razorpay_api, build_razorpay_signature, get_razorpay_credentials

from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.routes.helpers import *

PAYMENT_STATUSES = {"pending", "paid", "overdue", "cancelled"}

router = APIRouter()


@router.get("/payments/razorpay/config")
def get_razorpay_config():
    """Retrieve Razorpay payment gateway configuration details."""
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    return {
        "configured": bool(key_id and key_secret),
        "key_id": key_id if key_id and key_secret else None,
        "currency": RAZORPAY_CURRENCY,
        "name": "Mukijo Club",
    }

@router.post("/payments/razorpay/order", response_model=schemas.RazorpayOrderResponse)
def create_razorpay_payment_order(order_request: schemas.RazorpayOrderCreate, db: Session = Depends(get_db)):
    """Create a new Razorpay payment gateway order for a pending payment request."""
    key_id, _ = get_razorpay_credentials()
    payment = db.query(models.Payment).filter(
        models.Payment.id == order_request.payment_id,
        models.Payment.owner_id == order_request.owner_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")
    if payment.status == "paid":
        raise HTTPException(status_code=400, detail="This payment request is already paid")
    if payment.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled payment requests cannot be paid online")
    if payment.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    amount_in_paise = int(payment.amount * 100)
    receipt = f"mukijo_{payment.id}_{uuid.uuid4().hex[:10]}"
    razorpay_order = call_razorpay_api("POST", "/orders", {
        "amount": amount_in_paise,
        "currency": RAZORPAY_CURRENCY,
        "receipt": receipt,
        "notes": {
            "local_payment_id": str(payment.id),
            "owner_id": str(payment.owner_id),
            "category": payment.category or "Payment",
        },
    })

    gateway_order = models.PaymentGatewayOrder(
        payment_id=payment.id,
        owner_id=payment.owner_id,
        razorpay_order_id=razorpay_order["id"],
        amount=amount_in_paise,
        currency=razorpay_order.get("currency", RAZORPAY_CURRENCY),
        receipt=razorpay_order.get("receipt") or receipt,
        status=razorpay_order.get("status", "created"),
        raw_order=json.dumps(razorpay_order),
    )
    db.add(gateway_order)
    db.commit()
    db.refresh(gateway_order)

    member_name = None
    member_email = None
    member_phone = None
    if payment.member:
        member_name = f"{payment.member.first_name} {payment.member.last_name}".strip()
        member_email = payment.member.email
        member_phone = payment.member.phone

    return {
        "key_id": key_id,
        "razorpay_order_id": gateway_order.razorpay_order_id,
        "local_order_id": gateway_order.id,
        "payment_id": payment.id,
        "amount": amount_in_paise,
        "currency": gateway_order.currency,
        "name": payment.owner.club_name if payment.owner and payment.owner.club_name else "Mukijo Club",
        "description": payment.title,
        "prefill_name": member_name,
        "prefill_email": member_email,
        "prefill_contact": member_phone,
    }

@router.post("/payments/razorpay/verify")
def verify_razorpay_payment(verification: schemas.RazorpayVerifyRequest, db: Session = Depends(get_db)):
    """Verify Razorpay payment signature and mark the payment request as paid."""
    payment = db.query(models.Payment).filter(
        models.Payment.id == verification.payment_id,
        models.Payment.owner_id == verification.owner_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")

    gateway_order = db.query(models.PaymentGatewayOrder).filter(
        models.PaymentGatewayOrder.payment_id == payment.id,
        models.PaymentGatewayOrder.owner_id == verification.owner_id,
        models.PaymentGatewayOrder.razorpay_order_id == verification.razorpay_order_id
    ).first()

    if not gateway_order:
        raise HTTPException(status_code=404, detail="Razorpay order not found for this payment request")

    expected_signature = build_razorpay_signature(
        gateway_order.razorpay_order_id,
        verification.razorpay_payment_id
    )
    if not hmac.compare_digest(expected_signature, verification.razorpay_signature):
        gateway_order.status = "signature_failed"
        gateway_order.razorpay_payment_id = verification.razorpay_payment_id
        gateway_order.razorpay_signature = verification.razorpay_signature
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed")

    gateway_order.status = "paid"
    gateway_order.razorpay_payment_id = verification.razorpay_payment_id
    gateway_order.razorpay_signature = verification.razorpay_signature
    gateway_order.verified_at = datetime.utcnow()
    payment.status = "paid"
    payment.payment_method = "Razorpay"
    payment.paid_at = date.today().isoformat()

    # If this payment was created for a course registration, update that registration's payment status too.
    if payment.description and "course_registration_id:" in payment.description:
        try:
            parts = dict(part.split(":", 1) for part in payment.description.split("|") if ":" in part)
            registration_id = int(parts.get("course_registration_id", "0"))
            registration = db.query(models.CourseRegistration).filter(
                models.CourseRegistration.id == registration_id,
                models.CourseRegistration.owner_id == verification.owner_id
            ).first()
            if registration and registration.payment_status != "paid":
                registration.payment_status = "paid"
        except Exception:
            pass

    db.commit()
    db.refresh(payment)
    return {
        "message": "Payment verified successfully",
        "payment": serialize_payment(payment),
    }

@router.get("/payments", response_model=List[schemas.PaymentResponse])
def get_payments(
    owner_id: int,
    status: str = "all",
    group_id: Optional[int] = None,
    member_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Retrieve all payment requests, optionally filtered by status, group, or member."""
    query = db.query(models.Payment).filter(models.Payment.owner_id == owner_id)

    if group_id:
        query = query.filter(models.Payment.group_id == group_id)
    if member_id:
        query = query.filter(models.Payment.member_id == member_id)
    if status != "all":
        if status not in PAYMENT_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid payment status")
        if status != "overdue":
            query = query.filter(models.Payment.status == status)

    payments = query.order_by(models.Payment.id.desc()).all()
    serialized = [serialize_payment(payment) for payment in payments]

    if status == "overdue":
        serialized = [payment for payment in serialized if payment["status"] == "overdue"]

    return serialized

@router.get("/payments/summary")
def get_payments_summary(owner_id: int, db: Session = Depends(get_db)):
    """Retrieve a summary of collected, pending, and overdue payment amounts."""
    payments = db.query(models.Payment).filter(models.Payment.owner_id == owner_id).all()
    collected = sum(payment.amount or 0 for payment in payments if payment.status == "paid")
    pending_items = [payment for payment in payments if get_effective_payment_status(payment) in {"pending", "overdue"}]
    overdue_items = [payment for payment in payments if get_effective_payment_status(payment) == "overdue"]

    return {
        "total_collected": collected,
        "pending_amount": sum(payment.amount or 0 for payment in pending_items),
        "overdue_amount": sum(payment.amount or 0 for payment in overdue_items),
        "total_requests": len(payments),
        "pending_count": len(pending_items),
        "paid_count": len([payment for payment in payments if payment.status == "paid"]),
        "overdue_count": len(overdue_items),
    }

@router.get("/payments/member-status")
def get_payments_member_status(owner_id: int, db: Session = Depends(get_db), x_is_member: Optional[str] = Header(None)):
    """Retrieve payment status details for all club members and their assigned payments."""
    if x_is_member == "true":
        raise HTTPException(status_code=403, detail="Members are not allowed to view payment records.")
    groups = db.query(models.Group).filter(models.Group.owner_id == owner_id).all()
    group_ids = [g.id for g in groups]

    if not group_ids:
        return []

    members = db.query(models.Member)\
        .filter(models.Member.group_id.in_(group_ids))\
        .order_by(models.Member.first_name.asc(), models.Member.last_name.asc())\
        .all()

    payments = db.query(models.Payment)\
        .filter(models.Payment.owner_id == owner_id)\
        .order_by(models.Payment.id.desc())\
        .all()

    group_map = {g.id: g for g in groups}
    payments_by_member = {}
    payments_by_group = {}
    club_wide_payments = []

    for payment in payments:
        if payment.member_id:
            payments_by_member.setdefault(payment.member_id, []).append(payment)
        elif payment.group_id:
            payments_by_group.setdefault(payment.group_id, []).append(payment)
        else:
            club_wide_payments.append(payment)

    def display_status(payment):
        return "paid" if get_effective_payment_status(payment) == "paid" else "unpaid"

    def member_details(member):
        group_obj = group_map.get(member.group_id)
        return {
            "member_id": member.id,
            "full_name": f"{member.first_name} {member.last_name}".strip(),
            "email": member.email,
            "role": member.role or "Member",
            "sport": group_obj.activity if group_obj else "N/A",
            "group_name": group_obj.group_name if group_obj else "N/A",
            "member_group_name": group_obj.group_name if group_obj else "N/A",
        }

    result = []

    for member in members:
        applicable_payments = [
            *payments_by_member.get(member.id, []),
            *payments_by_group.get(member.group_id, []),
            *club_wide_payments,
        ]

        if not applicable_payments:
            result.append({
                **member_details(member),
                "payment_for": "No Assigned Payments",
                "amount": 0,
                "status": "unpaid",
                "payment_id": None,
            })
        else:
            for payment in applicable_payments:
                result.append({
                    **member_details(member),
                    "payment_for": payment.title,
                    "amount": payment.amount or 0,
                    "status": display_status(payment),
                    "raw_status": get_effective_payment_status(payment),
                    "payment_id": payment.id,
                })
    return result

@router.post("/payments", response_model=schemas.PaymentResponse)
def create_payment(payment: schemas.PaymentCreate, db: Session = Depends(get_db), x_is_member: Optional[str] = Header(None)):
    """Create a new payment request for a specific group, member, or club-wide."""
    if x_is_member == "true":
        raise HTTPException(status_code=403, detail="Members are not allowed to create payments.")
    if payment.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    status = payment.status or "pending"
    if status not in PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payment status")

    group_id, member_id = validate_payment_scope(payment.owner_id, payment.group_id, payment.member_id, db)

    new_payment = models.Payment(
        owner_id=payment.owner_id,
        group_id=group_id,
        member_id=member_id,
        title=payment.title,
        description=payment.description,
        category=payment.category or "Membership Fee",
        amount=payment.amount,
        due_date=payment.due_date,
        status=status,
        payment_method=payment.payment_method,
        paid_at=payment.paid_at
    )

    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    return serialize_payment(new_payment)

@router.put("/payments/{payment_id}", response_model=schemas.PaymentResponse)
def update_payment(payment_id: int, owner_id: int, payment_update: schemas.PaymentUpdate, db: Session = Depends(get_db), x_is_member: Optional[str] = Header(None)):
    """Update details of an existing payment request, including its amount or status."""
    if x_is_member == "true":
        raise HTTPException(status_code=403, detail="Members are not allowed to update payments.")
    payment = db.query(models.Payment).filter(
        models.Payment.id == payment_id,
        models.Payment.owner_id == owner_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")

    update_data = payment_update.dict(exclude_unset=True)

    if "amount" in update_data and update_data["amount"] is not None and update_data["amount"] <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    if "status" in update_data and update_data["status"] not in PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payment status")

    group_id = update_data.get("group_id", payment.group_id)
    member_id = update_data.get("member_id", payment.member_id)
    if "group_id" in update_data or "member_id" in update_data:
        group_id, member_id = validate_payment_scope(owner_id, group_id, member_id, db)
        update_data["group_id"] = group_id
        update_data["member_id"] = member_id

    if update_data.get("status") == "paid" and not update_data.get("paid_at") and not payment.paid_at:
        update_data["paid_at"] = date.today().isoformat()
    if update_data.get("status") in {"pending", "overdue", "cancelled"} and "paid_at" not in update_data:
        update_data["paid_at"] = None

    for key, value in update_data.items():
        setattr(payment, key, value)

    db.commit()
    db.refresh(payment)
    return serialize_payment(payment)

@router.delete("/payments/{payment_id}")
def delete_payment(payment_id: int, owner_id: int, db: Session = Depends(get_db), x_is_member: Optional[str] = Header(None)):
    """Delete an existing payment request."""
    if x_is_member == "true":
        raise HTTPException(status_code=403, detail="Members are not allowed to delete payments.")
    payment = db.query(models.Payment).filter(
        models.Payment.id == payment_id,
        models.Payment.owner_id == owner_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")

    db.delete(payment)
    db.commit()
    return {"message": "Payment request deleted successfully"}

