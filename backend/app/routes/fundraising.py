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


@router.get("/fundraising", response_model=List[schemas.FundraisingCampaignResponse])
def get_campaigns(owner_id: int, db: Session = Depends(get_db)):
    """Retrieve all fundraising campaigns created by the club administrator."""
    return db.query(models.FundraisingCampaign).filter(models.FundraisingCampaign.owner_id == owner_id).all()

@router.post("/fundraising", response_model=schemas.FundraisingCampaignResponse)
def create_campaign(campaign: schemas.FundraisingCampaignCreate, db: Session = Depends(get_db)):
    """Create a new fundraising campaign with a target goal and deadline."""
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

@router.delete("/fundraising/{campaign_id}")
def delete_campaign(campaign_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Delete a specific fundraising campaign."""
    campaign = db.query(models.FundraisingCampaign).filter(
        models.FundraisingCampaign.id == campaign_id,
        models.FundraisingCampaign.owner_id == owner_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}

@router.post("/fundraising/{campaign_id}/donate")
def record_donation(campaign_id: int, donation: schemas.DonationCreate, db: Session = Depends(get_db)):
    """Record a standard off-line or test donation directly increasing the campaign's raised amount."""
    campaign = db.query(models.FundraisingCampaign).filter(models.FundraisingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.raised += donation.amount
    campaign.donors_count += 1
    db.commit()
    db.refresh(campaign)
    return campaign

@router.post("/fundraising/{campaign_id}/initiate-donation")
def initiate_donation(campaign_id: int, donation: schemas.DonationCreate, db: Session = Depends(get_db)):
    """Initiate an online donation payment request for a fundraising campaign."""
    campaign = db.query(models.FundraisingCampaign).filter(models.FundraisingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    temp_payment = models.Payment(
        owner_id=campaign.owner_id,
        title=f"Donation to: {campaign.title}",
        description=f"campaign_id:{campaign_id}|donor_name:{donation.donor_name}|donor_email:{donation.donor_email or ''}",
        category="Donation",
        amount=donation.amount,
        status="pending"
    )
    db.add(temp_payment)
    db.commit()
    db.refresh(temp_payment)
    return {"payment_id": temp_payment.id, "owner_id": campaign.owner_id}

class CompleteDonationRequest(BaseModel):
    payment_id: int
    owner_id: int

@router.post("/fundraising/{campaign_id}/complete-donation")
def complete_donation(campaign_id: int, req: CompleteDonationRequest, db: Session = Depends(get_db)):
    """Complete and record a campaign donation after validating the payment status."""
    campaign = db.query(models.FundraisingCampaign).filter(models.FundraisingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    payment = db.query(models.Payment).filter(
        models.Payment.id == req.payment_id,
        models.Payment.owner_id == req.owner_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Donation payment record not found")

    if payment.status != "paid":
        raise HTTPException(status_code=400, detail="Donation payment has not been successfully completed yet")

    if payment.description and "completed_donation:true" in payment.description:
        return {"message": "Donation already completed and recorded", "campaign": campaign}

    campaign.raised += payment.amount
    campaign.donors_count += 1
    payment.description = f"{payment.description}|completed_donation:true"
    db.commit()
    db.refresh(campaign)
    return {"message": "Donation recorded successfully!", "campaign": campaign}


