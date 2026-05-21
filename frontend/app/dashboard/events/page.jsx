"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "../../styles/events.css";
import { useRouter } from "next/navigation";

export default function EventsPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("upcoming"); // upcoming, ongoing, past
    const router = useRouter();

    const todayStr = new Date().toISOString().split('T')[0];
    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;

    useEffect(() => {
        const fetchEvents = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) {
                router.push("/login");
                return;
            }

            try {
                const response = await fetch(`http://127.0.0.1:8001/events?owner_id=${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setEvents(data);
                }
            } catch (error) {
                console.error("Error fetching events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [router]);

    const handleDelete = async (eventId) => {
        if (!confirm("Are you sure you want to delete this event?")) return;

        const userId = localStorage.getItem("userId");
        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${eventId}?owner_id=${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setEvents(events.filter(e => e.id !== eventId));
            } else {
                alert("Failed to delete event");
            }
        } catch (error) {
            console.error("Error deleting event:", error);
        }
    };

    // Filter events by status based on date
    const getFilteredEvents = () => {
        return events.filter(event => {
            if (!event.date) return false;
            const eventDate = event.date; // e.g. "2026-05-18"
            
            if (activeTab === "upcoming") {
                return eventDate > todayStr;
            } else if (activeTab === "ongoing") {
                return eventDate === todayStr;
            } else if (activeTab === "past") {
                return eventDate < todayStr;
            }
            return true;
        });
    };

    const upcomingCount = events.filter(e => e.date && e.date > todayStr).length;
    const ongoingCount = events.filter(e => e.date && e.date === todayStr).length;
    const pastCount = events.filter(e => e.date && e.date < todayStr).length;

    const filtered = getFilteredEvents();

    // Default gradient presets for events
    const coverPresets = {
        "Match": "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
        "Training": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "Meeting": "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
        "Social": "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
        "Tournament": "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
        "Ceremony": "linear-gradient(135deg, #10b981 0%, #047857 100%)"
    };

    const getCoverBackground = (event) => {
        if (event.cover_image) {
            if (event.cover_image.startsWith("linear-gradient")) {
                return event.cover_image;
            }
            return `url(${event.cover_image})`;
        }
        return coverPresets[event.type] || "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)";
    };

    return (
        <div className="events-container">
            <div className="events-header">
                <div>
                    <h1>Club Events</h1>
                    <p>{isMember ? "View match fixtures, squad training sessions, and RSVP status" : "Schedule matches, training sessions, and track member attendance"}</p>
                </div>
                {!isMember && (
                    <Link href="/dashboard/events/new" className="primary-btn">
                        + Create New Event
                    </Link>
                )}
            </div>

            {/* Statistics Cards */}
            <div className="events-stats-grid">
                <div className="stat-card upcoming" onClick={() => setActiveTab("upcoming")} style={{ cursor: "pointer" }}>
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                        <h3>Upcoming Events</h3>
                        <span className="stat-number">{upcomingCount}</span>
                    </div>
                </div>
                <div className="stat-card ongoing" onClick={() => setActiveTab("ongoing")} style={{ cursor: "pointer" }}>
                    <div className="stat-icon">⚡</div>
                    <div className="stat-info">
                        <h3>Ongoing Today</h3>
                        <span className="stat-number">{ongoingCount}</span>
                    </div>
                </div>
                <div className="stat-card past" onClick={() => setActiveTab("past")} style={{ cursor: "pointer" }}>
                    <div className="stat-icon">📁</div>
                    <div className="stat-info">
                        <h3>Past & Archived</h3>
                        <span className="stat-number">{pastCount}</span>
                    </div>
                </div>
            </div>

            {/* Premium Navigation Tabs */}
            <div className="tabs-container">
                <button 
                    onClick={() => setActiveTab("upcoming")} 
                    className={`tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
                >
                    Upcoming Events ({upcomingCount})
                </button>
                <button 
                    onClick={() => setActiveTab("ongoing")} 
                    className={`tab-btn ${activeTab === "ongoing" ? "active" : ""}`}
                >
                    Ongoing Events ({ongoingCount})
                </button>
                <button 
                    onClick={() => setActiveTab("past")} 
                    className={`tab-btn ${activeTab === "past" ? "active" : ""}`}
                >
                    Past & Archived ({pastCount})
                </button>
            </div>

            {loading ? (
                <div className="loading-state" style={{ textAlign: "center", padding: "40px", fontSize: "16px", color: "#64748b" }}>
                    Loading events...
                </div>
            ) : filtered.length > 0 ? (
                <div className="events-grid">
                    {filtered.map((event) => (
                        <div className="event-card" key={event.id}>
                            <div 
                                className="event-cover-container"
                                style={{ 
                                    background: getCoverBackground(event),
                                    backgroundImage: event.cover_image && !event.cover_image.startsWith("linear") ? `url(${event.cover_image})` : undefined,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center"
                                }}
                            >
                                <span className="event-card-category">{event.type}</span>
                                {event.registration_deadline && (
                                    <span className="event-card-deadline">
                                        Deadline: {new Date(event.registration_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </div>
                            
                            <div className="event-card-body">
                                <h2>{event.name}</h2>
                                <div className="event-card-meta">
                                    <div className="meta-item">
                                        <span className="meta-icon">📅</span>
                                        <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-icon">⏰</span>
                                        <span>{event.start_time && event.end_time ? `${event.start_time} - ${event.end_time}` : event.time || "No specific time"}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-icon">📍</span>
                                        <span>{event.location || "Online / TBD"}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-icon">👥</span>
                                        <span>Target Group: <strong style={{ color: "#6366f1" }}>{event.group_name}</strong></span>
                                    </div>
                                </div>

                                <div className="event-card-settings">
                                    {event.is_public ? <span className="setting-badge">🌐 Public</span> : <span className="setting-badge">🔒 Private</span>}
                                    {event.attendance_tracking && <span className="setting-badge">📝 Attendance Active</span>}
                                    {event.auto_reminder && <span className="setting-badge">🔔 Auto Reminder</span>}
                                    {event.allow_guest && <span className="setting-badge">👤 Guest Entry</span>}
                                    {event.allow_waiting_list && <span className="setting-badge">⏳ Waitlist</span>}
                                </div>

                                <div className="event-card-footer">
                                    <div className="event-card-actions">
                                        <Link href={`/dashboard/events/${event.id}`} className="manage-btn">
                                            {isMember ? "View Details & RSVP" : "Manage Event"}
                                        </Link>
                                        {!isMember && (
                                            <button 
                                                onClick={() => handleDelete(event.id)} 
                                                className="delete-btn"
                                                style={{ color: "#ef4444", fontWeight: "600", padding: "10px", borderRadius: "10px", border: "1px solid #fee2e2", background: "#fef2f2", cursor: "pointer" }}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <h3>No {activeTab} events found</h3>
                    <p>{isMember ? "There are currently no events scheduled for your roster in this category." : "There are no events currently in this category. You can schedule a new match, training, or meeting immediately."}</p>
                    {!isMember && activeTab === "upcoming" && (
                        <Link href="/dashboard/events/new" className="primary-btn" style={{ textDecoration: "none", marginTop: "20px" }}>
                            Create Event
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
