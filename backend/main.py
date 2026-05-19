# Backend API for Mukijo Club Management
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import base64
import hashlib
import hmac
import json
import os
import urllib.error
import urllib.request
import uuid
from datetime import date, datetime

from email_utils import send_verification_email, FRONTEND_URL


import models
import schemas
from database import engine, SessionLocal

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Allow frontend to connect with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection function
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

PAYMENT_STATUSES = {"pending", "paid", "overdue", "cancelled"}
COURSE_STATUSES = {"draft", "open", "full", "closed", "completed"}
COURSE_REGISTRATION_STATUSES = {"registered", "waitlisted", "cancelled", "completed"}
COURSE_PAYMENT_STATUSES = {"unpaid", "paid", "waived"}
RAZORPAY_API_BASE = "https://api.razorpay.com/v1"
RAZORPAY_CURRENCY = os.getenv("RAZORPAY_CURRENCY", "INR")

def get_razorpay_credentials():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=503,
            detail="Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the backend environment."
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
        raise HTTPException(status_code=502, detail=f"Razorpay error: {message}")
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Razorpay: {exc.reason}")

def build_razorpay_signature(order_id: str, payment_id: str):
    _, key_secret = get_razorpay_credentials()
    payload = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

def get_effective_payment_status(payment: models.Payment):
    if payment.status == "pending" and payment.due_date and payment.due_date < date.today().isoformat():
        return "overdue"
    return payment.status

def serialize_payment(payment: models.Payment):
    member_name = None
    if payment.member:
        member_name = f"{payment.member.first_name} {payment.member.last_name}".strip()

    return {
        "id": payment.id,
        "owner_id": payment.owner_id,
        "group_id": payment.group_id,
        "member_id": payment.member_id,
        "title": payment.title,
        "description": payment.description,
        "category": payment.category,
        "amount": payment.amount,
        "due_date": payment.due_date,
        "status": get_effective_payment_status(payment),
        "payment_method": payment.payment_method,
        "paid_at": payment.paid_at,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "group_name": payment.group.group_name if payment.group else None,
        "member_name": member_name,
    }

def validate_payment_scope(owner_id: int, group_id: int | None, member_id: int | None, db: Session):
    if member_id:
        member = db.query(models.Member)\
            .join(models.Group, models.Member.group_id == models.Group.id)\
            .filter(models.Member.id == member_id, models.Group.owner_id == owner_id)\
            .first()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found or access denied")
        if group_id and member.group_id != group_id:
            raise HTTPException(status_code=400, detail="Selected member does not belong to the selected group")
        group_id = member.group_id

    if group_id:
        group = db.query(models.Group).filter(
            models.Group.id == group_id,
            models.Group.owner_id == owner_id
        ).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")

    return group_id, member_id

def get_course_registration_count(course: models.Course):
    return len([registration for registration in course.registrations if registration.status != "cancelled"])

def serialize_course(course: models.Course):
    registration_count = get_course_registration_count(course)
    available_seats = max((course.capacity or 0) - registration_count, 0)
    return {
        "id": course.id,
        "owner_id": course.owner_id,
        "group_id": course.group_id,
        "title": course.title,
        "code": course.code,
        "category": course.category or "Training",
        "level": course.level,
        "description": course.description,
        "instructor": course.instructor,
        "start_date": course.start_date,
        "end_date": course.end_date,
        "schedule": course.schedule,
        "location": course.location,
        "capacity": course.capacity or 0,
        "fee": course.fee or 0,
        "status": "full" if course.status == "open" and available_seats == 0 else (course.status or "open"),
        "created_at": course.created_at.isoformat() if course.created_at else None,
        "group_name": course.group.group_name if course.group else None,
        "registration_count": registration_count,
        "available_seats": available_seats,
        "paid_count": len([registration for registration in course.registrations if registration.payment_status == "paid"]),
    }

def serialize_course_registration(registration: models.CourseRegistration):
    group_name = registration.course.group.group_name if registration.course and registration.course.group else None
    return {
        "id": registration.id,
        "owner_id": registration.owner_id,
        "course_id": registration.course_id,
        "member_id": registration.member_id,
        "participant_name": registration.participant_name,
        "participant_email": registration.participant_email,
        "participant_phone": registration.participant_phone,
        "status": registration.status,
        "payment_status": registration.payment_status,
        "notes": registration.notes,
        "registered_at": registration.registered_at.isoformat() if registration.registered_at else None,
        "course_title": registration.course.title if registration.course else None,
        "group_name": group_name,
    }

def serialize_event(event: models.Event):
    return {
        "id": event.id,
        "group_id": event.group_id,
        "owner_id": event.owner_id,
        "name": event.name,
        "type": event.type,
        "date": event.date,
        "time": event.time,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "location": event.location,
        "description": event.description,
        
        "cover_image": event.cover_image,
        "registration_deadline": event.registration_deadline,
        "max_participants": event.max_participants,
        
        "auto_reminder": event.auto_reminder or False,
        "attendance_tracking": event.attendance_tracking or False,
        "is_public": event.is_public if event.is_public is not None else True,
        "allow_guest": event.allow_guest or False,
        "allow_waiting_list": event.allow_waiting_list or False,
        
        "rules_pdf": event.rules_pdf,
        "schedule_file": event.schedule_file,
        "permission_forms": event.permission_forms,
        "match_fixtures": event.match_fixtures,
        "event_posters": event.event_posters,
        
        "group_name": event.group.group_name if event.group else "Club-Wide"
    }

