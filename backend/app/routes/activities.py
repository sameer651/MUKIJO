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


@router.post("/activities", response_model=schemas.ActivityResponse)
def create_activity(activity: schemas.ActivityCreate, db: Session = Depends(get_db), x_is_member: Optional[str] = Header(None)):
    """Create a new sports activity and auto-rsvp the creator as confirmed."""
    if x_is_member == "true":
        raise HTTPException(status_code=403, detail="Members are not allowed to create games.")
    new_act = models.Activity(
        owner_id=activity.owner_id,
        venue_id=activity.venue_id,
        slot_id=activity.slot_id,
        sport=activity.sport,
        date=activity.date,
        time=activity.time,
        location=activity.location,
        max_players=activity.max_players,
        min_players=activity.min_players or 2,
        skill_level=activity.skill_level or "All",
        description=activity.description,
        status="open"
    )
    db.add(new_act)
    db.commit()
    db.refresh(new_act)

    # Auto join creator
    creator_rsvp = models.ActivityRSVP(
        activity_id=new_act.id,
        user_id=activity.owner_id,
        status="confirmed"
    )
    db.add(creator_rsvp)
    db.commit()
    db.refresh(new_act)
    return new_act

@router.get("/activities", response_model=List[schemas.ActivityResponse])
def get_activities(sport: Optional[str] = None, location: Optional[str] = None, db: Session = Depends(get_db)):
    """Discover sports activities filtered by sport and location."""
    query = db.query(models.Activity)
    if sport and sport != "all":
        query = query.filter(models.Activity.sport == sport)
    if location:
        query = query.filter(models.Activity.location.like(f"%{location}%"))
    return query.all()

@router.post("/activities/{activity_id}/rsvp", response_model=schemas.ActivityRSVPResponse)
def rsvp_activity(activity_id: int, rsvp_data: schemas.ActivityRSVPCreate, db: Session = Depends(get_db)):
    """Join a sports game activity. Places user in waitlist if player limits are exceeded."""
    # Lock the activity row to ensure synchronization
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).with_for_update().first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    # Check if user already RSVP'd
    existing = db.query(models.ActivityRSVP).filter(
        models.ActivityRSVP.activity_id == activity_id,
        models.ActivityRSVP.user_id == rsvp_data.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already registered for this activity.")

    # Calculate confirmed players count
    confirmed_count = db.query(models.ActivityRSVP).filter(
        models.ActivityRSVP.activity_id == activity_id,
        models.ActivityRSVP.status == "confirmed"
    ).count()

    status = "confirmed"
    if confirmed_count >= activity.max_players:
        status = "waitlisted"

    new_rsvp = models.ActivityRSVP(
        activity_id=activity_id,
        user_id=rsvp_data.user_id,
        status=status
    )
    db.add(new_rsvp)
    db.commit()
    db.refresh(new_rsvp)
    return new_rsvp

@router.post("/activities/{activity_id}/cancel-rsvp")
def cancel_rsvp(activity_id: int, user_id: int, db: Session = Depends(get_db)):
    """Cancel a player's RSVP. Auto-promotes the next waitlisted player if a confirmed player leaves."""
    # Lock target activity
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).with_for_update().first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    rsvp = db.query(models.ActivityRSVP).filter(
        models.ActivityRSVP.activity_id == activity_id,
        models.ActivityRSVP.user_id == user_id
    ).first()

    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP registration not found.")

    old_status = rsvp.status
    db.delete(rsvp)
    db.commit()

    # If a confirmed player left, promote the oldest waitlisted player
    if old_status == "confirmed":
        next_waitlisted = db.query(models.ActivityRSVP).filter(
            models.ActivityRSVP.activity_id == activity_id,
            models.ActivityRSVP.status == "waitlisted"
        ).order_by(models.ActivityRSVP.joined_at.asc()).first()

        if next_waitlisted:
            next_waitlisted.status = "confirmed"
            db.commit()

    return {"detail": "RSVP cancelled successfully."}

@router.put("/activities/{activity_id}", response_model=schemas.ActivityResponse)
def update_activity(activity_id: int, activity_update: schemas.ActivityUpdate, db: Session = Depends(get_db), x_is_member: Optional[str] = Header(None)):
    """Reschedule or update details of a sports activity. Restricted to club admins only."""
    if x_is_member == "true":
        raise HTTPException(status_code=403, detail="Members are not allowed to reschedule games.")
        
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")
        
    update_data = activity_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(activity, key, value)
        
    db.commit()
    db.refresh(activity)
    return activity

@router.post("/activities/{activity_id}/cancel")
def cancel_activity(activity_id: int, db: Session = Depends(get_db), x_is_member: Optional[str] = Header(None)):
    """Cancel a sports activity. Restricted to club admins only."""
    if x_is_member == "true":
        raise HTTPException(status_code=403, detail="Members are not allowed to cancel games.")
        
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")
        
    activity.status = "cancelled"
    
    # If there is a slot_id, unblock/cancel the booking so venue is free
    if activity.slot_id:
        booking = db.query(models.Booking).filter(
            models.Booking.slot_id == activity.slot_id,
            models.Booking.status == "reserved"
        ).first()
        if booking:
            booking.status = "cancelled"
            
    db.commit()
    return {"message": "Activity cancelled successfully.", "status": "cancelled"}



