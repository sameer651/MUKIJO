from pydantic import BaseModel
from typing import Optional, List

class MemberCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    role: Optional[str] = "Member"

class MemberResponse(BaseModel):
    id: int
    group_id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    role: str

    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    name: str
    type: str
    date: str
    time: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[int] = None
    group_id: Optional[int] = None
    
    cover_image: Optional[str] = None
    registration_deadline: Optional[str] = None
    max_participants: Optional[int] = None
    fee: Optional[int] = 0
    
    auto_reminder: Optional[bool] = False
    attendance_tracking: Optional[bool] = False
    is_public: Optional[bool] = True
    allow_guest: Optional[bool] = False
    allow_waiting_list: Optional[bool] = False
    
    rules_pdf: Optional[str] = None
    schedule_file: Optional[str] = None
    permission_forms: Optional[str] = None
    match_fixtures: Optional[str] = None
    event_posters: Optional[str] = None

class EventUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    group_id: Optional[int] = None
    
    cover_image: Optional[str] = None
    registration_deadline: Optional[str] = None
    max_participants: Optional[int] = None
    fee: Optional[int] = None
    
    auto_reminder: Optional[bool] = None
    attendance_tracking: Optional[bool] = None
    is_public: Optional[bool] = None
    allow_guest: Optional[bool] = None
    allow_waiting_list: Optional[bool] = None
    
    rules_pdf: Optional[str] = None
    schedule_file: Optional[str] = None
    permission_forms: Optional[str] = None
    match_fixtures: Optional[str] = None
    event_posters: Optional[str] = None

class EventResponse(BaseModel):
    id: int
    group_id: Optional[int] = None
    owner_id: Optional[int] = None
    name: str
    type: str
    date: str
    time: Optional[str]
    start_time: Optional[str]
    end_time: Optional[str]
    location: Optional[str]
    description: Optional[str]
    
    cover_image: Optional[str] = None
    registration_deadline: Optional[str] = None
    max_participants: Optional[int] = None
    fee: Optional[int] = 0
    
    auto_reminder: bool
    attendance_tracking: bool
    is_public: bool
    allow_guest: bool
    allow_waiting_list: bool
    
    rules_pdf: Optional[str] = None
    schedule_file: Optional[str] = None
    permission_forms: Optional[str] = None
    match_fixtures: Optional[str] = None
    event_posters: Optional[str] = None
    group_name: Optional[str] = None

    class Config:
        from_attributes = True

from datetime import datetime

class EventRegistrationCreate(BaseModel):
    event_id: int
    member_id: Optional[int] = None
    participant_name: str
    participant_email: Optional[str] = None
    participant_role: Optional[str] = "Member"
    status: Optional[str] = "pending"

class EventRegistrationUpdate(BaseModel):
    status: Optional[str] = None
    attendance: Optional[str] = None

class EventRegistrationResponse(BaseModel):
    id: int
    event_id: int
    member_id: Optional[int] = None
    participant_name: str
    participant_email: Optional[str] = None
    participant_role: Optional[str] = None
    status: str
    attendance: str
    invited_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GroupCreate(BaseModel):
    activity: str
    age_group: str
    group_name: str
    sub_group: Optional[str] = None
    description: Optional[str] = None
    owner_id: int # ID of the user who owns this group

class GroupResponse(BaseModel):

    id: int
    activity: str
    age_group: str
    group_name: str
    sub_group: Optional[str]
    description: Optional[str]

    members: List[MemberResponse] = []
    events: List[EventResponse] = []

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    clubName: str
    country: str
    state: Optional[str] = None
    memberCount: Optional[str] = None
    sport: Optional[str] = None
    firstName: str
    lastName: str
    email: str
    password: str
    phone: Optional[str] = None
    aadharNumber: Optional[str] = None
    hearAbout: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    club_name: Optional[str]
    first_name: str
    email: str
    is_verified: bool

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class FundraisingCampaignCreate(BaseModel):
    title: str
    goal: int
    description: Optional[str] = None
    deadline: Optional[str] = None
    group_name: Optional[str] = None
    owner_id: int

