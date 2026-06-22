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
from pydantic import BaseModel


router = APIRouter()


@router.post("/groups/{group_id}/events", response_model=schemas.EventResponse)
def create_event(group_id: int, owner_id: int, event: schemas.EventCreate, db: Session = Depends(get_db)):
    """Create a new event within a specific group/team with optional fees, documents, and rules."""
    db_group = db.query(models.Group).filter(
        models.Group.id == group_id,
        models.Group.owner_id == owner_id
    ).first()

    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")
    if event.fee is not None and event.fee < 0:
        raise HTTPException(status_code=400, detail="Event fee cannot be negative")

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
        fee=event.fee or 0,
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

@router.get("/groups/{group_id}/events")
def get_group_events(group_id: str, owner_id: int, db: Session = Depends(get_db)):
    # Verify ownership
    """Retrieve all events associated with a specific group/team."""
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

@router.get("/events")
def get_all_events(owner_id: int, member_email: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve all events owned by the club administrator or their groups, optionally filtered by member email."""
    if member_email:
        email_clean = member_email.replace(" ", "").lower()
        registrations = db.query(models.EventRegistration).filter(
            func.lower(models.EventRegistration.participant_email) == email_clean,
            models.EventRegistration.status == "accepted"
        ).all()
        event_ids = [r.event_id for r in registrations]
        
        member = db.query(models.Member).filter(func.lower(models.Member.email) == email_clean).first()
        if member:
            reg_member = db.query(models.EventRegistration).filter(
                models.EventRegistration.member_id == member.id,
                models.EventRegistration.status == "accepted"
            ).all()
            event_ids.extend([r.event_id for r in reg_member])
            
        event_ids = list(set(event_ids))
        events = db.query(models.Event).filter(models.Event.id.in_(event_ids)).all() if event_ids else []
    else:
        events = db.query(models.Event).filter(models.Event.owner_id == owner_id).all()
        # Fallback: find all groups owned by the user and look up their events
        if not events:
            groups = db.query(models.Group).filter(models.Group.owner_id == owner_id).all()
            group_ids = [g.id for g in groups]
            events = db.query(models.Event).filter(models.Event.group_id.in_(group_ids)).all() if group_ids else []

    return [serialize_event(e) for e in events]

@router.get("/events/{event_id}")
def get_event(event_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a specific event."""
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Verify ownership
    if event.owner_id != owner_id:
        group = db.query(models.Group).filter(models.Group.id == event.group_id, models.Group.owner_id == owner_id).first()
        if not group:
            raise HTTPException(status_code=403, detail="Access denied to event")

    return serialize_event(event)

@router.put("/events/{event_id}", response_model=schemas.EventResponse)
def update_event(event_id: int, owner_id: int, event_update: schemas.EventUpdate, db: Session = Depends(get_db)):
    """Update details of an existing event."""
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Verify ownership
    if db_event.owner_id != owner_id:
        group = db.query(models.Group).filter(models.Group.id == db_event.group_id, models.Group.owner_id == owner_id).first()
        if not group:
            raise HTTPException(status_code=403, detail="Access denied")

    update_data = event_update.dict(exclude_unset=True)
    if "fee" in update_data and update_data["fee"] is not None and update_data["fee"] < 0:
        raise HTTPException(status_code=400, detail="Event fee cannot be negative")

    for key, value in update_data.items():
        setattr(db_event, key, value)

    db.commit()
    db.refresh(db_event)
    return serialize_event(db_event)

@router.delete("/events/{event_id}")
def delete_event(event_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Delete an existing event from the system."""
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

@router.post("/events/{event_id}/invite")
def invite_to_event(event_id: int, req: EventInviteRequest, db: Session = Depends(get_db)):
    """Invite members, coaches, parents, or groups to an event, creating pending registrations."""
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

@router.post("/events/{event_id}/respond")
def respond_to_event(event_id: int, req: EventResponseRequest, db: Session = Depends(get_db)):
    """Submit a participant's response (accepted, declined, maybe) to an event invitation."""
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if req.status not in ["accepted", "declined", "maybe"]:
        raise HTTPException(status_code=400, detail="Invalid response status")

    member_email_clean = req.member_email.replace(" ", "").lower() if req.member_email else ""
    member = db.query(models.Member).filter(func.lower(models.Member.email) == member_email_clean).first()

    registration = None
    if member:
        registration = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == event_id,
            models.EventRegistration.member_id == member.id
        ).first()

    if not registration:
        registration = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == event_id,
            func.lower(models.EventRegistration.participant_email) == member_email_clean
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

@router.post("/events/{event_id}/register-guest")
def register_guest_to_event(event_id: int, req: GuestRegisterRequest, db: Session = Depends(get_db)):
    """Register a guest participant for an event with capacity checks."""
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

@router.post("/events/{event_id}/attendance")
def mark_attendance(event_id: int, req: AttendanceMarkRequest, db: Session = Depends(get_db)):
    """Mark event attendance (present, absent, late, not_marked) for a registration."""
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

@router.get("/events/{event_id}/participants")
def get_event_participants(event_id: int, db: Session = Depends(get_db)):
    """Retrieve list of invited and registered participants for a specific event."""
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

@router.post("/events/{event_id}/message")
def message_participants(event_id: int, req: MessageParticipantsRequest, db: Session = Depends(get_db)):
    """Send an email or message to event participants filtered by attendance response status."""
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

@router.post("/events/{event_id}/send-reminder")
def send_reminder(event_id: int, db: Session = Depends(get_db)):
    """Send an automatic event reminder email to all accepted and pending participants."""
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

@router.get("/members/registrations")
def get_member_registrations(member_email: str, db: Session = Depends(get_db)):
    """Retrieve all event registrations for a specific member by their email."""
    email_clean = member_email.replace(" ", "").lower()
    registrations = db.query(models.EventRegistration).filter(
        func.lower(models.EventRegistration.participant_email) == email_clean
    ).all()
    
    # Also fetch by member_id
    member = db.query(models.Member).filter(func.lower(models.Member.email) == email_clean).first()
    if member:
        reg_member = db.query(models.EventRegistration).filter(
            models.EventRegistration.member_id == member.id
        ).all()
        # Merge without duplicates
        reg_ids = {r.id for r in registrations}
        for r in reg_member:
            if r.id not in reg_ids:
                registrations.append(r)
                
    return [{
        "id": r.id,
        "event_id": r.event_id,
        "member_id": r.member_id,
        "participant_name": r.participant_name,
        "participant_email": r.participant_email,
        "status": r.status,
        "attendance": r.attendance
    } for r in registrations]

