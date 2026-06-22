"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "../../../styles/events.css";

export default function NewEventPage() {
    const router = useRouter();
    const [groups, setGroups] = useState([]);
    
    // Core event fields
    const [name, setName] = useState("");
    const [type, setType] = useState("Match");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");
    const [groupId, setGroupId] = useState("");
    const [maxParticipants, setMaxParticipants] = useState("");
    const [eventFee, setEventFee] = useState("");
    const [registrationDeadline, setRegistrationDeadline] = useState("");

    // Settings
    const [autoReminder, setAutoReminder] = useState(false);
    const [attendanceTracking, setAttendanceTracking] = useState(false);
    const [isPublic, setIsPublic] = useState(true);
    const [allowGuest, setAllowGuest] = useState(false);
    const [allowWaitingList, setAllowWaitingList] = useState(false);



    // Cover image preset state
    const [selectedCover, setSelectedCover] = useState("Match");
    const [customCoverUrl, setCustomCoverUrl] = useState("");

    // Gradients mapping
    const coverPresets = {
        "Match": "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
        "Training": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "Meeting": "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
        "Social": "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
        "Tournament": "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
        "Ceremony": "linear-gradient(135deg, #10b981 0%, #047857 100%)"
    };

    useEffect(() => {
        const fetchGroups = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) {
                router.push("/login");
                return;
            }
            try {
                const response = await fetch(`http://127.0.0.1:8001/groups?owner_id=${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setGroups(data);
                    if (data.length > 0) setGroupId(data[0].id.toString());
                }
            } catch (error) {
                console.error("Error loading groups:", error);
            }
        };

        fetchGroups();
    }, [router]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const userId = localStorage.getItem("userId");
        if (!userId) return;

        if (!groupId) {
            alert("Please create a club group before planning an event.");
            return;
        }

        // Prepare cover image
        const finalCover = customCoverUrl || coverPresets[selectedCover] || coverPresets["Match"];

        const eventData = {
            name,
            type,
            date,
            time: startTime && endTime ? `${startTime} - ${endTime}` : startTime,
            start_time: startTime,
            end_time: endTime,
            location,
            description,
            group_id: parseInt(groupId),
            owner_id: parseInt(userId),
            cover_image: finalCover,
            registration_deadline: registrationDeadline || null,
            max_participants: maxParticipants ? parseInt(maxParticipants) : null,
            fee: eventFee ? parseInt(eventFee) : 0,
            auto_reminder: autoReminder,
            attendance_tracking: attendanceTracking,
            is_public: isPublic,
            allow_guest: allowGuest,
            allow_waiting_list: allowWaitingList,
            rules_pdf: null,
            schedule_file: null,
            permission_forms: null,
            match_fixtures: null,
            event_posters: null
        };

        try {
            const response = await fetch(`http://127.0.0.1:8001/groups/${groupId}/events?owner_id=${userId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(eventData),
            });

            if (response.ok) {
                router.push("/dashboard/events");
            } else {
                const err = await response.json();
                alert(`Error: ${err.detail || "Failed to create event"}`);
            }
        } catch (error) {
            console.error("Error creating event:", error);
            alert("Error sending request to server.");
        }
    };

    return (
        <div className="events-container">
            <div style={{ marginBottom: "20px" }}>
                <Link href="/dashboard/events" className="back-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#64748b", fontWeight: "600", fontSize: "14px" }}>
                    ← Back to Events List
                </Link>
            </div>

            <div className="form-card">
                <div style={{ marginBottom: "30px" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", margin: "0" }}>Schedule New Club Event</h1>
                    <p style={{ color: "#94a3b8", margin: "6px 0 0 0" }}>Fill out event information and customize registration settings</p>
                </div>

                <form onSubmit={handleSubmit}>
                    
                    {/* SECTION 1: EVENT DETAILS */}
                    <div className="form-section-title">
                        <span>📝</span> Event Details & Location
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="name">Event Title / Name *</label>
                            <input 
                                type="text" 
                                id="name" 
                                placeholder="e.g. Annual Club Championship / Training Camp" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="groupId">Target Club Group *</label>
                            <select 
                                id="groupId"
                                value={groupId}
                                onChange={(e) => setGroupId(e.target.value)}
                                required
                            >
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.group_name} ({g.activity})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-grid-3">
                        <div className="form-group">
                            <label htmlFor="type">Event Category *</label>
                            <select 
                                id="type" 
                                value={type} 
                                onChange={(e) => { setType(e.target.value); setSelectedCover(e.target.value); }} 
                                required
                            >
                                <option value="Match">Match / Fixture</option>
                                <option value="Training">Training Session</option>
                                <option value="Meeting">Meeting</option>
                                <option value="Social">Social Gathering</option>
                                <option value="Tournament">Tournament</option>
                                <option value="Ceremony">Ceremony / Presentation</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="date">Date *</label>
                            <input 
                                type="date" 
                                id="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="location">Venue / Location *</label>
                            <input 
                                type="text" 
                                id="location" 
                                placeholder="e.g. Main Turf Court A / Stadium" 
                                value={location} 
                                onChange={(e) => setLocation(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="startTime">Start Time *</label>
                            <input 
                                type="time" 
                                id="startTime" 
                                value={startTime} 
                                onChange={(e) => setStartTime(e.target.value)} 
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="endTime">End Time *</label>
                            <input 
                                type="time" 
                                id="endTime" 
                                value={endTime} 
                                onChange={(e) => setEndTime(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Event Description & Information</label>
                        <textarea 
                            id="description" 
                            rows="4" 
                            placeholder="Provide details about the matches, what to bring, and expectations..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                    </div>

                    {/* COVER DESIGN SYSTEM */}
                    <div className="form-group" style={{ marginTop: "20px" }}>
                        <label>Select Cover Background Design</label>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 10px 0" }}>Choose a stylized gradient matched to category or paste a custom image URL below.</p>
                        
                        <div className="cover-presets-grid">
                            {Object.entries(coverPresets).map(([key, gradient]) => (
                                <div 
                                    key={key} 
                                    className={`cover-preset-option ${selectedCover === key ? "selected" : ""}`}
                                    style={{ background: gradient }}
                                    onClick={() => { setSelectedCover(key); setCustomCoverUrl(""); }}
                                >
                                    <span className="cover-preset-label">{key}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: "16px" }}>
                            <label htmlFor="coverUrl" style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff" }}>Or paste custom cover image URL</label>
                            <input 
                                type="url" 
                                id="coverUrl" 
                                placeholder="https://images.unsplash.com/photo-..." 
                                value={customCoverUrl}
                                onChange={(e) => { setCustomCoverUrl(e.target.value); setSelectedCover(""); }}
                                style={{ marginTop: "6px" }}
                            />
                        </div>
                    </div>

                    {/* SECTION 2: CHOOSE SETTINGS */}
                    <div className="form-section-title">
                        <span>⚙️</span> Choose Event Settings & Capacity
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="deadline">Registration Deadline</label>
                            <input 
                                type="date" 
                                id="deadline" 
                                value={registrationDeadline} 
                                onChange={(e) => setRegistrationDeadline(e.target.value)} 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="max">Maximum Participants</label>
                            <input 
                                type="number" 
                                id="max" 
                                placeholder="No limit (leave empty)" 
                                value={maxParticipants} 
                                onChange={(e) => setMaxParticipants(e.target.value)} 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="eventFee">Event Fee (₹)</label>
                            <input
                                type="number"
                                id="eventFee"
                                min="0"
                                placeholder="0 for free event"
                                value={eventFee}
                                onChange={(e) => setEventFee(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Toggles */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginTop: "16px" }}>
                        <div className="switch-container">
                            <div className="switch-label">
                                <span>🔔 Automatic Reminder</span>
                                <p>Notify members before the start</p>
                            </div>
                            <label className="switch">
                                <input 
                                    type="checkbox" 
                                    checked={autoReminder} 
                                    onChange={(e) => setAutoReminder(e.target.checked)} 
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <div className="switch-container">
                            <div className="switch-label">
                                <span>📝 Attendance Tracking</span>
                                <p>Enable event-day check-in panel</p>
                            </div>
                            <label className="switch">
                                <input 
                                    type="checkbox" 
                                    checked={attendanceTracking} 
                                    onChange={(e) => setAttendanceTracking(e.target.checked)} 
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <div className="switch-container">
                            <div className="switch-label">
                                <span>🌐 Public Event</span>
                                <p>Make visible outside club members</p>
                            </div>
                            <label className="switch">
                                <input 
                                    type="checkbox" 
                                    checked={isPublic} 
                                    onChange={(e) => setIsPublic(e.target.checked)} 
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <div className="switch-container">
                            <div className="switch-label">
                                <span>👤 Allow Guest Registration</span>
                                <p>Allow non-members to sign up</p>
                            </div>
                            <label className="switch">
                                <input 
                                    type="checkbox" 
                                    checked={allowGuest} 
                                    onChange={(e) => setAllowGuest(e.target.checked)} 
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <div className="switch-container">
                            <div className="switch-label">
                                <span>⏳ Allow Waiting List</span>
                                <p>Queue members if event is full</p>
                            </div>
                            <label className="switch">
                                <input 
                                    type="checkbox" 
                                    checked={allowWaitingList} 
                                    onChange={(e) => setAllowWaitingList(e.target.checked)} 
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>



                    <div style={{ marginTop: "40px", borderTop: "1px solid #f1f5f9", paddingTop: "24px", display: "flex", justifyContent: "flex-end", gap: "16px" }}>
                        <Link href="/dashboard/events" className="secondary-btn" style={{ padding: "12px 24px", borderRadius: "12px", border: "1px solid #cbd5e1", background: "none", color: "#475569", fontWeight: "600", textDecoration: "none" }}>
                            Cancel
                        </Link>
                        <button type="submit" className="primary-btn" style={{ padding: "12px 28px", borderRadius: "12px", border: "none", background: "#6366f1", color: "white", fontWeight: "700", cursor: "pointer" }}>
                            Save & Publish Event
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
