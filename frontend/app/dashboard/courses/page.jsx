"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    CalendarDays,
    Check,
    ClipboardList,
    IndianRupee,
    MapPin,
    Plus,
    Search,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import api from "../../../lib/api";
import "../../styles/course-registration.css";

const emptyCourse = {
    title: "",
    code: "",
    category: "Training",
    level: "",
    description: "",
    instructor: "",
    start_date: "",
    end_date: "",
    schedule: "",
    location: "",
    capacity: "20",
    fee: "0",
    status: "open",
    group_id: "",
};

const emptyRegistration = {
    member_id: "",
    participant_name: "",
    participant_email: "",
    participant_phone: "",
    payment_status: "unpaid",
    notes: "",
};

const statusLabels = {
    draft: "Draft",
    open: "Open",
    full: "Full",
    closed: "Closed",
    completed: "Completed",
    registered: "Registered",
    waitlisted: "Waitlisted",
    cancelled: "Cancelled",
    unpaid: "Unpaid",
    paid: "Paid",
    waived: "Waived",
};

function money(value) {
    return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function dateText(value) {
    if (!value) return "Not scheduled";
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function CoursesPage() {
    const [courses, setCourses] = useState([]);
    const [summary, setSummary] = useState(null);
    const [groups, setGroups] = useState([]);
    const [members, setMembers] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [courseForm, setCourseForm] = useState(emptyCourse);
    const [registrationForm, setRegistrationForm] = useState(emptyRegistration);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;
    const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : "";
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : "";
    const userPhone = typeof window !== "undefined" ? localStorage.getItem("userPhone") : "";

    const selectedCourse = useMemo(
        () => courses.find((course) => course.id === selectedCourseId) || courses[0] || null,
        [courses, selectedCourseId]
    );

    const myRegistration = useMemo(() => {
        if (!userEmail) return null;
        return registrations.find(r => r.participant_email?.toLowerCase() === userEmail.toLowerCase());
    }, [registrations, userEmail]);

    const loadCourses = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            setError("Please sign in to manage courses.");
            return;
        }

        try {
            const [coursesRes, summaryRes, groupsRes, membersRes] = await Promise.all([
                api.get("/courses"),
                api.get("/courses/summary"),
                api.get("/groups"),
                api.get("/members"),
            ]);

            const courseData = coursesRes.data || [];
            setCourses(courseData);
            setSummary(summaryRes.data || null);
            setGroups(groupsRes.data || []);
            setMembers(membersRes.data || []);
            setSelectedCourseId((current) => current || courseData[0]?.id || null);
        } catch (err) {
            console.error("Failed to load courses:", err);
            setError("Could not load course registrations.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const loadRegistrations = useCallback(async () => {
        if (!userId || !selectedCourse) {
            setRegistrations([]);
            return;
        }

        try {
            const response = await api.get(`/courses/${selectedCourse.id}/registrations`, {
                params: { owner_id: userId },
            });
            setRegistrations(response.data || []);
        } catch (err) {
            console.error("Failed to load registrations:", err);
            setError("Could not load course registrations.");
        }
    }, [selectedCourse, userId]);

    useEffect(() => {
        loadCourses();
    }, [loadCourses]);

    useEffect(() => {
        loadRegistrations();
    }, [loadRegistrations]);

    const visibleCourses = useMemo(() => {
        const query = search.trim().toLowerCase();
        return courses.filter((course) => {
            const matchesStatus = filter === "all" || course.status === filter;
            const text = [
                course.title,
                course.code,
                course.category,
                course.level,
                course.instructor,
                course.group_name,
                course.location,
            ].join(" ").toLowerCase();
            return matchesStatus && (!query || text.includes(query));
        });
    }, [courses, filter, search]);

    const memberOptions = useMemo(() => {
        if (!selectedCourse?.group_id) return members;
        return members.filter((member) => String(member.group_id) === String(selectedCourse.group_id));
    }, [members, selectedCourse]);

    const updateCourseField = (field, value) => {
        setCourseForm((current) => ({ ...current, [field]: value }));
    };

    const updateRegistrationField = (field, value) => {
        setRegistrationForm((current) => ({ ...current, [field]: value }));
    };

    const createCourse = async (event) => {
        event.preventDefault();
        setError("");

        if (!courseForm.title.trim()) {
            setError("Course title is required.");
            return;
        }

        setSaving(true);
        try {
            await api.post("/courses", {
                ...courseForm,
                title: courseForm.title.trim(),
                capacity: Number(courseForm.capacity || 20),
                fee: Number(courseForm.fee || 0),
                group_id: courseForm.group_id ? Number(courseForm.group_id) : null,
                start_date: courseForm.start_date || null,
                end_date: courseForm.end_date || null,
            });
            setShowCourseModal(false);
            setCourseForm(emptyCourse);
            await loadCourses();
        } catch (err) {
            console.error("Failed to create course:", err);
            setError(err?.response?.data?.detail || "Could not create this course.");
        } finally {
            setSaving(false);
        }
    };

    const registerParticipant = async (event) => {
        event.preventDefault();
        setError("");

        if (!selectedCourse) return;
        if (!registrationForm.member_id && !registrationForm.participant_name.trim()) {
            setError("Choose a member or enter a participant name.");
            return;
        }

        setSaving(true);
        try {
            await api.post(`/courses/${selectedCourse.id}/registrations`, {
                ...registrationForm,
                owner_id: Number(userId),
                member_id: registrationForm.member_id ? Number(registrationForm.member_id) : null,
                participant_name: registrationForm.participant_name.trim() || null,
                participant_email: registrationForm.participant_email.trim() || null,
                participant_phone: registrationForm.participant_phone.trim() || null,
                notes: registrationForm.notes.trim() || null,
            });
            setShowRegisterModal(false);
            setRegistrationForm(emptyRegistration);
            await Promise.all([loadCourses(), loadRegistrations()]);
        } catch (err) {
            console.error("Failed to register participant:", err);
            setError(err?.response?.data?.detail || "Could not register this participant.");
        } finally {
            setSaving(false);
        }
    };

    const handleSelfRegister = async () => {
        if (!selectedCourse) return;
        setError("");
        setSaving(true);
        try {
            await api.post(`/courses/${selectedCourse.id}/registrations`, {
                owner_id: Number(userId),
                member_id: null,
                participant_name: userName || "Active Member",
                participant_email: userEmail,
                participant_phone: userPhone || "",
                payment_status: "unpaid",
                notes: "Self-registered via Member Dashboard",
            });
            alert(`Congratulations! You have successfully registered for ${selectedCourse.title}!`);
            await Promise.all([loadCourses(), loadRegistrations()]);
        } catch (err) {
            console.error("Failed to self-register:", err);
            alert(err?.response?.data?.detail || "Could not complete registration.");
        } finally {
            setSaving(false);
        }
    };

    const updateRegistration = async (registration, patch) => {
        if (!userId) return;
        try {
            await api.put(`/course-registrations/${registration.id}`, patch, {
                params: { owner_id: userId },
            });
            await Promise.all([loadCourses(), loadRegistrations()]);
        } catch (err) {
            console.error("Failed to update registration:", err);
            setError("Could not update this registration.");
        }
    };

    const deleteCourse = async (courseId) => {
        if (!userId || !confirm("Delete this course and its registrations?")) return;
        try {
            await api.delete(`/courses/${courseId}`, { params: { owner_id: userId } });
            setSelectedCourseId(null);
            await loadCourses();
        } catch (err) {
            console.error("Failed to delete course:", err);
            setError("Could not delete this course.");
        }
    };

    const stats = [
        { label: "Total Courses", value: summary?.total_courses || 0, icon: <BookOpen size={19} /> },
        { label: "Open Courses", value: summary?.open_courses || 0, icon: <ClipboardList size={19} /> },
        { label: "Active Registrations", value: summary?.active_registrations || 0, icon: <Users size={19} /> },
        { label: "Course Revenue", value: money(summary?.course_revenue), icon: <IndianRupee size={19} /> },
    ];

    return (
        <div className="courses-page">
            <div className="courses-header">
                <div>
                    <span className="courses-kicker">Course Registration</span>
                    <h1>Courses</h1>
                    <p>{isMember ? "Enroll in exclusive sports courses, academy camps, and special workshops" : "Create programs, register members, track seats, and monitor course fee status."}</p>
                </div>
                {!isMember && (
                    <button className="courses-primary-btn" onClick={() => setShowCourseModal(true)}>
                        <Plus size={17} />
                        New Course
                    </button>
                )}
            </div>

            {/* Stats list shown only to Admins to protect revenue metrics */}
            {!isMember && (
                <div className="courses-stats">
                    {stats.map((stat) => (
                        <div className="courses-stat" key={stat.label}>
                            <span>{stat.icon}</span>
                            <div>
                                <strong>{loading ? "..." : stat.value}</strong>
                                <small>{stat.label}</small>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="courses-toolbar">
                <div className="courses-search">
                    <Search size={16} />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses" />
                </div>
                <div className="courses-filter">
                    {["all", "open", "full", "closed", "completed"].map((item) => (
                        <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                            {item === "all" ? "All" : statusLabels[item]}
                        </button>
                    ))}
                </div>
            </div>

            {error && <div className="courses-error">{error}</div>}

            {loading ? (
                <div className="courses-empty">Loading courses...</div>
            ) : courses.length === 0 ? (
                <div className="courses-empty">
                    <BookOpen size={44} />
                    <h2>No courses yet</h2>
                    <p>{isMember ? "There are currently no courses available for enrollment. Check back soon!" : "Create your first course for coaching batches, workshops, camps, or certification programs."}</p>
                    {!isMember && (
                        <button className="courses-primary-btn" onClick={() => setShowCourseModal(true)}>
                            <Plus size={17} />
                            Create Course
                        </button>
                    )}
                </div>
            ) : (
                <div className="courses-layout">
                    <div className="courses-list">
                        {visibleCourses.map((course) => (
                            <button
                                key={course.id}
                                className={`course-card ${selectedCourse?.id === course.id ? "active" : ""}`}
                                onClick={() => setSelectedCourseId(course.id)}
                            >
                                <div className="course-card-head">
                                    <div>
                                        <h3>{course.title}</h3>
                                        <span>{course.code || course.category}</span>
                                    </div>
                                    <small className={`course-status ${course.status}`}>{statusLabels[course.status] || course.status}</small>
                                </div>
                                <p>{course.description || "No description added."}</p>
                                <div className="course-meta-grid">
                                    <span><Users size={14} /> {course.registration_count}/{course.capacity}</span>
                                    <span><IndianRupee size={14} /> {Number(course.fee || 0).toLocaleString("en-IN")}</span>
                                    <span><CalendarDays size={14} /> {dateText(course.start_date)}</span>
                                    <span><MapPin size={14} /> {course.location || "TBA"}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedCourse && (
                        <div className="course-detail">
                            <div className="course-detail-top">
                                <div>
                                    <span className="courses-kicker">{selectedCourse.group_name || "Whole club"}</span>
                                    <h2>{selectedCourse.title}</h2>
                                    <p>{selectedCourse.description || "No description added."}</p>
                                </div>
                                <div className="course-detail-actions">
                                    {isMember ? (
                                        myRegistration ? (
                                            <span style={{ 
                                                display: "inline-flex", 
                                                alignItems: "center", 
                                                gap: "6px", 
                                                background: "#dcfce7", 
                                                color: "#16a34a", 
                                                fontWeight: "700", 
                                                padding: "10px 20px", 
                                                borderRadius: "12px", 
                                                fontSize: "14px" 
                                            }}>
                                                <Check size={16} /> Registered
                                            </span>
                                        ) : selectedCourse.status === "full" ? (
                                            <span style={{ 
                                                display: "inline-flex", 
                                                alignItems: "center", 
                                                background: "#fee2e2", 
                                                color: "#ef4444", 
                                                fontWeight: "700", 
                                                padding: "10px 20px", 
                                                borderRadius: "12px", 
                                                fontSize: "14px" 
                                            }}>
                                                Course Full
                                            </span>
                                        ) : selectedCourse.status !== "open" ? (
                                            <span style={{ 
                                                display: "inline-flex", 
                                                alignItems: "center", 
                                                background: "#f1f5f9", 
                                                color: "#64748b", 
                                                fontWeight: "700", 
                                                padding: "10px 20px", 
                                                borderRadius: "12px", 
                                                fontSize: "14px" 
                                            }}>
                                                Closed
                                            </span>
                                        ) : (
                                            <button className="courses-primary-btn" onClick={handleSelfRegister} disabled={saving}>
                                                <UserPlus size={16} />
                                                Confirm Registration
                                            </button>
                                        )
                                    ) : (
                                        <>
                                            <button className="courses-primary-btn" onClick={() => setShowRegisterModal(true)}>
                                                <UserPlus size={16} />
                                                Register
                                            </button>
                                            <button className="courses-icon-btn danger" onClick={() => deleteCourse(selectedCourse.id)}>
                                                <Trash2 size={17} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="course-detail-grid">
                                <div><span>Instructor</span><strong>{selectedCourse.instructor || "Not assigned"}</strong></div>
                                <div><span>Schedule</span><strong>{selectedCourse.schedule || "Not scheduled"}</strong></div>
                                <div><span>Dates</span><strong>{dateText(selectedCourse.start_date)} - {dateText(selectedCourse.end_date)}</strong></div>
                                <div><span>Seats Left</span><strong>{selectedCourse.available_seats}</strong></div>
                            </div>

                            {/* Secure Registration Panels */}
                            {isMember ? (
                                <div className="registrations-panel" style={{ background: "#f8fafc", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0", marginTop: "24px" }}>
                                    <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#1e293b", fontWeight: "800" }}>Your Enrollment Status</h3>
                                    <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#64748b" }}>Manage your registration and payment status for this cricket batch.</p>
                                    
                                    {myRegistration ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "white", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                                <div>
                                                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Registration Status</span>
                                                    <strong style={{ display: "block", fontSize: "14px", color: "#16a34a", marginTop: "3px" }}>✓ Registered & Confirmed</strong>
                                                </div>
                                                <span style={{ fontSize: "12px", fontWeight: "700", padding: "6px 14px", background: "#dcfce7", color: "#16a34a", borderRadius: "20px" }}>
                                                    ACTIVE
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "white", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                                <div>
                                                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Fee Payment Status</span>
                                                    <strong style={{ display: "block", fontSize: "14px", color: myRegistration.payment_status === "paid" ? "#16a34a" : "#d97706", marginTop: "3px" }}>
                                                        {myRegistration.payment_status === "paid" ? "Paid" : "Pending Payment / Unpaid"}
                                                    </strong>
                                                </div>
                                                <span style={{ 
                                                    fontSize: "12px", 
                                                    fontWeight: "700", 
                                                    padding: "6px 14px", 
                                                    background: myRegistration.payment_status === "paid" ? "#dcfce7" : "#fef3c7", 
                                                    color: myRegistration.payment_status === "paid" ? "#16a34a" : "#d97706", 
                                                    borderRadius: "20px" 
                                                }}>
                                                    {myRegistration.payment_status.toUpperCase()}
                                                </span>
                                            </div>
                                            {myRegistration.notes && (
                                                <div style={{ padding: "14px 18px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #e2e8f0", fontSize: "13px", color: "#64748b" }}>
                                                    <strong>Note:</strong> {myRegistration.notes}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: "center", padding: "30px 10px" }}>
                                            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748b" }}>You are not enrolled in this course yet. Click "Confirm Registration" above to instantly claim your seat!</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="registrations-panel">
                                    <div className="registrations-head">
                                        <h3>Registrations ({registrations.length})</h3>
                                    </div>
                                    {registrations.length > 0 ? (
                                        <div className="registrations-list">
                                            {registrations.map((registration) => (
                                                <div className="registration-row" key={registration.id}>
                                                    <div>
                                                        <strong>{registration.participant_name}</strong>
                                                        <span>{registration.participant_email || "No email"} · {statusLabels[registration.status] || registration.status}</span>
                                                    </div>
                                                    <div className="registration-actions">
                                                        <button
                                                            className={`mini-pill ${registration.payment_status}`}
                                                            onClick={() => updateRegistration(registration, { payment_status: registration.payment_status === "paid" ? "unpaid" : "paid" })}
                                                        >
                                                            {registration.payment_status === "paid" ? <Check size={13} /> : <IndianRupee size={13} />}
                                                            {statusLabels[registration.payment_status] || registration.payment_status}
                                                        </button>
                                                        {registration.status !== "cancelled" && (
                                                            <button className="courses-icon-btn" onClick={() => updateRegistration(registration, { status: "cancelled" })}>
                                                                <X size={15} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="courses-empty compact">No registrations for this course yet.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showCourseModal && (
                <div className="courses-modal-backdrop">
                    <form className="courses-modal" onSubmit={createCourse}>
                        <div className="courses-modal-head">
                            <div>
                                <h2>New Course</h2>
                                <p>Add a new course or training program.</p>
                            </div>
                            <button type="button" className="courses-icon-btn" onClick={() => setShowCourseModal(false)}><X size={18} /></button>
                        </div>
                        <div className="courses-form-grid">
                            <label>Title<input value={courseForm.title} onChange={(e) => updateCourseField("title", e.target.value)} placeholder="Junior cricket foundation" /></label>
                            <label>Code<input value={courseForm.code} onChange={(e) => updateCourseField("code", e.target.value)} placeholder="CRK-101" /></label>
                            <label>Category<select value={courseForm.category} onChange={(e) => updateCourseField("category", e.target.value)}><option>Training</option><option>Camp</option><option>Workshop</option><option>Certification</option><option>Fitness</option></select></label>
                            <label>Level<input value={courseForm.level} onChange={(e) => updateCourseField("level", e.target.value)} placeholder="Beginner" /></label>
                            <label>Group<select value={courseForm.group_id} onChange={(e) => updateCourseField("group_id", e.target.value)}><option value="">Whole club</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.group_name}</option>)}</select></label>
                            <label>Instructor<input value={courseForm.instructor} onChange={(e) => updateCourseField("instructor", e.target.value)} placeholder="Coach name" /></label>
                            <label>Start Date<input type="date" value={courseForm.start_date} onChange={(e) => updateCourseField("start_date", e.target.value)} /></label>
                            <label>End Date<input type="date" value={courseForm.end_date} onChange={(e) => updateCourseField("end_date", e.target.value)} /></label>
                            <label>Schedule<input value={courseForm.schedule} onChange={(e) => updateCourseField("schedule", e.target.value)} placeholder="Mon, Wed 6 PM" /></label>
                            <label>Location<input value={courseForm.location} onChange={(e) => updateCourseField("location", e.target.value)} placeholder="Main court" /></label>
                            <label>Capacity<input type="number" min="1" value={courseForm.capacity} onChange={(e) => updateCourseField("capacity", e.target.value)} /></label>
                            <label>Fee<input type="number" min="0" value={courseForm.fee} onChange={(e) => updateCourseField("fee", e.target.value)} /></label>
                            <label className="wide">Description<textarea value={courseForm.description} onChange={(e) => updateCourseField("description", e.target.value)} placeholder="What members will learn" /></label>
                        </div>
                        <div className="courses-modal-actions">
                            <button type="button" className="courses-secondary-btn" onClick={() => setShowCourseModal(false)}>Cancel</button>
                            <button type="submit" className="courses-primary-btn" disabled={saving}>{saving ? "Saving..." : "Create Course"}</button>
                        </div>
                    </form>
                </div>
            )}

            {showRegisterModal && selectedCourse && (
                <div className="courses-modal-backdrop">
                    <form className="courses-modal narrow" onSubmit={registerParticipant}>
                        <div className="courses-modal-head">
                            <div>
                                <h2>Register Participant</h2>
                                <p>{selectedCourse.title}</p>
                            </div>
                            <button type="button" className="courses-icon-btn" onClick={() => setShowRegisterModal(false)}><X size={18} /></button>
                        </div>
                        <div className="courses-form-grid single">
                            <label>Existing Member<select value={registrationForm.member_id} onChange={(e) => updateRegistrationField("member_id", e.target.value)}><option value="">Register by name instead</option>{memberOptions.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name} - {member.group_name}</option>)}</select></label>
                            <label>Participant Name<input value={registrationForm.participant_name} onChange={(e) => updateRegistrationField("participant_name", e.target.value)} placeholder="Required for non-members" disabled={Boolean(registrationForm.member_id)} /></label>
                            <label>Email<input value={registrationForm.participant_email} onChange={(e) => updateRegistrationField("participant_email", e.target.value)} placeholder="participant@example.com" disabled={Boolean(registrationForm.member_id)} /></label>
                            <label>Phone<input value={registrationForm.participant_phone} onChange={(e) => updateRegistrationField("participant_phone", e.target.value)} placeholder="Phone number" disabled={Boolean(registrationForm.member_id)} /></label>
                            <label>Payment<select value={registrationForm.payment_status} onChange={(e) => updateRegistrationField("payment_status", e.target.value)}><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="waived">Waived</option></select></label>
                            <label>Notes<textarea value={registrationForm.notes} onChange={(e) => updateRegistrationField("notes", e.target.value)} placeholder="Optional registration note" /></label>
                        </div>
                        <div className="courses-modal-actions">
                            <button type="button" className="courses-secondary-btn" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                            <button type="submit" className="courses-primary-btn" disabled={saving}>{saving ? "Registering..." : "Register"}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
