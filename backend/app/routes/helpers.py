import json
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models import models

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
        "fee": event.fee or 0,

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

def normalize_email(value: str | None):
    return "".join(str(value or "").split()).lower()

def normalize_text(value: str | None):
    return str(value or "").strip()

def normalized_email_column(column):
    return func.lower(func.replace(column, " ", ""))

def get_case_insensitive_value(data: dict, key: str):
    for data_key, value in data.items():
        if str(data_key).lower() == key.lower():
            return value
    return None

def parse_submission_data(submission: models.SignupSubmission):
    try:
        data = json.loads(submission.submitted_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid submission data format")

    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid submission data format")

    return data

def get_submission_email(data: dict):
    return normalize_email(get_case_insensitive_value(data, "email"))

def find_approved_member_by_email(db: Session, email_clean: str, owner_id: int | None = None):
    query = db.query(models.Member)
    if owner_id is not None:
        query = query.join(models.Group, models.Member.group_id == models.Group.id).filter(
            models.Group.owner_id == owner_id
        )

    return query.filter(normalized_email_column(models.Member.email) == email_clean).first()

def has_pending_submission_for_email(
    db: Session,
    email_clean: str,
    owner_id: int | None = None,
    exclude_submission_id: int | None = None
):
    query = db.query(models.SignupSubmission)
    if owner_id is not None:
        query = query.filter(models.SignupSubmission.owner_id == owner_id)
    if exclude_submission_id is not None:
        query = query.filter(models.SignupSubmission.id != exclude_submission_id)

    for pending_submission in query.all():
        try:
            data = json.loads(pending_submission.submitted_data)
        except Exception:
            continue
        if isinstance(data, dict) and get_submission_email(data) == email_clean:
            return True

    return False

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

