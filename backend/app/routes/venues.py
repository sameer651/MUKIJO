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


@router.post("/venues", response_model=schemas.VenueResponse)
def create_venue(venue: schemas.VenueCreate, db: Session = Depends(get_db)):
    """Add a new sports venue into the discoverable registry."""
    new_venue = models.Venue(
        owner_id=venue.owner_id,
        name=venue.name,
        location=venue.location,
        latitude=venue.latitude,
        longitude=venue.longitude,
        sports_supported=venue.sports_supported,
        amenities=venue.amenities,
        rating=venue.rating or 5.0,
        cover_image=venue.cover_image,
        venue_images=venue.venue_images
    )
    db.add(new_venue)
    db.commit()
    db.refresh(new_venue)
    return new_venue

@router.get("/venues", response_model=List[schemas.VenueResponse])
def get_venues(sport: Optional[str] = None, location: Optional[str] = None, db: Session = Depends(get_db)):
    """Search and discover nearby venues filtered by location and sport."""
    query = db.query(models.Venue)
    if sport and sport != "all":
        query = query.filter(models.Venue.sports_supported.like(f"%{sport}%"))
    if location:
        query = query.filter(models.Venue.location.like(f"%{location}%"))
    return query.all()

@router.post("/venues/{venue_id}/slots", response_model=List[schemas.SlotResponse])
def create_venue_slots(venue_id: int, slots: List[schemas.SlotCreate], db: Session = Depends(get_db)):
    """Batch insert sports slot inventories for a venue."""
    created_slots = []
    for slot in slots:
        new_slot = models.Slot(
            venue_id=venue_id,
            sport=slot.sport,
            start_time=slot.start_time,
            end_time=slot.end_time,
            base_price=slot.base_price,
            current_price=slot.current_price,
            is_blocked=slot.is_blocked
        )
        db.add(new_slot)
        created_slots.append(new_slot)
    db.commit()
    for slot in created_slots:
        db.refresh(slot)
    return created_slots

