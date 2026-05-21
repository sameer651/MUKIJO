"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    CalendarDays,
    ClipboardList,
    IndianRupee,
    MapPin,
    Plus,
    Search,
    Users,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
    const router = useRouter();

    const [courses, setCourses] = useState([]);
    const [summary, setSummary] = useState(null);
    const [groups, setGroups] = useState([]);
    const [courseForm, setCourseForm] = useState(emptyCourse);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;

    const loadCourses = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            setError("Please sign in to manage courses.");
            return;
        }

        try {
            const [coursesRes, summaryRes, groupsRes] = await Promise.all([
                api.get("/courses"),
                api.get("/courses/summary"),
                api.get("/groups"),
            ]);

            setCourses(coursesRes.data || []);
            setSummary(summaryRes.data || null);
            setGroups(groupsRes.data || []);
        } catch (err) {
            console.error("Failed to load courses:", err);
            setError("Could not load course registrations.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadCourses();
    }, [loadCourses]);

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

    const updateCourseField = (field, value) => {
        setCourseForm((current) => ({ ...current, [field]: value }));
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
                    {visibleCourses.map((course) => (
                        <button
                            key={course.id}
                            className="course-card"
                            onClick={() => router.push(`/dashboard/courses/${course.id}`)}
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
        </div>
    );
}
