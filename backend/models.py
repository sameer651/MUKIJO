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
    group_id = Column(Integer, ForeignKey("groups.id"))
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    location = Column(String, nullable=True)

    description = Column(Text, nullable=True)


    group = relationship("Group", back_populates="events")

class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(String, default="Member")

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
    fundraising_campaigns = relationship("FundraisingCampaign", back_populates="owner")
    payments = relationship("Payment", back_populates="owner")
    courses = relationship("Course", back_populates="owner")
    course_registrations = relationship("CourseRegistration", back_populates="owner")

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
