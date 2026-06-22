from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Header
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.config import FRONTEND_URL
import json
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime
import uuid

from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.routes.helpers import *
from app.services.email import send_verification_email
from pydantic import BaseModel

class MemberLoginRequest(BaseModel):
    email: str
    password: str

router = APIRouter()


@router.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if user already exists
    """Register a new club administrator and set up their club settings."""
    email_clean = user.email.replace(" ", "").lower() if user.email else ""
    db_user = db.query(models.User).filter(func.lower(models.User.email) == email_clean).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate verification token
    v_token = uuid.uuid4().hex

    new_user = models.User(
        club_name=user.clubName,
        country=user.country,
        state=user.state,
        member_count=user.memberCount,
        sport=user.sport,
        first_name=user.firstName,
        last_name=user.lastName,
        email=email_clean,
        password=user.password.strip() if user.password else "",
        phone=user.phone,
        aadhar_number=user.aadharNumber,
        hear_about=user.hearAbout,
        is_verified=True, # Automatically verify users
        verification_token=None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Removed background task for sending email
    # background_tasks.add_task(send_verification_email, new_user.email, v_token)

    return new_user

@router.get("/verify")
def verify_user(token: str, db: Session = Depends(get_db)):
    """Verify a club administrator's email using their verification token."""
    user = db.query(models.User).filter(models.User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    user.is_verified = True
    user.verification_token = None # Clear token after verification
    db.commit()

    # Redirect to frontend dashboard or login with a success parameter
    return RedirectResponse(url=f"{FRONTEND_URL}/dashboard?verified=true")

@router.post("/login")
def login_user(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    # Verify user credentials
    """Authenticate a club administrator and return their session details."""
    email_clean = user_data.email.replace(" ", "").lower() if user_data.email else ""
    password_clean = user_data.password.strip() if user_data.password else ""
    user = db.query(models.User).filter(func.lower(models.User.email) == email_clean).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if user.password != password_clean:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    return {"message": "Login successful", "userName": user.first_name, "userId": user.id, "clubName": user.club_name}

# --- CUSTOM SIGNUP FORMS & REGISTRATIONS ENDPOINTS ---

def get_default_fields(role: str):
    import json
    role_lower = role.lower()
    if "coach" in role_lower:
        fields = [
            {"name": "first_name", "label": "First Name", "type": "text", "required": True, "placeholder": "Enter first name"},
            {"name": "last_name", "label": "Last Name", "type": "text", "required": True, "placeholder": "Enter last name"},
            {"name": "email", "label": "Email Address", "type": "email", "required": True, "placeholder": "coach@example.com"},
            {"name": "phone", "label": "Phone Number", "type": "tel", "required": True, "placeholder": "10-digit number"},
            {"name": "specialization", "label": "Specialization / Sport", "type": "text", "required": True, "placeholder": "e.g., Football, Cricket"},
            {"name": "experience", "label": "Coaching Experience (Years)", "type": "number", "required": False, "placeholder": "e.g., 5"},
            {"name": "aadhar", "label": "Aadhar Number", "type": "text", "required": False, "placeholder": "12-digit Aadhar"}
        ]
        title = "Coach Registration"
        desc = "Apply to become a coach for our club. Fill in your details below."
    elif "parent" in role_lower:
        fields = [
            {"name": "first_name", "label": "First Name", "type": "text", "required": True, "placeholder": "Enter first name"},
            {"name": "last_name", "label": "Last Name", "type": "text", "required": True, "placeholder": "Enter last name"},
            {"name": "email", "label": "Email Address", "type": "email", "required": True, "placeholder": "parent@example.com"},
            {"name": "phone", "label": "Phone Number", "type": "tel", "required": True, "placeholder": "10-digit number"},
            {"name": "child_name", "label": "Child's Name", "type": "text", "required": True, "placeholder": "Enter child's full name"},
            {"name": "relation", "label": "Relationship to Child", "type": "select", "required": True, "options": ["Father", "Mother", "Guardian"], "placeholder": "Select relationship"},
            {"name": "emergency_contact", "label": "Emergency Contact Number", "type": "tel", "required": True, "placeholder": "Emergency phone"}
        ]
        title = "Parent Registration"
        desc = "Register as a parent/guardian. Fill in your and your child's details below."
    elif "player" in role_lower:
        fields = [
            {"name": "first_name", "label": "First Name", "type": "text", "required": True, "placeholder": "Enter first name"},
            {"name": "last_name", "label": "Last Name", "type": "text", "required": True, "placeholder": "Enter last name"},
            {"name": "email", "label": "Email Address", "type": "email", "required": True, "placeholder": "player@example.com"},
            {"name": "phone", "label": "Phone Number", "type": "tel", "required": True, "placeholder": "10-digit number"},
            {"name": "dob", "label": "Date of Birth", "type": "date", "required": True, "placeholder": "Select date of birth"},
            {"name": "gender", "label": "Gender", "type": "select", "required": True, "options": ["Male", "Female", "Other"], "placeholder": "Select gender"},
            {"name": "position", "label": "Play Position / Skill", "type": "text", "required": False, "placeholder": "e.g., Striker, Goalkeeper, Batsman"}
        ]
        title = "Player Registration"
        desc = "Apply to register as a player in our club. Fill in your details below."
    else: # referee / refree
        fields = [
            {"name": "first_name", "label": "First Name", "type": "text", "required": True, "placeholder": "Enter first name"},
            {"name": "last_name", "label": "Last Name", "type": "text", "required": True, "placeholder": "Enter last name"},
            {"name": "email", "label": "Email Address", "type": "email", "required": True, "placeholder": "referee@example.com"},
            {"name": "phone", "label": "Phone Number", "type": "tel", "required": True, "placeholder": "10-digit number"},
            {"name": "certification", "label": "Certification Level", "type": "text", "required": True, "placeholder": "e.g., State Level, National Level"},
            {"name": "experience", "label": "Officiating Experience (Years)", "type": "number", "required": False, "placeholder": "e.g., 3"},
            {"name": "aadhar", "label": "Aadhar Number", "type": "text", "required": False, "placeholder": "12-digit Aadhar"}
        ]
        title = "Referee Registration"
        desc = "Apply to become a referee for our club. Fill in your details below."
    return title, desc, json.dumps(fields)

@router.get("/clubs")
def get_clubs(db: Session = Depends(get_db)):
    """Retrieve a list of all registered clubs in the system."""
    users = db.query(models.User).filter(models.User.club_name != None).all()
    return [
        {
            "id": u.id,
            "club_name": u.club_name,
            "sport": u.sport,
            "country": u.country,
            "state": u.state
        }
        for u in users
    ]


@router.post("/login-member")
def login_member(req: MemberLoginRequest, db: Session = Depends(get_db)):
    """Authenticate a club member and return their session and dashboard details."""
    email_clean = normalize_email(req.email)
    password_clean = req.password.strip() if req.password else ""

    if not email_clean or not password_clean:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    member = find_approved_member_by_email(db, email_clean)
    if not member:
        if has_pending_submission_for_email(db, email_clean):
            raise HTTPException(
                status_code=403,
                detail="Club admin has to approve your application before you can log in."
            )
        raise HTTPException(status_code=404, detail="Member email not registered with any club.")

    # Password verification
    if member.password:
        if member.password != password_clean:
            raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
    else:
        # Fallback: if no password was created, allow logging in with their phone number as a default password
        if member.phone and member.phone != password_clean:
            raise HTTPException(status_code=401, detail="Incorrect password. Please use your registered phone number if you have not set a password.")

    # Try to find group and the group's owner ID
    group = db.query(models.Group).filter(models.Group.id == member.group_id).first()
    if not group:
        raise HTTPException(status_code=400, detail="Member has not been assigned to a club group yet.")

    owner = db.query(models.User).filter(models.User.id == group.owner_id).first()
    if not owner:
        raise HTTPException(status_code=400, detail="Associated club owner not found.")

    return {
        "userName": f"{member.first_name} {member.last_name}",
        "userId": owner.id,
        "clubName": owner.club_name,
        "isMember": True,
        "memberRole": member.role,
        "memberId": member.id,
        "userEmail": member.email,
        "userPhone": member.phone or "",
        "groupName": group.group_name,
        "approvalStatus": "accepted"
    }

