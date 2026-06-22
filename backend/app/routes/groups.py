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

@router.post("/groups", response_model=schemas.GroupResponse)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    """Create a new club group/team with custom activity type and age group constraint."""
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

@router.post("/groups/import")
async def import_groups_and_members(
    owner_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import groups and members from an uploaded Excel file."""
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

@router.get("/groups")
def get_groups(owner_id: int, db: Session = Depends(get_db)):
    """Retrieve all club groups/teams owned by the club administrator."""
    groups = db.query(models.Group).filter(models.Group.owner_id == owner_id).all()
    return groups

@router.get("/groups/{group_id}", response_model=schemas.GroupResponse)
def get_group(group_id: str, owner_id: int, db: Session = Depends(get_db)):
    # Try fetching by ID first if it's numeric
    """Retrieve a specific club group/team by ID or group name."""
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

@router.delete("/groups/{group_id}")
def delete_group(group_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Delete a specific club group/team and all its associated data."""
    group = db.query(models.Group).filter(
        models.Group.id == group_id,
        models.Group.owner_id == owner_id
    ).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found or access denied")

    db.delete(group)
    db.commit()
    return {"message": "Group deleted successfully"}

@router.post("/groups/{group_id}/members", response_model=schemas.MemberResponse)
def add_member(group_id: int, owner_id: int, member: schemas.MemberCreate, db: Session = Depends(get_db)):
    # Verify the user owns this group
    """Add a new member to a specific club group/team."""
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

@router.post("/groups/{group_id}/members/import")
async def import_members(
    group_id: int,
    owner_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import members into a specific group from an uploaded Excel file."""
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

@router.get("/groups/{group_id}/members")
def get_group_members(group_id: str, owner_id: int, db: Session = Depends(get_db)):
    # First verify the user owns this group
    """Retrieve all members of a specific club group/team."""
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

@router.get("/members")
def get_all_members(owner_id: int, db: Session = Depends(get_db)):
    # Join Member and Group to filter by owner_id
    """Retrieve all members across all groups for the given club administrator."""
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


