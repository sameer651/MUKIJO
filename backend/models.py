from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    activity = Column(String, nullable=False)
    age_group = Column(String, nullable=False)
    group_name = Column(String, nullable=False)
    sub_group = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id")) # Link group to a specific user

    members = relationship("Member", back_populates="group")

    owner = relationship("User", back_populates="groups")
    events = relationship("Event", back_populates="group")
    payments = relationship("Payment", back_populates="group")
    courses = relationship("Course", back_populates="group")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # Event category
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    # Event Details & Cover Image
    cover_image = Column(String, nullable=True)
    registration_deadline = Column(String, nullable=True)
    max_participants = Column(Integer, nullable=True)
    
    # Event Settings
    auto_reminder = Column(Boolean, default=False)
    attendance_tracking = Column(Boolean, default=False)
    is_public = Column(Boolean, default=True)
    allow_guest = Column(Boolean, default=False)
    allow_waiting_list = Column(Boolean, default=False)
    
    # Attachments
    rules_pdf = Column(String, nullable=True)
    schedule_file = Column(String, nullable=True)
    permission_forms = Column(String, nullable=True)
    match_fixtures = Column(String, nullable=True)
    event_posters = Column(String, nullable=True)

    group = relationship("Group", back_populates="events")
    owner = relationship("User", back_populates="events")
    registrations = relationship("EventRegistration", back_populates="event", cascade="all, delete-orphan")

class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)
    participant_name = Column(String, nullable=False)
    participant_email = Column(String, nullable=True)
    participant_role = Column(String, nullable=True) # Coach, Parent, Player, Guest, etc.
    status = Column(String, default="pending") # pending, accepted, declined, maybe, waitlisted
    attendance = Column(String, default="not_marked") # present, absent, late, not_marked
    invited_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)

    event = relationship("Event", back_populates="registrations")
    member = relationship("Member")

class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(String, default="Member")
    password = Column(String, nullable=True)

    group = relationship("Group", back_populates="members")
    payments = relationship("Payment", back_populates="member")
    course_registrations = relationship("CourseRegistration", back_populates="member")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    club_name = Column(String)
    country = Column(String)
    state = Column(String)
    member_count = Column(String)
    sport = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    aadhar_number = Column(String, nullable=True)
    password = Column(String, nullable=True) # Added password field
    hear_about = Column(String)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)

    groups = relationship("Group", back_populates="owner")
    events = relationship("Event", back_populates="owner")
    fundraising_campaigns = relationship("FundraisingCampaign", back_populates="owner")
    payments = relationship("Payment", back_populates="owner")
    courses = relationship("Course", back_populates="owner")
    course_registrations = relationship("CourseRegistration", back_populates="owner")
    signup_forms = relationship("SignupForm", back_populates="owner", cascade="all, delete-orphan")
    signup_submissions = relationship("SignupSubmission", back_populates="owner", cascade="all, delete-orphan")

class FundraisingCampaign(Base):
    __tablename__ = "fundraising_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(Integer, nullable=False)
    raised = Column(Integer, default=0)
    status = Column(String, default="active") # active, paused, completed
    deadline = Column(String, nullable=True)
    group_name = Column(String, nullable=True)
    donors_count = Column(Integer, default=0)

    owner = relationship("User", back_populates="fundraising_campaigns")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, default="Membership Fee")
    amount = Column(Integer, nullable=False)
    due_date = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, paid, overdue, cancelled
    payment_method = Column(String, nullable=True)
    paid_at = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="payments")
    group = relationship("Group", back_populates="payments")
    member = relationship("Member", back_populates="payments")
    gateway_orders = relationship("PaymentGatewayOrder", back_populates="payment", cascade="all, delete-orphan")

class PaymentGatewayOrder(Base):
    __tablename__ = "payment_gateway_orders"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    razorpay_order_id = Column(String, unique=True, index=True, nullable=False)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    amount = Column(Integer, nullable=False)
    currency = Column(String, default="INR")
    receipt = Column(String, nullable=True)
    status = Column(String, default="created")
    raw_order = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

    payment = relationship("Payment", back_populates="gateway_orders")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    title = Column(String, nullable=False)
    code = Column(String, nullable=True)
    category = Column(String, default="Training")
    level = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    instructor = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    schedule = Column(String, nullable=True)
    location = Column(String, nullable=True)
    capacity = Column(Integer, default=20)
    fee = Column(Integer, default=0)
    status = Column(String, default="open") # draft, open, full, closed, completed
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="courses")
    group = relationship("Group", back_populates="courses")
    registrations = relationship("CourseRegistration", back_populates="course", cascade="all, delete-orphan")

class CourseRegistration(Base):
    __tablename__ = "course_registrations"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)
    participant_name = Column(String, nullable=False)
    participant_email = Column(String, nullable=True)
    participant_phone = Column(String, nullable=True)
    status = Column(String, default="registered") # registered, waitlisted, cancelled, completed
    payment_status = Column(String, default="unpaid") # unpaid, paid, waived
    notes = Column(Text, nullable=True)
    registered_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="course_registrations")
    course = relationship("Course", back_populates="registrations")
    member = relationship("Member", back_populates="course_registrations")

class SignupForm(Base):
    __tablename__ = "signup_forms"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False) # Coach, Parent, Player, Referee
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    fields = Column(Text, nullable=False) # JSON encoded fields array

    owner = relationship("User", back_populates="signup_forms")

class SignupSubmission(Base):
    __tablename__ = "signup_submissions"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False) # Coach, Parent, Player, Referee
    submitted_data = Column(Text, nullable=False) # JSON encoded data dictionary
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="signup_submissions")
