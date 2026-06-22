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


router = APIRouter()

COURSE_STATUSES = {"draft", "open", "full", "closed", "completed"}
COURSE_REGISTRATION_STATUSES = {"registered", "waitlisted", "cancelled", "completed"}
COURSE_PAYMENT_STATUSES = {"unpaid", "paid", "waived"}

@router.get("/courses/summary")
def get_courses_summary(owner_id: int, db: Session = Depends(get_db)):
    """Retrieve a summary of course registration counts and active course revenue."""
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

@router.get("/courses", response_model=List[schemas.CourseResponse])
def get_courses(
    owner_id: int,
    status: str = "all",
    group_id: Optional[int] = None,
    member_email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve all courses, optionally filtered by status, group, or member registration email."""
    if member_email:
        email_clean = member_email.replace(" ", "").lower()
        registrations = db.query(models.CourseRegistration).filter(
            func.lower(models.CourseRegistration.participant_email) == email_clean,
            models.CourseRegistration.status == "registered"
        ).all()
        course_ids = [r.course_id for r in registrations]
        
        member = db.query(models.Member).filter(func.lower(models.Member.email) == email_clean).first()
        if member:
            reg_member = db.query(models.CourseRegistration).filter(
                models.CourseRegistration.member_id == member.id,
                models.CourseRegistration.status == "registered"
            ).all()
            course_ids.extend([r.course_id for r in reg_member])
            
        course_ids = list(set(course_ids))
        query = db.query(models.Course).filter(models.Course.id.in_(course_ids)) if course_ids else None
        if not query:
            return []
    else:
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

@router.post("/courses", response_model=schemas.CourseResponse)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    """Create a new course with specific capacity, fee, schedule, and level details."""
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

@router.get("/courses/{course_id}", response_model=schemas.CourseResponse)
def get_course(course_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a specific course."""
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.owner_id == owner_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return serialize_course(course)

@router.put("/courses/{course_id}", response_model=schemas.CourseResponse)
def update_course(course_id: int, owner_id: int, course_update: schemas.CourseUpdate, db: Session = Depends(get_db)):
    """Update the configuration and details of an existing course."""
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

@router.delete("/courses/{course_id}")
def delete_course(course_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Delete an existing course from the system."""
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.owner_id == owner_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}

@router.get("/courses/{course_id}/registrations", response_model=List[schemas.CourseRegistrationResponse])
def get_course_registrations(course_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Retrieve all member registrations for a specific course."""
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

@router.post("/courses/{course_id}/registrations", response_model=schemas.CourseRegistrationResponse)
def create_course_registration(
    course_id: int,
    registration: schemas.CourseRegistrationCreate,
    db: Session = Depends(get_db)
):
    """Register a club member or guest participant for a specific course."""
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

    payment_status = "unpaid"

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

@router.put("/course-registrations/{registration_id}", response_model=schemas.CourseRegistrationResponse)
def update_course_registration(
    registration_id: int,
    owner_id: int,
    registration_update: schemas.CourseRegistrationUpdate,
    db: Session = Depends(get_db)
):
    """Update the status or notes of an existing course registration."""
    registration = db.query(models.CourseRegistration).filter(
        models.CourseRegistration.id == registration_id,
        models.CourseRegistration.owner_id == owner_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    update_data = registration_update.dict(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in COURSE_REGISTRATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid registration status")
    if "payment_status" in update_data:
        raise HTTPException(status_code=400, detail="Course payment status is updated automatically after online payment")

    for key, value in update_data.items():
        setattr(registration, key, value)

    db.commit()
    db.refresh(registration)
    return serialize_course_registration(registration)

@router.delete("/course-registrations/{registration_id}")
def delete_course_registration(registration_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Cancel and delete an existing course registration."""
    registration = db.query(models.CourseRegistration).filter(
        models.CourseRegistration.id == registration_id,
        models.CourseRegistration.owner_id == owner_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    db.delete(registration)
    db.commit()
    return {"message": "Registration removed successfully"}