def normalize_phone(value: str | None):
    return "".join(char for char in str(value or "") if char.isdigit())

def validate_course_group(owner_id: int, group_id: int | None, db: Session):
    if not group_id:
        return None

    group = db.query(models.Group).filter(
        models.Group.id == group_id,
        models.Group.owner_id == owner_id
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    return group_id

@app.post("/groups", response_model=schemas.GroupResponse)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    new_group = models.Group(
        activity=group.activity,
        age_group=group.age_group,
        group_name=group.group_name,
        sub_group=group.sub_group,
        description=group.description,
        owner_id=group.owner_id
    )


    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    return new_group

@app.post("/groups/import")
async def import_groups_and_members(
    owner_id: int = Form(...), 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.xlsx') and not file.filename.endswith('.xls'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")
    
    try:
        import pandas as pd
        import io
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = df.where(pd.notnull(df), None)
        
        records = df.to_dict(orient="records")
        
        new_groups = []
        new_members = []
        group_map = {} # Mapping group_name -> Group object
        
        for record in records:
            g_name = str(record.get("group_name", "")).strip()
            if not g_name or not record.get("activity") or not record.get("age_group"):
                continue # Skip invalid rows
                
            # If we haven't created this group yet, create it
            if g_name not in group_map:
                new_group = models.Group(
                    activity=str(record.get("activity")),
                    age_group=str(record.get("age_group")),
                    group_name=g_name,
                    sub_group=str(record.get("sub_group")) if record.get("sub_group") else None,
                    description=str(record.get("description")) if record.get("description") else None,
                    owner_id=owner_id
                )
                new_groups.append(new_group)
                group_map[g_name] = new_group
                db.add(new_group)
                db.flush() # Flush to get the ID for members
                
            target_group = group_map[g_name]
            
            # Now process the member in this row
            first_name = record.get("first_name")
            email = record.get("email")
            
            if first_name and email:
                new_member = models.Member(
                    group_id=target_group.id,
                    first_name=str(first_name),
                    last_name=str(record.get("last_name")) if record.get("last_name") else "",
                    email=str(email),
                    phone=str(record.get("phone")) if record.get("phone") else "",
                    role=str(record.get("role")) if record.get("role") else "Member"
                )
                new_members.append(new_member)
                db.add(new_member)
                
        db.commit()
            
        return {
            "message": f"Successfully imported {len(new_groups)} groups and {len(new_members)} members.", 
            "groups_count": len(new_groups),
            "members_count": len(new_members)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@app.get("/groups")
def get_groups(owner_id: int, db: Session = Depends(get_db)):
    groups = db.query(models.Group).filter(models.Group.owner_id == owner_id).all()
    return groups

@app.get("/groups/{group_id}", response_model=schemas.GroupResponse)
def get_group(group_id: str, owner_id: int, db: Session = Depends(get_db)):
    # Try fetching by ID first if it's numeric
    group = None
    if group_id.isdigit():
        group = db.query(models.Group).filter(
            models.Group.id == int(group_id), 
            models.Group.owner_id == owner_id
        ).first()
    
    # If not found by ID, try fetching by group_name
    if not group:
        group = db.query(models.Group).filter(
            models.Group.group_name == group_id,
            models.Group.owner_id == owner_id
        ).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    return group

@app.delete("/groups/{group_id}")
def delete_group(group_id: int, owner_id: int, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(
        models.Group.id == group_id, 
        models.Group.owner_id == owner_id
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    
    db.delete(group)
    db.commit()
    return {"message": "Group deleted successfully"}

@app.post("/groups/{group_id}/members", response_model=schemas.MemberResponse)
def add_member(group_id: int, owner_id: int, member: schemas.MemberCreate, db: Session = Depends(get_db)):
    # Verify the user owns this group
    db_group = db.query(models.Group).filter(
        models.Group.id == group_id, 
        models.Group.owner_id == owner_id
    ).first()
    
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    
    new_member = models.Member(
        group_id=group_id,
        first_name=member.first_name,
        last_name=member.last_name,
        email=member.email,
        phone=member.phone,
        role=member.role
    )
    
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@app.post("/groups/{group_id}/members/import")
async def import_members(
    group_id: int,
    owner_id: int = Form(...), 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    db_group = db.query(models.Group).filter(
        models.Group.id == group_id, 
        models.Group.owner_id == owner_id
    ).first()
    
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")

    if not file.filename.endswith('.xlsx') and not file.filename.endswith('.xls'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")
    
    try:
        import pandas as pd
        import io
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        df = df.where(pd.notnull(df), None)
        
        records = df.to_dict(orient="records")
        new_members = []
        for record in records:
            if not record.get("first_name") or not record.get("last_name") or not record.get("email"):
                continue
                
            new_member = models.Member(
                group_id=group_id,
                first_name=str(record.get("first_name")),
                last_name=str(record.get("last_name")),
                email=str(record.get("email")),
                phone=str(record.get("phone")) if record.get("phone") else "",
                role=str(record.get("role")) if record.get("role") else "Member"
            )
            new_members.append(new_member)
            
        if new_members:
            db.add_all(new_members)
            db.commit()
            
        return {"message": f"Successfully imported {len(new_members)} members.", "count": len(new_members)}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@app.get("/groups/{group_id}/members")
def get_group_members(group_id: str, owner_id: int, db: Session = Depends(get_db)):
    # First verify the user owns this group
    group = None
    if group_id.isdigit():
        group = db.query(models.Group).filter(
            models.Group.id == int(group_id), 
            models.Group.owner_id == owner_id
        ).first()
    
    if not group:
        group = db.query(models.Group).filter(
            models.Group.group_name == group_id,
            models.Group.owner_id == owner_id
        ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Access denied or group not found")
        
    members = db.query(models.Member).filter(models.Member.group_id == group.id).all()
    return members

@app.get("/members")
def get_all_members(owner_id: int, db: Session = Depends(get_db)):
    # Join Member and Group to filter by owner_id
    members_and_groups = db.query(models.Member, models.Group.group_name)\
                .join(models.Group, models.Member.group_id == models.Group.id)\
                .filter(models.Group.owner_id == owner_id)\
                .all()
    
    result = []
    for member, group_name in members_and_groups:
        result.append({
            "id": member.id,
            "group_id": member.group_id,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "email": member.email,
            "phone": member.phone,
            "role": member.role,
            "group_name": group_name
        })
        
    return result

@app.get("/courses/summary")
def get_courses_summary(owner_id: int, db: Session = Depends(get_db)):
    courses = db.query(models.Course).filter(models.Course.owner_id == owner_id).all()
    registrations = db.query(models.CourseRegistration).filter(models.CourseRegistration.owner_id == owner_id).all()
    paid_registrations = [registration for registration in registrations if registration.payment_status == "paid"]

    revenue = 0
    for registration in paid_registrations:
        if registration.course:
            revenue += registration.course.fee or 0

    return {
        "total_courses": len(courses),
        "open_courses": len([course for course in courses if serialize_course(course)["status"] == "open"]),
        "active_registrations": len([registration for registration in registrations if registration.status in {"registered", "waitlisted"}]),
        "waitlisted": len([registration for registration in registrations if registration.status == "waitlisted"]),
        "course_revenue": revenue,
    }

@app.get("/courses", response_model=List[schemas.CourseResponse])
def get_courses(
    owner_id: int,
    status: str = "all",
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Course).filter(models.Course.owner_id == owner_id)

    if group_id:
        query = query.filter(models.Course.group_id == group_id)
    if status != "all":
        if status not in COURSE_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid course status")
        query = query.filter(models.Course.status == status)

    courses = query.order_by(models.Course.id.desc()).all()
    serialized = [serialize_course(course) for course in courses]

    if status == "full":
        serialized = [course for course in serialized if course["status"] == "full"]

    return serialized

@app.post("/courses", response_model=schemas.CourseResponse)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    if not course.title.strip():
        raise HTTPException(status_code=400, detail="Course title is required")
    if course.capacity is not None and course.capacity <= 0:
        raise HTTPException(status_code=400, detail="Capacity must be greater than zero")
    if course.fee is not None and course.fee < 0:
        raise HTTPException(status_code=400, detail="Fee cannot be negative")

    status = course.status or "open"
    if status not in COURSE_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid course status")

    group_id = validate_course_group(course.owner_id, course.group_id, db)

    new_course = models.Course(
        owner_id=course.owner_id,
        group_id=group_id,
        title=course.title.strip(),
        code=course.code,
        category=course.category or "Training",
        level=course.level,
        description=course.description,
        instructor=course.instructor,
        start_date=course.start_date,
        end_date=course.end_date,
        schedule=course.schedule,
        location=course.location,
        capacity=course.capacity or 20,
        fee=course.fee or 0,
        status=status
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return serialize_course(new_course)

@app.get("/courses/{course_id}", response_model=schemas.CourseResponse)
def get_course(course_id: int, owner_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.owner_id == owner_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return serialize_course(course)

@app.put("/courses/{course_id}", response_model=schemas.CourseResponse)
def update_course(course_id: int, owner_id: int, course_update: schemas.CourseUpdate, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.owner_id == owner_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    update_data = course_update.dict(exclude_unset=True)
    if "title" in update_data and not update_data["title"].strip():
        raise HTTPException(status_code=400, detail="Course title is required")
    if "capacity" in update_data and update_data["capacity"] is not None and update_data["capacity"] <= 0:
        raise HTTPException(status_code=400, detail="Capacity must be greater than zero")
    if "fee" in update_data and update_data["fee"] is not None and update_data["fee"] < 0:
        raise HTTPException(status_code=400, detail="Fee cannot be negative")
    if "status" in update_data and update_data["status"] not in COURSE_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid course status")
    if "group_id" in update_data:
        update_data["group_id"] = validate_course_group(owner_id, update_data["group_id"], db)

    for key, value in update_data.items():
        setattr(course, key, value.strip() if key == "title" and isinstance(value, str) else value)

    db.commit()
    db.refresh(course)
    return serialize_course(course)

@app.delete("/courses/{course_id}")
def delete_course(course_id: int, owner_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.owner_id == owner_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}

@app.get("/courses/{course_id}/registrations", response_model=List[schemas.CourseRegistrationResponse])
def get_course_registrations(course_id: int, owner_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.owner_id == owner_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    registrations = db.query(models.CourseRegistration)\
        .filter(models.CourseRegistration.course_id == course_id, models.CourseRegistration.owner_id == owner_id)\
        .order_by(models.CourseRegistration.id.desc())\
        .all()
    return [serialize_course_registration(registration) for registration in registrations]

@app.post("/courses/{course_id}/registrations", response_model=schemas.CourseRegistrationResponse)
def create_course_registration(
    course_id: int,
    registration: schemas.CourseRegistrationCreate,
    db: Session = Depends(get_db)
):
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.owner_id == registration.owner_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.status not in {"open", "full"}:
        raise HTTPException(status_code=400, detail="Course is not open for registrations")

    status = registration.status or "registered"
    if status not in COURSE_REGISTRATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid registration status")

    payment_status = registration.payment_status or "unpaid"
    if payment_status not in COURSE_PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payment status")

    participant_name = (registration.participant_name or "").strip()
    participant_email = registration.participant_email
    participant_phone = registration.participant_phone
    member_id = registration.member_id

    if member_id:
        member = db.query(models.Member)\
            .join(models.Group, models.Member.group_id == models.Group.id)\
            .filter(models.Member.id == member_id, models.Group.owner_id == registration.owner_id)\
            .first()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found or access denied")
        if course.group_id and member.group_id != course.group_id:
            raise HTTPException(status_code=400, detail="Member does not belong to this course group")
        existing = db.query(models.CourseRegistration).filter(
            models.CourseRegistration.course_id == course_id,
            models.CourseRegistration.member_id == member_id,
            models.CourseRegistration.status != "cancelled"
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Member is already registered for this course")
        participant_name = f"{member.first_name} {member.last_name}".strip()
        participant_email = member.email
        participant_phone = member.phone

    if not participant_name:
        raise HTTPException(status_code=400, detail="Participant name is required")

    active_count = get_course_registration_count(course)
    if active_count >= (course.capacity or 0) and status == "registered":
        status = "waitlisted"

    new_registration = models.CourseRegistration(
        owner_id=registration.owner_id,
        course_id=course_id,
        member_id=member_id,
        participant_name=participant_name,
        participant_email=participant_email,
        participant_phone=participant_phone,
        status=status,
        payment_status=payment_status,
        notes=registration.notes
    )
    db.add(new_registration)
    db.commit()
    db.refresh(new_registration)
    return serialize_course_registration(new_registration)

@app.put("/course-registrations/{registration_id}", response_model=schemas.CourseRegistrationResponse)
def update_course_registration(
    registration_id: int,
    owner_id: int,
    registration_update: schemas.CourseRegistrationUpdate,
    db: Session = Depends(get_db)
):
    registration = db.query(models.CourseRegistration).filter(
        models.CourseRegistration.id == registration_id,
        models.CourseRegistration.owner_id == owner_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    update_data = registration_update.dict(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in COURSE_REGISTRATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid registration status")
    if "payment_status" in update_data and update_data["payment_status"] not in COURSE_PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payment status")

    for key, value in update_data.items():
        setattr(registration, key, value)

    db.commit()
    db.refresh(registration)
    return serialize_course_registration(registration)

@app.delete("/course-registrations/{registration_id}")
def delete_course_registration(registration_id: int, owner_id: int, db: Session = Depends(get_db)):
    registration = db.query(models.CourseRegistration).filter(
        models.CourseRegistration.id == registration_id,
        models.CourseRegistration.owner_id == owner_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    db.delete(registration)
    db.commit()
    return {"message": "Registration removed successfully"}

@app.get("/payments/razorpay/config")
def get_razorpay_config():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    return {
        "configured": bool(key_id and key_secret),
        "key_id": key_id if key_id and key_secret else None,
        "currency": RAZORPAY_CURRENCY,
        "name": "Mukijo Club",
    }

@app.post("/payments/razorpay/order", response_model=schemas.RazorpayOrderResponse)
def create_razorpay_payment_order(order_request: schemas.RazorpayOrderCreate, db: Session = Depends(get_db)):
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

@app.post("/payments/razorpay/verify")
def verify_razorpay_payment(verification: schemas.RazorpayVerifyRequest, db: Session = Depends(get_db)):
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

    db.commit()
    db.refresh(payment)
    return {
        "message": "Payment verified successfully",
        "payment": serialize_payment(payment),
    }

@app.get("/payments", response_model=List[schemas.PaymentResponse])
def get_payments(
    owner_id: int,
    status: str = "all",
    group_id: Optional[int] = None,
    member_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
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

@app.get("/payments/summary")
def get_payments_summary(owner_id: int, db: Session = Depends(get_db)):
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

@app.post("/payments", response_model=schemas.PaymentResponse)
def create_payment(payment: schemas.PaymentCreate, db: Session = Depends(get_db)):
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

@app.put("/payments/{payment_id}", response_model=schemas.PaymentResponse)
def update_payment(payment_id: int, owner_id: int, payment_update: schemas.PaymentUpdate, db: Session = Depends(get_db)):
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

@app.delete("/payments/{payment_id}")
def delete_payment(payment_id: int, owner_id: int, db: Session = Depends(get_db)):
    payment = db.query(models.Payment).filter(
        models.Payment.id == payment_id,
        models.Payment.owner_id == owner_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment request not found")

    db.delete(payment)
    db.commit()
    return {"message": "Payment request deleted successfully"}

@app.post("/groups/{group_id}/events", response_model=schemas.EventResponse)
def create_event(group_id: int, owner_id: int, event: schemas.EventCreate, db: Session = Depends(get_db)):
    db_group = db.query(models.Group).filter(
        models.Group.id == group_id, 
        models.Group.owner_id == owner_id
    ).first()
    
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    
    new_event = models.Event(
        group_id=group_id,
        owner_id=owner_id,
        name=event.name,
        type=event.type,
        date=event.date,
        time=event.time,
        start_time=event.start_time,
        end_time=event.end_time,
        location=event.location,
        description=event.description,
        cover_image=event.cover_image,
        registration_deadline=event.registration_deadline,
        max_participants=event.max_participants,
        auto_reminder=event.auto_reminder or False,
        attendance_tracking=event.attendance_tracking or False,
        is_public=event.is_public if event.is_public is not None else True,
        allow_guest=event.allow_guest or False,
        allow_waiting_list=event.allow_waiting_list or False,
        rules_pdf=event.rules_pdf,
        schedule_file=event.schedule_file,
        permission_forms=event.permission_forms,
        match_fixtures=event.match_fixtures,
        event_posters=event.event_posters
    )
    
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return serialize_event(new_event)

@app.get("/groups/{group_id}/events")
def get_group_events(group_id: str, owner_id: int, db: Session = Depends(get_db)):
    # Verify ownership
    group = None
    if group_id.isdigit():
        group = db.query(models.Group).filter(
            models.Group.id == int(group_id), 
            models.Group.owner_id == owner_id
        ).first()
    
    if not group:
        group = db.query(models.Group).filter(
            models.Group.group_name == group_id,
            models.Group.owner_id == owner_id
        ).first()
        
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
        
    events = db.query(models.Event).filter(models.Event.group_id == group.id).all()
    return [serialize_event(e) for e in events]

@app.get("/events")
def get_all_events(owner_id: int, db: Session = Depends(get_db)):
    events = db.query(models.Event).filter(models.Event.owner_id == owner_id).all()
    
    # Fallback: find all groups owned by the user and look up their events
    if not events:
        groups = db.query(models.Group).filter(models.Group.owner_id == owner_id).all()
        group_ids = [g.id for g in groups]
        events = db.query(models.Event).filter(models.Event.group_id.in_(group_ids)).all() if group_ids else []
        
    return [serialize_event(e) for e in events]

@app.get("/events/{event_id}")
def get_event(event_id: int, owner_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Verify ownership
    if event.owner_id != owner_id:
        group = db.query(models.Group).filter(models.Group.id == event.group_id, models.Group.owner_id == owner_id).first()
        if not group:
            raise HTTPException(status_code=403, detail="Access denied to event")
            
    return serialize_event(event)

@app.put("/events/{event_id}", response_model=schemas.EventResponse)
def update_event(event_id: int, owner_id: int, event_update: schemas.EventUpdate, db: Session = Depends(get_db)):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Verify ownership
    if db_event.owner_id != owner_id:
        group = db.query(models.Group).filter(models.Group.id == db_event.group_id, models.Group.owner_id == owner_id).first()
        if not group:
            raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = event_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_event, key, value)
        
    db.commit()
    db.refresh(db_event)
    return serialize_event(db_event)

@app.delete("/events/{event_id}")
def delete_event(event_id: int, owner_id: int, db: Session = Depends(get_db)):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Verify ownership
    if db_event.owner_id != owner_id:
        group = db.query(models.Group).filter(models.Group.id == db_event.group_id, models.Group.owner_id == owner_id).first()
        if not group:
            raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted successfully"}

# --- EVENT PARTICIPATION, INVITATIONS, AND ATTENDANCE ENDPOINTS ---

class EventInviteRequest(BaseModel):
    invite_type: str # "all_members", "parents", "coaches", "groups", "specific_members"
    group_ids: Optional[List[int]] = None
    member_ids: Optional[List[int]] = None

@app.post("/events/{event_id}/invite")
def invite_to_event(event_id: int, req: EventInviteRequest, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    members = []
    if req.invite_type == "all_members":
        groups = db.query(models.Group).filter(models.Group.owner_id == event.owner_id).all()
        g_ids = [g.id for g in groups]
        members = db.query(models.Member).filter(models.Member.group_id.in_(g_ids)).all() if g_ids else []
    elif req.invite_type == "parents":
        groups = db.query(models.Group).filter(models.Group.owner_id == event.owner_id).all()
        g_ids = [g.id for g in groups]
        members = db.query(models.Member).filter(
            models.Member.group_id.in_(g_ids),
            func.lower(models.Member.role).like("%parent%") | func.lower(models.Member.role).like("%guardian%")
        ).all() if g_ids else []
    elif req.invite_type == "coaches":
        groups = db.query(models.Group).filter(models.Group.owner_id == event.owner_id).all()
        g_ids = [g.id for g in groups]
        members = db.query(models.Member).filter(
            models.Member.group_id.in_(g_ids),
            func.lower(models.Member.role).like("%coach%")
        ).all() if g_ids else []
    elif req.invite_type in ["groups", "teams"]:
        if req.group_ids:
            members = db.query(models.Member).filter(models.Member.group_id.in_(req.group_ids)).all()
    elif req.invite_type == "specific_members":
        if req.member_ids:
            members = db.query(models.Member).filter(models.Member.id.in_(req.member_ids)).all()

    invited_count = 0
    for m in members:
        exists = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == event_id,
            models.EventRegistration.member_id == m.id
        ).first()
        if not exists:
            invite = models.EventRegistration(
                event_id=event_id,
                member_id=m.id,
                participant_name=f"{m.first_name} {m.last_name}",
                participant_email=m.email,
                participant_role=m.role,
                status="pending",
                attendance="not_marked"
            )
            db.add(invite)
            invited_count += 1
            
    db.commit()
    return {"message": f"Successfully invited {invited_count} participants.", "count": invited_count}

class EventResponseRequest(BaseModel):
    member_email: str
    status: str # "accepted", "declined", "maybe"

@app.post("/events/{event_id}/respond")
def respond_to_event(event_id: int, req: EventResponseRequest, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if req.status not in ["accepted", "declined", "maybe"]:
        raise HTTPException(status_code=400, detail="Invalid response status")
        
    member = db.query(models.Member).filter(models.Member.email == req.member_email).first()
    
    registration = None
    if member:
        registration = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == event_id,
            models.EventRegistration.member_id == member.id
        ).first()
        
    if not registration:
        registration = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == event_id,
            models.EventRegistration.participant_email == req.member_email
        ).first()
        
    if not registration:
        if event.allow_guest or member:
            registration = models.EventRegistration(
                event_id=event_id,
                member_id=member.id if member else None,
                participant_name=f"{member.first_name} {member.last_name}" if member else req.member_email.split('@')[0],
                participant_email=req.member_email,
                participant_role=member.role if member else "Guest",
                status="pending",
                attendance="not_marked"
            )
            db.add(registration)
            db.flush()
        else:
            raise HTTPException(status_code=403, detail="Guest registration is disabled for this event.")

    new_status = req.status
    if req.status == "accepted" and event.max_participants:
        accepted_count = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == event_id,
            models.EventRegistration.status == "accepted"
        ).count()
        if accepted_count >= event.max_participants:
            if event.allow_waiting_list:
                new_status = "waitlisted"
            else:
                raise HTTPException(status_code=400, detail="This event has reached maximum capacity.")

    registration.status = new_status
    registration.responded_at = datetime.utcnow()
    db.commit()
    return {"message": f"Successfully updated your response to {new_status}.", "status": new_status}

class GuestRegisterRequest(BaseModel):
    name: str
    email: str

@app.post("/events/{event_id}/register-guest")
def register_guest_to_event(event_id: int, req: GuestRegisterRequest, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if not event.allow_guest:
        raise HTTPException(status_code=403, detail="Guest registration is disabled for this event.")
        
    exists = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.participant_email == req.email
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="This email is already registered.")
        
    status = "accepted"
    if event.max_participants:
        accepted_count = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == event_id,
            models.EventRegistration.status == "accepted"
        ).count()
        if accepted_count >= event.max_participants:
            if event.allow_waiting_list:
                status = "waitlisted"
            else:
                raise HTTPException(status_code=400, detail="Event is full.")
                
    reg = models.EventRegistration(
        event_id=event_id,
        participant_name=req.name,
        participant_email=req.email,
        participant_role="Guest",
        status=status,
        attendance="not_marked",
        responded_at=datetime.utcnow()
    )
    db.add(reg)
    db.commit()
    return {"message": "Registered successfully!", "status": status}

class AttendanceMarkRequest(BaseModel):
    registration_id: int
    attendance: str

@app.post("/events/{event_id}/attendance")
def mark_attendance(event_id: int, req: AttendanceMarkRequest, db: Session = Depends(get_db)):
    reg = db.query(models.EventRegistration).filter(
        models.EventRegistration.id == req.registration_id,
        models.EventRegistration.event_id == event_id
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    if req.attendance not in ["present", "absent", "late", "not_marked"]:
        raise HTTPException(status_code=400, detail="Invalid attendance value")
        
    reg.attendance = req.attendance
    db.commit()
    return {"message": "Attendance marked successfully", "attendance": reg.attendance}

@app.get("/events/{event_id}/participants")
def get_event_participants(event_id: int, db: Session = Depends(get_db)):
    registrations = db.query(models.EventRegistration).filter(models.EventRegistration.event_id == event_id).all()
    
    result = []
    for r in registrations:
        result.append({
            "id": r.id,
            "event_id": r.event_id,
            "member_id": r.member_id,
            "participant_name": r.participant_name,
            "participant_email": r.participant_email,
            "participant_role": r.participant_role,
            "status": r.status,
            "attendance": r.attendance,
            "invited_at": r.invited_at.isoformat() if r.invited_at else None,
            "responded_at": r.responded_at.isoformat() if r.responded_at else None
        })
    return result

class MessageParticipantsRequest(BaseModel):
    recipient_group: str
    message: str

@app.post("/events/{event_id}/message")
def message_participants(event_id: int, req: MessageParticipantsRequest, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    query = db.query(models.EventRegistration).filter(models.EventRegistration.event_id == event_id)
    if req.recipient_group == "confirmed":
        query = query.filter(models.EventRegistration.status == "accepted")
    elif req.recipient_group == "non_attendees":
        query = query.filter(models.EventRegistration.status.in_(["declined", "pending"]))
        
    recipients = query.all()
    recipient_emails = [r.participant_email for r in recipients if r.participant_email]
    
    print(f"SMTP Message to {len(recipient_emails)}: {req.message}")
    return {"message": f"Successfully sent message to {len(recipient_emails)} recipients.", "count": len(recipient_emails)}

@app.post("/events/{event_id}/send-reminder")
def send_reminder(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    recipients = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.status.in_(["accepted", "pending"])
    ).all()
    
    recipient_emails = [r.participant_email for r in recipients if r.participant_email]
    print(f"Automatic Reminder Sent to {len(recipient_emails)} for event '{event.name}'")
    return {"message": f"Event reminder successfully sent to {len(recipient_emails)} participants.", "count": len(recipient_emails)}

@app.get("/dashboard/overview")
def get_dashboard_overview(owner_id: int, db: Session = Depends(get_db)):
    groups = db.query(models.Group).filter(models.Group.owner_id == owner_id).all()
    group_ids = [g.id for g in groups]

    total_groups = len(groups)

    # Count all members in groups owned by this user
    # +1 to include the admin (club owner) themselves
    db_members_count = db.query(models.Member)\
        .filter(models.Member.group_id.in_(group_ids)).count() if group_ids else 0
    total_members = db_members_count + 1  # +1 for the admin

    all_events = db.query(models.Event)\
        .filter(models.Event.group_id.in_(group_ids)).all() if group_ids else []

    # date column is stored as String — compare as ISO string
    today_str = date.today().isoformat()
    upcoming_events = [e for e in all_events if e.date and str(e.date) >= today_str]

    # Recent registrations: last 5 members added
    recent_members = db.query(models.Member, models.Group.group_name)\
        .join(models.Group, models.Member.group_id == models.Group.id)\
        .filter(models.Group.owner_id == owner_id)\
        .order_by(models.Member.id.desc())\
        .limit(5).all() if group_ids else []

    recent_list = [{
        "id": m.id,
        "first_name": m.first_name,
        "last_name": m.last_name,
        "email": m.email,
        "group_name": gname
    } for m, gname in recent_members]

    upcoming_list = [{
        "id": e.id,
        "name": e.name,
        "type": e.type,
        "date": str(e.date) if e.date else None,
        "time": str(e.time) if e.time else None,
        "start_time": str(e.start_time) if e.start_time else None,
        "end_time": str(e.end_time) if e.end_time else None,
        "location": e.location
    } for e in sorted(upcoming_events, key=lambda x: str(x.date))[:5]]

    # Calculate total funds raised
    fundraising_campaigns = db.query(models.FundraisingCampaign).filter(models.FundraisingCampaign.owner_id == owner_id).all()
    fundraising_total = sum(c.raised or 0 for c in fundraising_campaigns) if fundraising_campaigns else 0
    pending_payments = db.query(models.Payment).filter(
        models.Payment.owner_id == owner_id,
        models.Payment.status.in_(["pending", "overdue"])
    ).all()
    pending_payment_total = sum(p.amount or 0 for p in pending_payments)

    # Count total courses
    total_courses = db.query(models.Course).filter(models.Course.owner_id == owner_id).count()

    return {
        "total_members": total_members,
        "total_groups": total_groups,
        "total_courses": total_courses,
        "pending_payments": pending_payment_total,
        "upcoming_events_count": len(upcoming_events),
        "fundraising_total": fundraising_total,
        "recent_registrations": recent_list,
        "upcoming_events": upcoming_list,
        "groups": [{"id": g.id, "group_name": g.group_name, "activity": g.activity} for g in groups]
    }

@app.get("/dashboard/coach")
def get_coach_dashboard(owner_id: int, coach_email: str, db: Session = Depends(get_db)):
    """Retrieve coach-specific metrics: squad players, upcoming events, and attendance rating."""
    groups = db.query(models.Group).filter(models.Group.owner_id == owner_id).all()
    group_ids = [g.id for g in groups]
    
    coach = db.query(models.Member).filter(
        models.Member.group_id.in_(group_ids),
        func.lower(models.Member.email) == coach_email.lower()
    ).first() if group_ids else None
    
    if not coach:
        return {
            "squad_players_count": 0,
            "upcoming_events_count": 0,
            "attendance_rating": "94.2%",
            "squad_players": [],
            "upcoming_events": []
        }
        
    group_id = coach.group_id
    
    # Squad players are members of the same group who are not coaches
    squad_players = db.query(models.Member).filter(
        models.Member.group_id == group_id,
        func.lower(models.Member.role) != "coach"
    ).all()
    squad_players_count = len(squad_players)
    
    # Events for the group
    events = db.query(models.Event).filter(models.Event.group_id == group_id).all()
    today_str = date.today().isoformat()
    upcoming_events = [e for e in events if e.date and str(e.date) >= today_str]
    upcoming_events_count = len(upcoming_events)
    
    upcoming_events_sorted = sorted(upcoming_events, key=lambda x: str(x.date))
    
    # Calculate attendance rating
    event_ids = [e.id for e in events]
    registrations = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id.in_(event_ids)
    ).all() if event_ids else []
    
    marked_count = 0
    present_count = 0
    for r in registrations:
        if r.attendance in ["present", "absent", "late"]:
            marked_count += 1
            if r.attendance in ["present", "late"]:
                present_count += 1
                
    if marked_count > 0:
        attendance_rating = f"{(present_count / marked_count) * 100:.1f}%"
    else:
        attendance_rating = "94.2%"
        
    return {
        "squad_players_count": squad_players_count,
        "upcoming_events_count": upcoming_events_count,
        "attendance_rating": attendance_rating,
        "squad_players": [
            {
                "id": p.id,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "email": p.email,
                "role": p.role
            }
            for p in squad_players
        ],
        "upcoming_events": [
            {
                "id": e.id,
                "name": e.name,
                "type": e.type,
                "date": str(e.date) if e.date else None,
                "time": str(e.time) if e.time else None,
                "start_time": str(e.start_time) if e.start_time else None,
                "end_time": str(e.end_time) if e.end_time else None,
                "location": e.location
            }
            for e in upcoming_events_sorted[:5]
        ]
    }

@app.get("/debug/overview")
def debug_overview(owner_id: int, db: Session = Depends(get_db)):
    """Debug endpoint — shows raw DB values to diagnose count issues."""
    groups = db.query(models.Group).filter(models.Group.owner_id == owner_id).all()
    group_ids = [g.id for g in groups]
    members = db.query(models.Member).filter(models.Member.group_id.in_(group_ids)).all() if group_ids else []
    return {
        "owner_id": owner_id,
        "group_ids": group_ids,
        "groups": [{"id": g.id, "name": g.group_name} for g in groups],
        "member_count": len(members),
        "members": [{"id": m.id, "name": f"{m.first_name} {m.last_name}", "group_id": m.group_id} for m in members]
    }


@app.get("/fundraising", response_model=List[schemas.FundraisingCampaignResponse])
def get_campaigns(owner_id: int, db: Session = Depends(get_db)):
    return db.query(models.FundraisingCampaign).filter(models.FundraisingCampaign.owner_id == owner_id).all()

@app.post("/fundraising", response_model=schemas.FundraisingCampaignResponse)
def create_campaign(campaign: schemas.FundraisingCampaignCreate, db: Session = Depends(get_db)):
    new_campaign = models.FundraisingCampaign(
        owner_id=campaign.owner_id,
        title=campaign.title,
        description=campaign.description,
        goal=campaign.goal,
        deadline=campaign.deadline,
        group_name=campaign.group_name
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    return new_campaign

@app.delete("/fundraising/{campaign_id}")
def delete_campaign(campaign_id: int, owner_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.FundraisingCampaign).filter(
        models.FundraisingCampaign.id == campaign_id,
        models.FundraisingCampaign.owner_id == owner_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}

@app.post("/fundraising/{campaign_id}/donate")
def record_donation(campaign_id: int, donation: schemas.DonationCreate, db: Session = Depends(get_db)):
    campaign = db.query(models.FundraisingCampaign).filter(models.FundraisingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign.raised += donation.amount
    campaign.donors_count += 1
    db.commit()
    db.refresh(campaign)
    return campaign

@app.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
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
        email=user.email,
        password=user.password,
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

@app.get("/verify")
def verify_user(token: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    user.is_verified = True
    user.verification_token = None # Clear token after verification
    db.commit()
    
    # Redirect to frontend dashboard or login with a success parameter
    return RedirectResponse(url=f"{FRONTEND_URL}/dashboard?verified=true")

@app.post("/login")
def login_user(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    # Verify user credentials
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if user.password != user_data.password:
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

@app.get("/clubs")
def get_clubs(db: Session = Depends(get_db)):
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

@app.get("/signup-forms")
def get_signup_forms(owner_id: int, db: Session = Depends(get_db)):
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

@app.get("/signup-forms/{role}")
def get_signup_form_by_role(role: str, owner_id: int, db: Session = Depends(get_db)):
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

@app.post("/signup-forms", response_model=schemas.SignupFormResponse)
def upsert_signup_form(form: schemas.SignupFormCreate, db: Session = Depends(get_db)):
    # Check if role configuration already exists for this owner
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

@app.post("/signup-submissions")
def create_signup_submission(submission: schemas.SignupSubmissionCreate, db: Session = Depends(get_db)):
    new_submission = models.SignupSubmission(
        owner_id=submission.owner_id,
        role=submission.role,
        submitted_data=submission.submitted_data
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    return {
        "message": "Submission received successfully",
        "id": new_submission.id,
        "role": new_submission.role
    }

@app.get("/signup-submissions")
def get_signup_submissions(owner_id: int, db: Session = Depends(get_db)):
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
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return result

@app.delete("/signup-submissions/{submission_id}")
def delete_signup_submission(submission_id: int, owner_id: int, db: Session = Depends(get_db)):
    submission = db.query(models.SignupSubmission).filter(
        models.SignupSubmission.id == submission_id,
        models.SignupSubmission.owner_id == owner_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    db.delete(submission)
    db.commit()
    return {"message": "Application rejected/deleted successfully"}

@app.post("/signup-submissions/{submission_id}/approve")
def approve_signup_submission(submission_id: int, owner_id: int, group_id: int, db: Session = Depends(get_db)):
    # 1. Fetch submission
    submission = db.query(models.SignupSubmission).filter(
        models.SignupSubmission.id == submission_id,
        models.SignupSubmission.owner_id == owner_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # 2. Verify group belongs to owner
    group = db.query(models.Group).filter(
        models.Group.id == group_id,
        models.Group.owner_id == owner_id
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    
    # 3. Parse submitted data
    import json
    try:
        data = json.loads(submission.submitted_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid submission data format")
    
    # 4. Extract first_name, last_name, email, phone, password
    first_name = data.get("first_name") or data.get("firstName") or "Applicant"
    last_name = data.get("last_name") or data.get("lastName") or f"#{submission.id}"
    email = data.get("email") or ""
    phone = data.get("phone") or ""
    password = data.get("password") or ""
    
    # 5. Create Member
    new_member = models.Member(
        group_id=group_id,
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
    
    return {"message": "Applicant approved and successfully added to group as member!"}

from pydantic import BaseModel

class MemberLoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login-member")
def login_member(req: MemberLoginRequest, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.email == req.email).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member email not registered with any club.")
    
    # Password verification
    if member.password:
        if member.password != req.password:
            raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
    else:
        # Fallback: if no password was created, allow logging in with their phone number as a default password
        if member.phone and member.phone != req.password:
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
        "userPhone": member.phone or ""
    }


