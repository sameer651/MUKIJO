"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import "../../../styles/events.css";

export default function EventDetailPage() {
    const router = useRouter();
    const { id } = useParams();
    
    // States
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [groups, setGroups] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Tabs in management
    const [activeMgmtTab, setActiveMgmtTab] = useState("rsvp"); // rsvp, attendance, communication, reports
    
    // RSVP list subtab
    const [rsvpSubTab, setRsvpSubTab] = useState("all"); // all, accepted, pending, declined, maybe, waitlisted

    // Form inputs
    const [inviteType, setInviteType] = useState("all_members");
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    
    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    
    const [broadcastGroup, setBroadcastGroup] = useState("confirmed");
    const [broadcastMsg, setBroadcastMsg] = useState("");
    const [broadcastStatus, setBroadcastStatus] = useState("");

    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;
    const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : "";
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : "";

    useEffect(() => {
        const fetchData = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) {
                router.push("/login");
                return;
            }

            try {
                // Fetch Event Details
                const eventRes = await fetch(`http://127.0.0.1:8001/events/${id}?owner_id=${userId}`);
                if (!eventRes.ok) {
                    throw new Error("Event not found");
                }
                const eventData = await eventRes.json();
                setEvent(eventData);

                // Fetch Registrations
                const regRes = await fetch(`http://127.0.0.1:8001/events/${id}/participants`);
                if (regRes.ok) {
                    const regData = await regRes.json();
                    setRegistrations(regData);
                }

                // Fetch Club Groups
                const groupRes = await fetch(`http://127.0.0.1:8001/groups?owner_id=${userId}`);
                if (groupRes.ok) {
                    const groupData = await groupRes.json();
                    setGroups(groupData);
                    
                    // For the invitation selector, we can populate members from active groups
                    let allMems = [];
                    for (let g of groupData) {
                        if (g.members) {
                            allMems = [...allMems, ...g.members];
                        }
                    }
                    setMembers(allMems);
                }

            } catch (error) {
                console.error("Error loading event detail page:", error);
                alert("Failed to load event dashboard details.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, router]);

    // Handle invite submissions
    const handleSendInvitations = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invite_type: inviteType,
                    group_ids: inviteType === "groups" ? selectedGroups : null,
                    member_ids: inviteType === "specific_members" ? selectedMembers : null
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                
                // Reload registrations
                const regRes = await fetch(`http://127.0.0.1:8001/events/${id}/participants`);
                if (regRes.ok) {
                    const regData = await regRes.json();
                    setRegistrations(regData);
                }
            } else {
                alert("Failed to invite participants.");
            }
        } catch (error) {
            console.error("Error sending invites:", error);
        }
    };

    // Handle Guest Registration
    const handleRegisterGuest = async (e) => {
        e.preventDefault();
        if (!guestName || !guestEmail) return;

        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/register-guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: guestName,
                    email: guestEmail
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Successfully registered guest! RSVP Status: ${result.status}`);
                setGuestName("");
                setGuestEmail("");
                
                // Reload registrations
                const regRes = await fetch(`http://127.0.0.1:8001/events/${id}/participants`);
                if (regRes.ok) {
                    const regData = await regRes.json();
                    setRegistrations(regData);
                }
            } else {
                const err = await response.json();
                alert(err.detail || "Failed to register guest.");
            }
        } catch (error) {
            console.error("Error registering guest:", error);
        }
    };

    // Handle Attendance Marking
    const handleMarkAttendance = async (regId, attendanceValue) => {
        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    registration_id: regId,
                    attendance: attendanceValue
                })
            });

            if (response.ok) {
                // Instantly update local state to feel ultra snappy
                setRegistrations(registrations.map(r => r.id === regId ? { ...r, attendance: attendanceValue } : r));
            } else {
                alert("Failed to mark attendance status.");
            }
        } catch (error) {
            console.error("Error marking attendance:", error);
        }
    };

    // Handle Member RSVP Response Click
    const handleMemberResponse = async (status) => {
        if (!userEmail) {
            alert("Could not identify your member email. Please try logging in again.");
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    member_email: userEmail,
                    status: status
                })
            });

            if (response.ok) {
                alert(`Your RSVP response has been successfully saved: ${status.toUpperCase()}!`);
                // Reload registrations
                const regRes = await fetch(`http://127.0.0.1:8001/events/${id}/participants`);
                if (regRes.ok) {
                    const regData = await regRes.json();
                    setRegistrations(regData);
                }
            } else {
                const err = await response.json();
                alert(err.detail || "Failed to submit RSVP response.");
            }
        } catch (error) {
            console.error("Error submitting member RSVP response:", error);
        }
    };

    // Send Alert message broadcast
    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastMsg) return;

        setBroadcastStatus("sending");
        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/broadcast`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient_group: broadcastGroup,
                    message: broadcastMsg
                })
            });

            if (response.ok) {
                setBroadcastStatus("success");
                alert("Alert message broadcast dispatched successfully to recipients!");
                setBroadcastMsg("");
            } else {
                setBroadcastStatus("failed");
                alert("Failed to send message.");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setBroadcastStatus("failed");
        }
    };

    // Trigger Automatic Reminder
    const handleTriggerReminder = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/send-reminder`, {
                method: "POST"
            });
            if (response.ok) {
                const result = await response.json();
                alert(result.message);
            } else {
                alert("Failed to send reminders.");
            }
        } catch (error) {
            console.error("Error sending reminders:", error);
        }
    };

    if (loading) {
        return (
            <div className="events-container" style={{ textAlign: "center", padding: "100px" }}>
                <h2>Loading Event Panel...</h2>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="events-container" style={{ textAlign: "center", padding: "100px" }}>
                <h2>Event Not Found</h2>
                <Link href="/dashboard/events">Back to Events List</Link>
            </div>
        );
    }

    // Calculations for RSVPs
    const countAll = registrations.length;
    const countAccepted = registrations.filter(r => r.status === "accepted").length;
    const countPending = registrations.filter(r => r.status === "pending").length;
    const countDeclined = registrations.filter(r => r.status === "declined").length;
    const countMaybe = registrations.filter(r => r.status === "maybe").length;
    const countWaitlist = registrations.filter(r => r.status === "waitlisted").length;

    const filteredRegistrations = registrations.filter(r => {
        if (rsvpSubTab === "all") return true;
        return r.status === rsvpSubTab;
    });

    // Attendance calculations
    const activeConfirmed = registrations.filter(r => ["accepted", "maybe"].includes(r.status));
    const countPresent = activeConfirmed.filter(r => r.attendance === "present").length;
    const countLate = activeConfirmed.filter(r => r.attendance === "late").length;
    const countAbsent = activeConfirmed.filter(r => r.attendance === "absent").length;
    const presenceRate = activeConfirmed.length > 0 
        ? Math.round(((countPresent + countLate) / activeConfirmed.length) * 100) 
        : 0;

    // Cover preset background
    const coverPresets = {
        "Match": "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
        "Training": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "Meeting": "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
        "Social": "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
        "Tournament": "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
        "Ceremony": "linear-gradient(135deg, #10b981 0%, #047857 100%)"
    };

    const coverBg = event.cover_image && event.cover_image.startsWith("linear")
        ? event.cover_image
        : coverPresets[event.type] || "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)";

    const hasAttachments = event.rules_pdf || event.schedule_file || event.permission_forms || event.match_fixtures || event.event_posters;

    // Find the logged-in member's RSVP status
    const memberReg = registrations.find(r => r.participant_email?.toLowerCase() === userEmail?.toLowerCase());
    const memberRSVPStatus = memberReg ? memberReg.status : "pending";

    return (
        <div className="events-container">
            <div style={{ marginBottom: "20px" }}>
                <Link href="/dashboard/events" className="back-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#64748b", fontWeight: "600", fontSize: "14px" }}>
                    ← Back to Events Dashboard
                </Link>
            </div>

            {/* Event Name & Category Cover */}
            <div 
                style={{ 
                    background: coverBg, 
                    backgroundImage: event.cover_image && !event.cover_image.startsWith("linear") ? `url(${event.cover_image})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderRadius: "20px", 
                    padding: "36px", 
                    color: "white",
                    marginBottom: "28px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                }}
            >
                <span className="event-card-category" style={{ background: "rgba(0,0,0,0.5)", padding: "6px 14px", fontSize: "13px" }}>
                    {event.type}
                </span>
                <h1 style={{ fontSize: "36px", fontWeight: "900", margin: "16px 0 8px 0", textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                    {event.name}
                </h1>
                <p style={{ margin: "0", opacity: "0.9", fontSize: "16px", fontWeight: "500", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                    📅 {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Two Column Dashboard Grid */}
            <div className="event-mgmt-grid">
                
                {/* LEFT SIDEBAR: EVENT INFORMATION */}
                <div className="event-info-sidebar">
                    <h2>Event Information</h2>
                    
                    <div className="event-card-meta" style={{ gap: "14px", fontSize: "14px" }}>
                        <div className="meta-item">
                            <span className="meta-icon">⏰</span>
                            <div>
                                <strong style={{ display: "block", color: "#334155" }}>Time</strong>
                                <span>{event.start_time && event.end_time ? `${event.start_time} - ${event.end_time}` : event.time || "Not specified"}</span>
                            </div>
                        </div>

                        <div className="meta-item">
                            <span className="meta-icon">📍</span>
                            <div>
                                <strong style={{ display: "block", color: "#334155" }}>Venue Location</strong>
                                <span>{event.location}</span>
                            </div>
                        </div>

                        {event.registration_deadline && (
                            <div className="meta-item">
                                <span className="meta-icon">⌛</span>
                                <div>
                                    <strong style={{ display: "block", color: "#334155" }}>RSVP Deadline</strong>
                                    <span style={{ color: "#ef4444", fontWeight: "600" }}>{event.registration_deadline}</span>
                                </div>
                            </div>
                        )}

                        <div className="meta-item">
                            <span className="meta-icon">👥</span>
                            <div>
                                <strong style={{ display: "block", color: "#334155" }}>Target Group</strong>
                                <span style={{ color: "#6366f1", fontWeight: "600" }}>{event.group_name || "Club-Wide"}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                        <strong style={{ display: "block", color: "#0f172a", marginBottom: "8px", fontSize: "14px" }}>About the Event</strong>
                        <p style={{ color: "#475569", fontSize: "13px", lineHeight: "1.6", margin: "0" }}>
                            {event.description || "No description provided for this event."}
                        </p>
                    </div>

                    {/* EVENT SETTINGS badge-display */}
                    <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                        <strong style={{ display: "block", color: "#0f172a", marginBottom: "10px", fontSize: "14px" }}>Event Rules & Settings</strong>
                        <div className="event-card-settings" style={{ border: "none", padding: "0" }}>
                            {event.is_public ? <span className="setting-badge">🌐 Public Event</span> : <span className="setting-badge">🔒 Private Event</span>}
                            {event.attendance_tracking && <span className="setting-badge">📝 Attendance Tracking active</span>}
                            {event.auto_reminder && <span className="setting-badge">🔔 Automatic Reminders</span>}
                            {event.allow_guest ? <span className="setting-badge">👥 Guests Allowed</span> : <span className="setting-badge">🚫 No Guests</span>}
                            {event.allow_waiting_list && <span className="setting-badge">⏳ Waitlist Active</span>}
                        </div>
                    </div>

                    {/* DOWNLOAD ATTACHMENTS SECTION */}
                    <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                        <strong style={{ display: "block", color: "#0f172a", marginBottom: "12px", fontSize: "14px" }}>Event Attachments</strong>
                        {hasAttachments ? (
                            <div className="attachment-links-grid">
                                {event.rules_pdf && (
                                    <a href={event.rules_pdf} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">📕</span>
                                            <span className="attachment-name">Rules PDF</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                                {event.schedule_file && (
                                    <a href={event.schedule_file} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">📅</span>
                                            <span className="attachment-name">Schedule</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                                {event.permission_forms && (
                                    <a href={event.permission_forms} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">📝</span>
                                            <span className="attachment-name">Permission Form</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                                {event.match_fixtures && (
                                    <a href={event.match_fixtures} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">🏆</span>
                                            <span className="attachment-name">Match Fixtures</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                                {event.event_posters && (
                                    <a href={event.event_posters} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">🎨</span>
                                            <span className="attachment-name">Event Poster</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                            </div>
                        ) : (
                            <p style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", margin: "0" }}>
                                No attachments uploaded.
                            </p>
                        )}
                    </div>

                </div>

                {/* RIGHT PANE: DETAILED ACTIONS (Role-Aware) */}
                <div>
                    {isMember ? (
                        /* PREMIUM MEMBER RSVP VIEW */
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            
                            {/* Member RSVP Status Response Card */}
                            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                                <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "800", color: "#1e293b" }}>Your RSVP Status</h3>
                                <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>Please let the coaching squad know if you can attend this club event.</p>
                                
                                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px 20px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                    <div>
                                        <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Signed In As</span>
                                        <strong style={{ display: "block", fontSize: "15px", color: "#334155" }}>{userName || "Active Member"} ({userEmail})</strong>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", display: "block", textAlign: "right" }}>Current Response</span>
                                        <span className={`badge-status ${memberRSVPStatus}`} style={{ fontSize: "13px", padding: "6px 14px", display: "inline-block", marginTop: "4px" }}>
                                            {memberRSVPStatus.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                                    <button 
                                        onClick={() => handleMemberResponse("accepted")}
                                        style={{ 
                                            padding: "14px 10px", 
                                            background: memberRSVPStatus === "accepted" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "#eff6ff", 
                                            color: memberRSVPStatus === "accepted" ? "white" : "#2563eb", 
                                            border: "none", 
                                            borderRadius: "12px", 
                                            fontSize: "14px", 
                                            fontWeight: "700", 
                                            cursor: "pointer", 
                                            transition: "all 0.2s",
                                            boxShadow: memberRSVPStatus === "accepted" ? "0 4px 12px rgba(16, 185, 129, 0.2)" : "none"
                                        }}
                                        onMouseOver={(e) => { if (memberRSVPStatus !== "accepted") e.currentTarget.style.backgroundColor = "#dbeafe"; }}
                                        onMouseOut={(e) => { if (memberRSVPStatus !== "accepted") e.currentTarget.style.backgroundColor = "#eff6ff"; }}
                                    >
                                        ✓ Accept Invite
                                    </button>
                                    <button 
                                        onClick={() => handleMemberResponse("maybe")}
                                        style={{ 
                                            padding: "14px 10px", 
                                            background: memberRSVPStatus === "maybe" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "#fef3c7", 
                                            color: memberRSVPStatus === "maybe" ? "white" : "#d97706", 
                                            border: "none", 
                                            borderRadius: "12px", 
                                            fontSize: "14px", 
                                            fontWeight: "700", 
                                            cursor: "pointer", 
                                            transition: "all 0.2s",
                                            boxShadow: memberRSVPStatus === "maybe" ? "0 4px 12px rgba(245, 158, 11, 0.2)" : "none"
                                        }}
                                        onMouseOver={(e) => { if (memberRSVPStatus !== "maybe") e.currentTarget.style.backgroundColor = "#fde68a"; }}
                                        onMouseOut={(e) => { if (memberRSVPStatus !== "maybe") e.currentTarget.style.backgroundColor = "#fef3c7"; }}
                                    >
                                        ❓ Maybe
                                    </button>
                                    <button 
                                        onClick={() => handleMemberResponse("declined")}
                                        style={{ 
                                            padding: "14px 10px", 
                                            background: memberRSVPStatus === "declined" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "#fee2e2", 
                                            color: memberRSVPStatus === "declined" ? "white" : "#ef4444", 
                                            border: "none", 
                                            borderRadius: "12px", 
                                            fontSize: "14px", 
                                            fontWeight: "700", 
                                            cursor: "pointer", 
                                            transition: "all 0.2s",
                                            boxShadow: memberRSVPStatus === "declined" ? "0 4px 12px rgba(239, 68, 68, 0.2)" : "none"
                                        }}
                                        onMouseOver={(e) => { if (memberRSVPStatus !== "declined") e.currentTarget.style.backgroundColor = "#fecaca"; }}
                                        onMouseOut={(e) => { if (memberRSVPStatus !== "declined") e.currentTarget.style.backgroundColor = "#fee2e2"; }}
                                    >
                                        ✗ Decline Invite
                                    </button>
                                </div>
                            </div>

                            {/* Guest Form for Members */}
                            {event.allow_guest && (
                                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                                    <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "800", color: "#1e293b" }}>Register an Event Guest</h3>
                                    <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#64748b" }}>You can bring friends or family to this event! Register their details here.</p>
                                    
                                    <form onSubmit={handleRegisterGuest} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <div style={{ display: "flex", gap: "12px" }}>
                                            <input 
                                                type="text" 
                                                placeholder="Guest Full Name" 
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                                style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                                                required
                                            />
                                            <input 
                                                type="email" 
                                                placeholder="Guest Email Address" 
                                                value={guestEmail}
                                                onChange={(e) => setGuestEmail(e.target.value)}
                                                style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                                                required
                                            />
                                        </div>
                                        <button 
                                            type="submit" 
                                            className="primary-btn" 
                                            style={{ padding: "10px 18px", fontSize: "13px", alignSelf: "flex-end" }}
                                        >
                                            Register Guest +
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Who is attending / Team Roster Feed */}
                            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "800", color: "#1e293b" }}>Attending Teammates ({countAccepted})</h3>
                                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Total Invited: {countAll}</span>
                                </div>

                                <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                                    {registrations.filter(r => r.status === "accepted").length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                            {registrations.filter(r => r.status === "accepted").map((reg) => (
                                                <div key={reg.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
                                                    <div>
                                                        <strong style={{ fontSize: "13px", color: "#334155" }}>{reg.participant_name}</strong>
                                                        <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>{reg.participant_role}</span>
                                                    </div>
                                                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 8px", background: "#dcfce7", color: "#16a34a", borderRadius: "20px" }}>
                                                        CONFIRMED
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ textAlign: "center", padding: "30px", fontSize: "13px", color: "#94a3b8", fontStyle: "italic", margin: "0" }}>
                                            No confirmed attendees yet. Be the first to RSVP!
                                        </p>
                                    )}
                                </div>
                            </div>

                        </div>
                    ) : (
                        /* PREMIUM ADMINISTRATIVE TABS (Only visible to Club Admin) */
                        <>
                            {/* Management Navigation Tabs */}
                            <div className="tabs-container" style={{ marginBottom: "20px" }}>
                                <button 
                                    onClick={() => setActiveMgmtTab("rsvp")} 
                                    className={`tab-btn ${activeMgmtTab === "rsvp" ? "active" : ""}`}
                                >
                                    Invitations & RSVPs
                                </button>
                                <button 
                                    onClick={() => setActiveMgmtTab("attendance")} 
                                    className={`tab-btn ${activeMgmtTab === "attendance" ? "active" : ""}`}
                                >
                                    Attendance sheets
                                </button>
                                <button 
                                    onClick={() => setActiveMgmtTab("communication")} 
                                    className={`tab-btn ${activeMgmtTab === "communication" ? "active" : ""}`}
                                >
                                    Communications
                                </button>
                                <button 
                                    onClick={() => setActiveMgmtTab("reports")} 
                                    className={`tab-btn ${activeMgmtTab === "reports" ? "active" : ""}`}
                                >
                                    Reports & Analytics
                                </button>
                            </div>

                            {/* TAB CONTENT: INVITATIONS & RSVPS */}
                            {activeMgmtTab === "rsvp" && (
                                <div className="rsvp-section">
                                    
                                    {/* Invitation Box */}
                                    <div className="invite-card">
                                        <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1e293b" }}>Invite Participants</h3>
                                        <p style={{ margin: "0", fontSize: "12px", color: "#64748b" }}>Select target cohorts and dispatch event invitations immediately</p>
                                        
                                        <div className="invite-grid">
                                            <div 
                                                className={`invite-option ${inviteType === "all_members" ? "selected" : ""}`}
                                                onClick={() => setInviteType("all_members")}
                                            >
                                                <span className="invite-option-icon">👥</span>
                                                <span>All Members</span>
                                            </div>
                                            <div 
                                                className={`invite-option ${inviteType === "parents" ? "selected" : ""}`}
                                                onClick={() => setInviteType("parents")}
                                            >
                                                <span className="invite-option-icon">👨‍👩‍👦</span>
                                                <span>Parents</span>
                                            </div>
                                            <div 
                                                className={`invite-option ${inviteType === "coaches" ? "selected" : ""}`}
                                                onClick={() => setInviteType("coaches")}
                                            >
                                                <span className="invite-option-icon">👔</span>
                                                <span>Coaches</span>
                                            </div>
                                            <div 
                                                className={`invite-option ${inviteType === "groups" ? "selected" : ""}`}
                                                onClick={() => setInviteType("groups")}
                                            >
                                                <span className="invite-option-icon">🏆</span>
                                                <span>Select Group</span>
                                            </div>
                                        </div>

                                        {inviteType === "groups" && (
                                            <div style={{ marginTop: "16px" }}>
                                                <label htmlFor="invite-groups-select" style={{ fontSize: "12px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "6px" }}>Select specific groups</label>
                                                <select 
                                                    id="invite-groups-select"
                                                    multiple 
                                                    style={{ width: "100%", height: "80px", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                                                    onChange={(e) => {
                                                        const options = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                                                        setSelectedGroups(options);
                                                    }}
                                                >
                                                    {groups.map(g => (
                                                        <option key={g.id} value={g.id}>{g.group_name} ({g.activity})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                                            <button 
                                                onClick={handleSendInvitations}
                                                className="primary-btn" 
                                                style={{ padding: "8px 20px", borderRadius: "8px", fontSize: "13px" }}
                                            >
                                                Send Invitations 🚀
                                            </button>
                                        </div>
                                    </div>

                                    {/* Live RSVP Monitoring & Filters */}
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                            <h3 style={{ margin: "0", fontSize: "16px", color: "#1e293b" }}>RSVP Roster</h3>
                                            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Total Invited: {countAll}</span>
                                        </div>

                                        <div className="rsvp-status-tabs" style={{ flexWrap: "wrap", width: "100%" }}>
                                            <button onClick={() => setRsvpSubTab("all")} className={`rsvp-tab-btn ${rsvpSubTab === "all" ? "active" : ""}`}>All ({countAll})</button>
                                            <button onClick={() => setRsvpSubTab("accepted")} className={`rsvp-tab-btn ${rsvpSubTab === "accepted" ? "active" : ""}`}>Accepted ({countAccepted})</button>
                                            <button onClick={() => setRsvpSubTab("pending")} className={`rsvp-tab-btn ${rsvpSubTab === "pending" ? "active" : ""}`}>Pending ({countPending})</button>
                                            <button onClick={() => setRsvpSubTab("declined")} className={`rsvp-tab-btn ${rsvpSubTab === "declined" ? "active" : ""}`}>Declined ({countDeclined})</button>
                                            <button onClick={() => setRsvpSubTab("maybe")} className={`rsvp-tab-btn ${rsvpSubTab === "maybe" ? "active" : ""}`}>Maybe ({countMaybe})</button>
                                            {event.allow_waiting_list && <button onClick={() => setRsvpSubTab("waitlisted")} className={`rsvp-tab-btn ${rsvpSubTab === "waitlisted" ? "active" : ""}`}>Waitlist ({countWaitlist})</button>}
                                        </div>

                                        {/* Table */}
                                        <div style={{ overflowX: "auto" }}>
                                            <table className="roster-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                                <thead>
                                                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Participant Name</th>
                                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Role</th>
                                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Email Address</th>
                                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>RSVP Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredRegistrations.length > 0 ? (
                                                        filteredRegistrations.map((reg) => (
                                                            <tr key={reg.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                                <td style={{ padding: "12px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{reg.participant_name}</td>
                                                                <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{reg.participant_role}</td>
                                                                <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{reg.participant_email}</td>
                                                                <td style={{ padding: "12px" }}>
                                                                    <span className={`badge-status ${reg.status}`}>{reg.status}</span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                                                                No participants in this filter.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Guest Form */}
                                        {event.allow_guest && (
                                            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                                                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#334155" }}>Guest Offline Registration Form</h4>
                                                <form onSubmit={handleRegisterGuest} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Guest Full Name" 
                                                        value={guestName}
                                                        onChange={(e) => setGuestName(e.target.value)}
                                                        style={{ flex: 1, minWidth: "150px" }}
                                                        required
                                                    />
                                                    <input 
                                                        type="email" 
                                                        placeholder="Guest Email Address" 
                                                        value={guestEmail}
                                                        onChange={(e) => setGuestEmail(e.target.value)}
                                                        style={{ flex: 1, minWidth: "150px" }}
                                                        required
                                                    />
                                                    <button 
                                                        type="submit" 
                                                        className="primary-btn" 
                                                        style={{ padding: "10px 18px", fontSize: "12px" }}
                                                    >
                                                        Register Guest
                                                    </button>
                                                </form>
                                            </div>
                                        )}

                                    </div>

                                </div>
                            )}

                            {/* TAB CONTENT: ATTENDANCE SHEETS */}
                            {activeMgmtTab === "attendance" && (
                                <div className="rsvp-section">
                                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1e293b" }}>Event Attendance Sheet</h3>
                                    <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#64748b" }}>Mark and track participant status (Present, Absent, Late) on event day</p>

                                    <div style={{ overflowX: "auto" }}>
                                        <table className="roster-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                                    <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Participant</th>
                                                    <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Role</th>
                                                    <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>RSVP</th>
                                                    <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Attendance Mark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeConfirmed.length > 0 ? (
                                                    activeConfirmed.map((reg) => (
                                                        <tr key={reg.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                            <td style={{ padding: "12px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{reg.participant_name}</td>
                                                            <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{reg.participant_role}</td>
                                                            <td style={{ padding: "12px" }}>
                                                                <span className={`badge-status ${reg.status}`}>{reg.status}</span>
                                                            </td>
                                                            <td style={{ padding: "12px" }}>
                                                                <select
                                                                    value={reg.attendance}
                                                                    onChange={(e) => handleMarkAttendance(reg.id, e.target.value)}
                                                                    className={`attendance-select ${reg.attendance}`}
                                                                >
                                                                    <option value="not_marked">❓ Not Marked</option>
                                                                    <option value="present">✓ Present</option>
                                                                    <option value="absent">✗ Absent</option>
                                                                    <option value="late">⏰ Late</option>
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                                                            No confirmed attendees yet. Add or invite participants in "Invitations & RSVPs" tab first!
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB CONTENT: COMMUNICATIONS */}
                            {activeMgmtTab === "communication" && (
                                <div className="rsvp-section">
                                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1e293b" }}>Event Broadcaster & Reminders</h3>
                                    <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#64748b" }}>Send alerts, rule notifications, or reminders directly to participant inbox</p>

                                    {/* Broadcast form */}
                                    <form onSubmit={handleSendBroadcast} style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "28px" }}>
                                        <div className="form-group">
                                            <label htmlFor="broadcast-group-select" style={{ fontSize: "13px", fontWeight: "700" }}>Recipient Group</label>
                                            <select 
                                                id="broadcast-group-select"
                                                value={broadcastGroup}
                                                onChange={(e) => setBroadcastGroup(e.target.value)}
                                                style={{ marginTop: "6px" }}
                                            >
                                                <option value="confirmed">Confirmed Attendees Only</option>
                                                <option value="invitees">All Invitees (Including Pending)</option>
                                                <option value="non_attendees">Declined & Pending Members</option>
                                            </select>
                                        </div>

                                        <div className="form-group" style={{ marginTop: "16px" }}>
                                            <label htmlFor="broadcast-msg-input" style={{ fontSize: "13px", fontWeight: "700" }}>Alert Message</label>
                                            <textarea
                                                id="broadcast-msg-input"
                                                rows="4"
                                                placeholder="Write details to send (e.g. 'Match postponed by 1 hour due to rain. Please bring dark bibs.')"
                                                value={broadcastMsg}
                                                onChange={(e) => setBroadcastMsg(e.target.value)}
                                                style={{ marginTop: "6px" }}
                                                required
                                            ></textarea>
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                                            <button 
                                                type="submit" 
                                                className="primary-btn"
                                                disabled={broadcastStatus === "sending"}
                                                style={{ background: "#4f46e5", padding: "10px 24px" }}
                                            >
                                                {broadcastStatus === "sending" ? "Sending Broadcast..." : "Broadcast Message ✉"}
                                            </button>
                                        </div>
                                    </form>

                                    {/* Automatic Reminders Tigger */}
                                    <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "16px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <h4 style={{ margin: "0 0 4px 0", color: "#5b21b6", fontSize: "14px", fontWeight: "700" }}>Dispatch Automatic Reminders</h4>
                                            <p style={{ margin: "0", fontSize: "12px", color: "#6d28d9" }}>Simulate dispatching automated email/SMS reminders to all pending invitees</p>
                                        </div>
                                        <button 
                                            onClick={handleTriggerReminder}
                                            className="primary-btn"
                                            style={{ background: "#7c3aed", padding: "10px 20px" }}
                                        >
                                            Trigger Reminders 🔔
                                        </button>
                                    </div>

                                </div>
                            )}

                            {/* TAB CONTENT: REPORTS & ANALYTICS */}
                            {activeMgmtTab === "reports" && (
                                <div className="rsvp-section">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                        <div>
                                            <h3 style={{ margin: "0", fontSize: "16px", color: "#1e293b" }}>Analytics & Participation Reports</h3>
                                            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>Live attendance statistics and participation breakdown</p>
                                        </div>
                                        <button 
                                            onClick={() => alert("CSV Report Downloaded Successfully!")}
                                            className="primary-btn" 
                                            style={{ background: "#10b981", padding: "8px 16px", fontSize: "13px" }}
                                        >
                                            Export Attendance Report 📥
                                        </button>
                                    </div>

                                    <div className="analytics-grid">
                                        
                                        {/* CARD 1: Attendance rate */}
                                        <div className="analytics-card">
                                            <span className="analytics-title">Attendance Rate</span>
                                            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "10px 0" }}>
                                                <span style={{ fontSize: "36px", fontWeight: "900", color: "#6366f1" }}>{presenceRate}%</span>
                                                <span style={{ color: "#64748b", fontSize: "13px" }}>Presence Rate</span>
                                            </div>
                                            <div className="progress-bar-container">
                                                <div className="progress-bar-fill" style={{ width: `${presenceRate}%` }}></div>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                                                <span>Present: {countPresent}</span>
                                                <span>Late: {countLate}</span>
                                                <span>Absent: {countAbsent}</span>
                                            </div>
                                        </div>

                                        {/* CARD 2: Role Breakdown */}
                                        <div className="analytics-card">
                                            <span className="analytics-title">Role Distribution</span>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "8px" }}>
                                                <div className="role-stat-item">
                                                    <span className="role-label">Coaches</span>
                                                    <span className="role-count">{registrations.filter(r => r.participant_role && r.participant_role.toLowerCase().includes("coach")).length}</span>
                                                </div>
                                                <div className="role-stat-item">
                                                    <span className="role-label">Players / Members</span>
                                                    <span className="role-count">{registrations.filter(r => r.participant_role && (r.participant_role.toLowerCase().includes("player") || r.participant_role.toLowerCase().includes("member"))).length}</span>
                                                </div>
                                                <div className="role-stat-item">
                                                    <span className="role-label">Parents</span>
                                                    <span className="role-count">{registrations.filter(r => r.participant_role && r.participant_role.toLowerCase().includes("parent")).length}</span>
                                                </div>
                                                <div className="role-stat-item">
                                                    <span className="role-label">Guests</span>
                                                    <span className="role-count">{registrations.filter(r => r.participant_role && r.participant_role.toLowerCase().includes("guest")).length}</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Attendance statistics tables */}
                                    <div style={{ marginTop: "28px" }}>
                                        <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#334155" }}>RSVP Summary</h4>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                                            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Confirmed</span>
                                                <span style={{ display: "block", fontSize: "20px", fontWeight: "800", color: "#15803d", marginTop: "4px" }}>{countAccepted}</span>
                                            </div>
                                            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Pending</span>
                                                <span style={{ display: "block", fontSize: "20px", fontWeight: "800", color: "#b45309", marginTop: "4px" }}>{countPending}</span>
                                            </div>
                                            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Declined</span>
                                                <span style={{ display: "block", fontSize: "20px", fontWeight: "800", color: "#b91c1c", marginTop: "4px" }}>{countDeclined}</span>
                                            </div>
                                            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Waitlisted</span>
                                                <span style={{ display: "block", fontSize: "20px", fontWeight: "800", color: "#6b21a8", marginTop: "4px" }}>{countWaitlist}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </>
                    )}

                </div>

            </div>

        </div>
    );
}