class FundraisingCampaignResponse(BaseModel):
    id: int
    owner_id: int
    title: str
    description: Optional[str]
    goal: int
    raised: int
    status: str
    deadline: Optional[str]
    group_name: Optional[str]
    donors_count: int

    class Config:
        from_attributes = True

class DonationCreate(BaseModel):
    amount: int
    donor_name: Optional[str] = "Anonymous"
    donor_email: Optional[str] = None

class PaymentCreate(BaseModel):
    title: str
    amount: int
    owner_id: int
    description: Optional[str] = None
    category: Optional[str] = "Membership Fee"
    due_date: Optional[str] = None
    group_id: Optional[int] = None
    member_id: Optional[int] = None
    status: Optional[str] = "pending"
    payment_method: Optional[str] = None
    paid_at: Optional[str] = None

class PaymentUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[int] = None
    description: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    group_id: Optional[int] = None
    member_id: Optional[int] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    paid_at: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    owner_id: int
    group_id: Optional[int]
    member_id: Optional[int]
    title: str
    description: Optional[str]
    category: str
    amount: int
    due_date: Optional[str]
    status: str
    payment_method: Optional[str]
    paid_at: Optional[str]
    created_at: Optional[str] = None
    group_name: Optional[str] = None
    member_name: Optional[str] = None

    class Config:
        from_attributes = True

class RazorpayOrderCreate(BaseModel):
    payment_id: int
    owner_id: int

class RazorpayOrderResponse(BaseModel):
    key_id: str
    razorpay_order_id: str
    local_order_id: int
    payment_id: int
    amount: int
    currency: str
    name: str
    description: Optional[str] = None
    prefill_name: Optional[str] = None
    prefill_email: Optional[str] = None
    prefill_contact: Optional[str] = None

class RazorpayVerifyRequest(BaseModel):
    payment_id: int
    owner_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class CourseCreate(BaseModel):
    title: str
    owner_id: int
    code: Optional[str] = None
    category: Optional[str] = "Training"
    level: Optional[str] = None
    description: Optional[str] = None
    instructor: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    schedule: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = 20
    fee: Optional[int] = 0
    status: Optional[str] = "open"
    group_id: Optional[int] = None

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    instructor: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    schedule: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    fee: Optional[int] = None
    status: Optional[str] = None
    group_id: Optional[int] = None

class CourseResponse(BaseModel):
    id: int
    owner_id: int
    group_id: Optional[int]
    title: str
    code: Optional[str]
    category: str
    level: Optional[str]
    description: Optional[str]
    instructor: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    schedule: Optional[str]
    location: Optional[str]
    capacity: int
    fee: int
    status: str
    created_at: Optional[str] = None
    group_name: Optional[str] = None
    registration_count: int = 0
    available_seats: int = 0
    paid_count: int = 0

    class Config:
        from_attributes = True

class CourseRegistrationCreate(BaseModel):
    owner_id: int
    member_id: Optional[int] = None
    participant_name: Optional[str] = None
    participant_email: Optional[str] = None
    participant_phone: Optional[str] = None
    status: Optional[str] = "registered"
    payment_status: Optional[str] = "unpaid"
    notes: Optional[str] = None

class CourseRegistrationUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None

class CourseRegistrationResponse(BaseModel):
    id: int
    owner_id: int
    course_id: int
    member_id: Optional[int]
    participant_name: str
    participant_email: Optional[str]
    participant_phone: Optional[str]
    status: str
    payment_status: str
    notes: Optional[str]
    registered_at: Optional[str] = None
    course_title: Optional[str] = None
    group_name: Optional[str] = None

    class Config:
        from_attributes = True

from datetime import datetime

class SignupFormCreate(BaseModel):
    owner_id: int
    role: str
    title: str
    description: Optional[str] = None
    fields: str # JSON list of fields: label, type, required, etc.

class SignupFormResponse(BaseModel):
    id: int
    owner_id: int
    role: str
    title: str
    description: Optional[str]
    fields: str

    class Config:
        from_attributes = True

class SignupSubmissionCreate(BaseModel):
    owner_id: int
    role: str
    submitted_data: str # JSON dictionary of submission data

class SignupSubmissionResponse(BaseModel):
    id: int
    owner_id: int
    role: str
    submitted_data: str
    created_at: datetime

    class Config:
        from_attributes = True

