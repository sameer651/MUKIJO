from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime
import json

from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.routes.helpers import *
from app.routes.auth import get_default_fields


router = APIRouter()


@router.get("/signup-forms")
def get_signup_forms(owner_id: int, db: Session = Depends(get_db)):
    """Retrieve custom signup forms configured for standard roles (Coach, Parent, Player, Referee)."""
    forms = db.query(models.SignupForm).filter(models.SignupForm.owner_id == owner_id).all()

    # Ensure all 4 standard roles have some configuration returned (fall back to default if not saved)
    roles = ["Coach", "Parent", "Player", "Referee"]
    result = []

    for role in roles:
        # Check if saved
        saved_form = next((f for f in forms if f.role.lower() == role.lower()), None)
        if saved_form:
            result.append({
                "id": saved_form.id,
                "owner_id": saved_form.owner_id,
                "role": saved_form.role,
                "title": saved_form.title,
                "description": saved_form.description,
                "fields": saved_form.fields,
                "is_customized": True
            })
        else:
            title, desc, fields_json = get_default_fields(role)
            result.append({
                "id": 0,
                "owner_id": owner_id,
                "role": role,
                "title": title,
                "description": desc,
                "fields": fields_json,
                "is_customized": False
            })

    return result

@router.get("/signup-forms/{role}")
def get_signup_form_by_role(role: str, owner_id: int, db: Session = Depends(get_db)):
    """Retrieve custom signup form fields configured for a specific role."""
    saved_form = db.query(models.SignupForm).filter(
        models.SignupForm.owner_id == owner_id,
        func.lower(models.SignupForm.role) == role.lower()
    ).first()

    if saved_form:
        return {
            "id": saved_form.id,
            "owner_id": saved_form.owner_id,
            "role": saved_form.role,
            "title": saved_form.title,
            "description": saved_form.description,
            "fields": saved_form.fields,
            "is_customized": True
        }

    # Return default
    title, desc, fields_json = get_default_fields(role)
    return {
        "id": 0,
        "owner_id": owner_id,
        "role": role,
        "title": title,
        "description": desc,
        "fields": fields_json,
        "is_customized": False
    }

@router.post("/signup-forms", response_model=schemas.SignupFormResponse)
def upsert_signup_form(form: schemas.SignupFormCreate, db: Session = Depends(get_db)):
    # Check if role configuration already exists for this owner
    """Create or update a custom signup form fields configuration for a role."""
    existing = db.query(models.SignupForm).filter(
        models.SignupForm.owner_id == form.owner_id,
        func.lower(models.SignupForm.role) == form.role.lower()
    ).first()

    if existing:
        existing.title = form.title
        existing.description = form.description
        existing.fields = form.fields
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_form = models.SignupForm(
            owner_id=form.owner_id,
            role=form.role,
            title=form.title,
            description=form.description,
            fields=form.fields
        )
        db.add(new_form)
        db.commit()
        db.refresh(new_form)
        return new_form