@router.get("/venues/{venue_id}/slots", response_model=List[schemas.SlotResponse])
def get_venue_slots(venue_id: int, date_str: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch availability schedules/slots for a specific venue, filtered by YYYY-MM-DD."""
    if not date_str:
        from datetime import date
        date_str = date.today().isoformat()
        
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")
        
    venue = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    existing_slots_count = db.query(models.Slot).filter(
        models.Slot.venue_id == venue_id,
        func.date(models.Slot.start_time) == target_date
    ).count()

    if existing_slots_count == 0:
        sports = ["badminton"]
        if venue.sports_supported:
            try:
                parsed = json.loads(venue.sports_supported)
                if isinstance(parsed, list) and len(parsed) > 0:
                    sports = parsed
            except Exception:
                if "," in venue.sports_supported:
                    sports = [s.strip() for s in venue.sports_supported.split(",") if s.strip()]
                elif venue.sports_supported.strip():
                    sports = [venue.sports_supported.strip()]
                    
        default_times = [
            ("07:00", "08:00", 1200),
            ("09:00", "10:00", 1000),
            ("17:00", "18:00", 1500),
            ("19:00", "20:00", 1800)
        ]
        
        for i, (start_t, end_t, price) in enumerate(default_times):
            sport = sports[i % len(sports)]
            start_dt = datetime.combine(target_date, datetime.strptime(start_t, "%H:%M").time())
            end_dt = datetime.combine(target_date, datetime.strptime(end_t, "%H:%M").time())
            
            new_slot = models.Slot(
                venue_id=venue_id,
                sport=sport,
                start_time=start_dt,
                end_time=end_dt,
                base_price=price,
                current_price=price,
                is_blocked=False
            )
            db.add(new_slot)
        db.commit()

    slots = db.query(models.Slot).filter(
        models.Slot.venue_id == venue_id,
        func.date(models.Slot.start_time) == target_date
    ).all()
    
    slot_ids = [s.id for s in slots]
    if slot_ids:
        active_bookings = db.query(models.Booking).filter(
            models.Booking.slot_id.in_(slot_ids),
            models.Booking.status == "reserved"
        ).all()
        booked_slot_ids = {b.slot_id for b in active_bookings}
        for slot in slots:
            if slot.id in booked_slot_ids:
                slot.is_blocked = True
                
    return slots

@router.post("/bookings", response_model=schemas.BookingResponse)
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    """Place a venue slot reservation with concurrency protection to prevent double bookings."""
    # Write lock the target slot row
    slot = db.query(models.Slot).filter(models.Slot.id == booking.slot_id).with_for_update().first()
    
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")
    
    if slot.is_blocked:
        raise HTTPException(status_code=400, detail="Slot is blocked and unavailable.")

    # Check for existing active booking
    existing_booking = db.query(models.Booking).filter(
        models.Booking.slot_id == booking.slot_id,
        models.Booking.status == "reserved"
    ).first()
    
    if existing_booking:
        raise HTTPException(status_code=409, detail="Slot is already booked.")

    # Proceed to create reservation
    new_booking = models.Booking(
        user_id=booking.user_id,
        slot_id=booking.slot_id,
        amount_paid=booking.amount_paid or slot.current_price,
        payment_status=booking.payment_status or "pending",
        status="reserved"
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


@router.get("/venues/owner/{owner_id}", response_model=List[schemas.VenueResponse])
def get_owner_venues(owner_id: int, db: Session = Depends(get_db)):
    """Retrieve all venues owned by a specific partner/owner."""
    return db.query(models.Venue).filter(models.Venue.owner_id == owner_id).all()


@router.post("/venues/{venue_id}/block-slots")
def block_venue_slots(venue_id: int, req: schemas.BlockSlotsRequest, db: Session = Depends(get_db)):
    """Block slots within a date range for holidays or partner reservation."""
    try:
        start_date = datetime.strptime(req.start_date, "%Y-%m-%d").date()
        end_date = datetime.strptime(req.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date.")

    venue = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    slots = db.query(models.Slot).filter(
        models.Slot.venue_id == venue_id,
        func.date(models.Slot.start_time) >= start_date,
        func.date(models.Slot.start_time) <= end_date
    )
    if req.sport:
        slots = slots.filter(models.Slot.sport == req.sport)
    
    slots_list = slots.all()
    for slot in slots_list:
        slot.is_blocked = True
        
    db.commit()
    return {"message": f"Successfully blocked {len(slots_list)} slots between {req.start_date} and {req.end_date}."}


@router.post("/venues/{venue_id}/unblock-slots")
def unblock_venue_slots(venue_id: int, req: schemas.UnblockSlotsRequest, db: Session = Depends(get_db)):
    """Unblock slots within a date range."""
    try:
        start_date = datetime.strptime(req.start_date, "%Y-%m-%d").date()
        end_date = datetime.strptime(req.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date.")

    venue = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    slots = db.query(models.Slot).filter(
        models.Slot.venue_id == venue_id,
        func.date(models.Slot.start_time) >= start_date,
        func.date(models.Slot.start_time) <= end_date
    )
    if req.sport:
        slots = slots.filter(models.Slot.sport == req.sport)
    
    slots_list = slots.all()
    for slot in slots_list:
        slot.is_blocked = False
        
    db.commit()
    return {"message": f"Successfully unblocked {len(slots_list)} slots between {req.start_date} and {req.end_date}."}


@router.get("/venues/{venue_id}/payouts", response_model=schemas.PayoutsResponse)
def get_venue_payouts(venue_id: int, db: Session = Depends(get_db)):
    """Calculate revenue, platform fees, and payout history for a venue."""
    venue = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    bookings = db.query(models.Booking).join(models.Slot).filter(
        models.Slot.venue_id == venue_id,
        models.Booking.payment_status == "paid"
    ).all()

    total_revenue = sum(b.amount_paid for b in bookings)
    platform_fee = round(total_revenue * 0.10, 2)
    final_payout = round(total_revenue * 0.90, 2)

    payout_history = []
    monthly_data = {}
    
    for booking in bookings:
        month_key = booking.booking_date.strftime("%Y-%m")
        monthly_data[month_key] = monthly_data.get(month_key, 0) + booking.amount_paid

    sorted_months = sorted(monthly_data.keys(), reverse=True)
    for i, month in enumerate(sorted_months):
        m_revenue = monthly_data[month]
        m_payout = round(m_revenue * 0.90, 2)
        current_month = datetime.utcnow().strftime("%Y-%m")
        status = "processing" if month == current_month else "transferred"
        
        payout_history.append(
            schemas.PayoutHistoryResponse(
                id=f"PAY-{venue_id}-{month.replace('-', '')}",
                date=f"{month}-28",
                amount=m_payout,
                status=status,
                utr=f"UTR{venue_id:04d}{month.replace('-', '')}{i:02d}" if status == "transferred" else "PENDING"
            )
        )

    if not payout_history:
        payout_history.append(
            schemas.PayoutHistoryResponse(
                id=f"PAY-{venue_id}-MOCK",
                date=datetime.utcnow().strftime("%Y-%m-%d"),
                amount=0.0,
                status="processing",
                utr="PENDING"
            )
        )

    return schemas.PayoutsResponse(
        total_revenue=float(total_revenue),
        platform_fee=float(platform_fee),
        final_payout=float(final_payout),
        payout_history=payout_history
    )


@router.get("/venues/{venue_id}/analytics", response_model=schemas.SaaSAnalyticsResponse)
def get_venue_analytics(venue_id: int, db: Session = Depends(get_db)):
    """Generate analytics for occupancy, peak hours, revenue trends, and customer retention."""
    venue = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    total_slots = db.query(models.Slot).filter(models.Slot.venue_id == venue_id).count()
    bookings = db.query(models.Booking).join(models.Slot).filter(
        models.Slot.venue_id == venue_id
    ).all()
    
    total_bookings = len(bookings)
    paid_bookings = [b for b in bookings if b.payment_status == "paid"]
    total_revenue = sum(b.amount_paid for b in paid_bookings)

    occupancy_rate = round((total_bookings / total_slots * 100), 1) if total_slots > 0 else 0.0

    hour_counts = {}
    for booking in bookings:
        hour_str = booking.slot.start_time.strftime("%I:%M %p")
        hour_counts[hour_str] = hour_counts.get(hour_str, 0) + 1

    peak_hours = []
    for time_slot, count in hour_counts.items():
        pct = round((count / total_bookings * 100), 1) if total_bookings > 0 else 0.0
        peak_hours.append(
            schemas.PeakHourInfo(
                time=time_slot,
                bookings_count=count,
                percentage=pct
            )
        )
    peak_hours = sorted(peak_hours, key=lambda x: x.bookings_count, reverse=True)[:5]

    monthly_revenue = {}
    for b in paid_bookings:
        month_name = b.booking_date.strftime("%B %Y")
        monthly_revenue[month_name] = monthly_revenue.get(month_name, 0.0) + float(b.amount_paid)

    revenue_trends = []
    if not monthly_revenue:
        revenue_trends.append(
            schemas.RevenueTrendInfo(
                month=datetime.utcnow().strftime("%B %Y"),
                revenue=0.0
            )
        )
    else:
        for month, rev in monthly_revenue.items():
            revenue_trends.append(
                schemas.RevenueTrendInfo(
                    month=month,
                    revenue=rev
                )
            )
        revenue_trends = sorted(revenue_trends, key=lambda x: x.month)

    user_bookings = {}
    for b in bookings:
        user_id = b.user_id
        if user_id not in user_bookings:
            user_bookings[user_id] = []
        user_bookings[user_id].append(b)

    customer_retention = []
    for u_id, u_bookings in user_bookings.items():
        user = db.query(models.User).filter(models.User.id == u_id).first()
        u_name = f"{user.first_name} {user.last_name}" if user else f"User {u_id}"
        u_email = user.email if user else "N/A"
        
        bookings_count = len(u_bookings)
        is_repeat = bookings_count > 1
        
        customer_retention.append(
            schemas.CustomerRetentionInfo(
                user_id=u_id,
                user_name=u_name,
                user_email=u_email,
                bookings_count=bookings_count,
                is_repeat=is_repeat
            )
        )
        
    customer_retention = sorted(customer_retention, key=lambda x: x.bookings_count, reverse=True)[:10]

    return schemas.SaaSAnalyticsResponse(
        occupancy_rate=occupancy_rate,
        total_revenue=float(total_revenue),
        total_bookings=total_bookings,
        peak_hours=peak_hours,
        revenue_trends=revenue_trends,
        customer_retention=customer_retention
    )


