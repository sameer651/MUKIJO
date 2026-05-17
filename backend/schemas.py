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

class EventUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

class EventResponse(BaseModel):
    id: int
    group_id: int
    name: str
    type: str
    date: str
    time: Optional[str]
    start_time: Optional[str]
    end_time: Optional[str]
    location: Optional[str]

    description: Optional[str]

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