@router.post("/signup-submissions")
def create_signup_submission(submission: schemas.SignupSubmissionCreate, db: Session = Depends(get_db)):
    """Create an onboarding application submission for approval by a club administrator."""
    owner = db.query(models.User).filter(models.User.id == submission.owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Selected club was not found. Please choose a valid club and submit again.")

    try:
        submitted_data = json.loads(submission.submitted_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid application data. Please try again.")

    if not isinstance(submitted_data, dict):
        raise HTTPException(status_code=400, detail="Invalid application data. Please try again.")

    email_clean = get_submission_email(submitted_data)
    password_clean = normalize_text(get_case_insensitive_value(submitted_data, "password"))

    if not email_clean:
        raise HTTPException(status_code=400, detail="Email is required for member approval and login.")
    if not password_clean:
        raise HTTPException(status_code=400, detail="Password is required for member approval and login.")

    if find_approved_member_by_email(db, email_clean, submission.owner_id):
        raise HTTPException(status_code=400, detail="This email is already approved as a club member. Please log in.")

    if has_pending_submission_for_email(db, email_clean, submission.owner_id):
        raise HTTPException(
            status_code=400,
            detail="Your application is already in the onboarding queue. Club admin has to approve your application before you can log in."
        )

    submitted_data["email"] = email_clean
    submitted_data["password"] = password_clean

    new_submission = models.SignupSubmission(
        owner_id=submission.owner_id,
        role=submission.role,
        submitted_data=json.dumps(submitted_data)
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    return {
        "message": "Application submitted. Club admin has to approve your application before you can log in.",
        "id": new_submission.id,
        "role": new_submission.role,
        "status": "pending"
    }

@router.get("/signup-submissions")
def get_signup_submissions(owner_id: int, db: Session = Depends(get_db)):
    """Retrieve all pending onboarding application submissions for a club administrator."""
    submissions = db.query(models.SignupSubmission).filter(
        models.SignupSubmission.owner_id == owner_id
    ).order_by(models.SignupSubmission.created_at.desc()).all()

    result = []
    for s in submissions:
        result.append({
            "id": s.id,
            "owner_id": s.owner_id,
            "role": s.role,
            "submitted_data": s.submitted_data,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "status": "pending"
        })
    return result

@router.delete("/signup-submissions/{submission_id}")
def delete_signup_submission(submission_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Reject and delete a pending onboarding application submission."""
    submission = db.query(models.SignupSubmission).filter(
        models.SignupSubmission.id == submission_id,
        models.SignupSubmission.owner_id == owner_id
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    db.delete(submission)
    db.commit()
    return {"message": "Application rejected/deleted successfully"}

@router.post("/signup-submissions/{submission_id}/approve")
def approve_signup_submission(submission_id: int, owner_id: int, group_id: Optional[int] = None, db: Session = Depends(get_db)):
    # 1. Fetch submission
    """Approve a pending onboarding application, creating a verified member account in a club group."""
    submission = db.query(models.SignupSubmission).filter(
        models.SignupSubmission.id == submission_id,
        models.SignupSubmission.owner_id == owner_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # 2. Verify the selected group or create a default approval group.
    if group_id:
        group = db.query(models.Group).filter(
            models.Group.id == group_id,
            models.Group.owner_id == owner_id
        ).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
    else:
        owner = db.query(models.User).filter(models.User.id == owner_id).first()
        if not owner:
            raise HTTPException(status_code=404, detail="Club admin not found")

        group = db.query(models.Group).filter(
            models.Group.owner_id == owner_id,
            models.Group.group_name == "Approved Members"
        ).first()
        if not group:
            group = models.Group(
                owner_id=owner_id,
                activity=owner.sport or "Club",
                age_group="All Ages",
                group_name="Approved Members",
                sub_group="Onboarding",
                description="Automatically created for accepted member applications."
            )
            db.add(group)
            db.flush()

    # 3. Parse submitted data
    data = parse_submission_data(submission)

    # 4. Extract first_name, last_name, email, phone, password
    first_name = normalize_text(data.get("first_name") or data.get("firstName")) or "Applicant"
    last_name = normalize_text(data.get("last_name") or data.get("lastName")) or f"#{submission.id}"
    email = get_submission_email(data)
    phone = normalize_text(get_case_insensitive_value(data, "phone"))
    password = normalize_text(get_case_insensitive_value(data, "password"))

    if not email:
        raise HTTPException(status_code=400, detail="Applicant email is required before approval.")
    if not password:
        raise HTTPException(status_code=400, detail="Applicant password is required before approval.")

    if find_approved_member_by_email(db, email, owner_id):
        raise HTTPException(status_code=400, detail="This applicant is already an approved club member.")

    # 5. Create Member
    new_member = models.Member(
        group_id=group.id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        password=password,
        role=submission.role # Coach, Parent, Player, Referee
    )
    db.add(new_member)

    # 6. Delete submission
    db.delete(submission)
    db.commit()
    db.refresh(new_member)

    return {
        "message": "Applicant accepted. The member can now log in with the registered email and password.",
        "member_id": new_member.id,
        "group_id": group.id,
        "group_name": group.group_name,
        "status": "accepted"
    }

