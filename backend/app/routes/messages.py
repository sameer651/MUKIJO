from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()

@router.post("/messages", response_model=schemas.MessageResponse)
def send_message(message: schemas.MessageCreate, db: Session = Depends(get_db)):
    """Send a new message to a group/team chat or as a direct message (DM)."""
    if message.group_id:
        group = db.query(models.Group).filter(models.Group.id == message.group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found.")

    new_msg = models.Message(
        sender_id=message.sender_id,
        sender_type=message.sender_type,
        sender_name=message.sender_name.strip(),
        group_id=message.group_id,
        channel=message.channel,
        recipient_id=message.recipient_id,
        recipient_type=message.recipient_type,
        content=message.content.strip()
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@router.get("/messages/group/{group_id}", response_model=List[schemas.MessageResponse])
def get_group_messages(group_id: int, channel: Optional[str] = "general", db: Session = Depends(get_db)):
    """Retrieve chat history transcripts for a group/team chat channel."""
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    query = db.query(models.Message).filter(models.Message.group_id == group_id)
    if channel:
        query = query.filter(models.Message.channel == channel)
    return query.order_by(models.Message.created_at.asc()).all()

@router.get("/messages/dm/{recipient_id}", response_model=List[schemas.MessageResponse])
def get_direct_messages(
    recipient_id: int,
    recipient_type: str,
    sender_id: int,
    sender_type: str,
    db: Session = Depends(get_db)
):
    """Retrieve 1-on-1 chat history between two participants."""
    cond1 = (
        (models.Message.sender_id == sender_id) &
        (models.Message.sender_type == sender_type) &
        (models.Message.recipient_id == recipient_id) &
        (models.Message.recipient_type == recipient_type)
    )
    cond2 = (
        (models.Message.sender_id == recipient_id) &
        (models.Message.sender_type == recipient_type) &
        (models.Message.recipient_id == sender_id) &
        (models.Message.recipient_type == sender_type)
    )
    return db.query(models.Message).filter(cond1 | cond2).order_by(models.Message.created_at.asc()).all()

@router.get("/messages/partners")
def get_chat_partners(club_id: int, db: Session = Depends(get_db)):
    """Retrieve potential chat partners (admins and members) for a club."""
    partners = []
    
    # 1. Fetch club admin/owners
    admins = db.query(models.User).filter(models.User.id == club_id).all()
    for admin in admins:
        name = f"{admin.first_name} {admin.last_name}".strip()
        if admin.club_name:
            name += f" ({admin.club_name})"
        partners.append({
            "id": admin.id,
            "name": name or admin.email,
            "email": admin.email,
            "type": "admin"
        })
        
    # 2. Fetch club members
    members = db.query(models.Member).join(models.Group).filter(models.Group.owner_id == club_id).all()
    for member in members:
        partners.append({
            "id": member.id,
            "name": f"{member.first_name} {member.last_name}".strip(),
            "email": member.email,
            "type": "member"
        })
        
    return partners
