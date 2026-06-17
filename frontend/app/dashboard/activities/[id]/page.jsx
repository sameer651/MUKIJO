"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../../../styles/activities.css";

export default function ActivityDetailPage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const activityId = parseInt(params.id);
    const router = useRouter();

    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState("Anonymous Player");
    const [isMember, setIsMember] = useState(false);

    // Reschedule state
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [useCustomLocation, setUseCustomLocation] = useState(true);
    const [venues, setVenues] = useState([]);
    const [slots, setSlots] = useState([]);
    const [rescheduleData, setRescheduleData] = useState({
        date: "",
        time: "",
        location: "",
        venue_id: "",
        slot_id: ""
    });

    // Message board state
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const id = localStorage.getItem("userId") || "2"; // Default fallback
            setUserId(parseInt(id));
            setUserName(localStorage.getItem("userName") || "Anonymous Player");
            setIsMember(localStorage.getItem("isMember") === "true");
        }
    }, []);

    const fetchVenues = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8001/venues");
            if (response.ok) {
                const data = await response.json();
                setVenues(data);
            }
        } catch (error) {
            console.error("Error fetching venues:", error);
        }
    };

    const fetchSlotsForVenue = async (venueId) => {
        if (!venueId) return;
        try {
            const response = await fetch(`http://127.0.0.1:8001/venues/${venueId}/slots`);
            if (response.ok) {
                const data = await response.json();
                setSlots(data.filter(s => !s.is_blocked));
            }
        } catch (error) {
            console.error("Error fetching slots:", error);
        }
    };

    useEffect(() => {
        if (isRescheduleModalOpen) {
            fetchVenues();
            if (activity) {
                setRescheduleData({
                    date: activity.date || "",
                    time: activity.time || "",
                    location: activity.location || "",
                    venue_id: activity.venue_id || "",
                    slot_id: activity.slot_id || ""
                });
                setUseCustomLocation(!activity.venue_id);
                if (activity.venue_id) {
                    fetchSlotsForVenue(activity.venue_id);
                }
            }
        }
    }, [isRescheduleModalOpen, activity]);

    const handleVenueChange = (e) => {
        const venueId = e.target.value;
        setRescheduleData(prev => ({
            ...prev,
            venue_id: venueId,
            slot_id: "",
            location: ""
        }));
        setSlots([]);
        if (venueId) {
            fetchSlotsForVenue(venueId);
            const venue = venues.find(v => v.id === parseInt(venueId));
            if (venue) {
                setRescheduleData(prev => ({
                    ...prev,
                    venue_id: venueId,
                    location: `${venue.name}, ${venue.location}`
                }));
            }
        }
    };

    const handleSlotChange = (e) => {
        const slotId = e.target.value;
        if (!slotId) {
            setRescheduleData(prev => ({ ...prev, slot_id: "", date: "", time: "" }));
            return;
        }

        const slot = slots.find(s => s.id === parseInt(slotId));
        if (slot) {
            const dt = new Date(slot.start_time);
            const dateStr = dt.toISOString().split("T")[0];
            const timeStr = dt.toTimeString().split(" ")[0].slice(0, 5); // HH:MM

            setRescheduleData(prev => ({
                ...prev,
                slot_id: slotId,
                date: dateStr,
                time: timeStr
            }));
        }
    };

    const handleCancelGame = async () => {
        if (!confirm("Are you sure you want to cancel this game?")) return;
        try {
            const response = await fetch(`http://127.0.0.1:8001/activities/${activityId}/cancel`, {
                method: "POST",
                headers: { "X-Is-Member": "false" }
            });
            if (response.ok) {
                fetchActivity();
            } else {
                const err = await response.json();
                alert(err.detail || "Unable to cancel game");
            }
        } catch (error) {
            console.error("Error cancelling game:", error);
        }
    };

    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            date: rescheduleData.date,
            time: rescheduleData.time,
            location: rescheduleData.location || "Custom Location",
            venue_id: useCustomLocation ? null : (rescheduleData.venue_id ? parseInt(rescheduleData.venue_id) : null),
            slot_id: useCustomLocation ? null : (rescheduleData.slot_id ? parseInt(rescheduleData.slot_id) : null)
        };
        try {
            const response = await fetch(`http://127.0.0.1:8001/activities/${activityId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-Is-Member": "false"
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setIsRescheduleModalOpen(false);
                fetchActivity();
            } else {
                const err = await response.json();
                alert(err.detail || "Unable to reschedule game");
            }
        } catch (error) {
            console.error("Error rescheduling game:", error);
        }
    };

    const fetchActivity = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8001/activities");
            if (response.ok) {
                const data = await response.json();
                const current = data.find(a => a.id === activityId);
                if (current) {
                    setActivity(current);
                } else {
                    console.error("Activity not found.");
                }
            }
        } catch (error) {
            console.error("Error fetching activity:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();
        
        // Load discussion board messages from localStorage
        const stored = localStorage.getItem(`mukijo_activity_chat_${activityId}`);
        if (stored) {
            setMessages(JSON.parse(stored));
        } else {
            // Seed mock comments for visual excellence
            const mock = [
                { id: 1, senderName: "Praveen Kumar", text: "I can bring the tennis balls! Anyone up for doubles?", time: "2 hours ago", senderId: 99 },
                { id: 2, senderName: "Anjali Singh", text: "Awesome, I'm intermediate level, see you there!", time: "1 hour ago", senderId: 100 }
            ];
            setMessages(mock);
            localStorage.setItem(`mukijo_activity_chat_${activityId}`, JSON.stringify(mock));
        }
    }, [activityId]);

    const handleJoinGame = async () => {
        if (!userId) return;
        try {
            const response = await fetch(`http://127.0.0.1:8001/activities/${activityId}/rsvp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, status: "confirmed" })
            });

            if (response.ok) {
                fetchActivity();
            } else {
                const err = await response.json();
                alert(err.detail || "Unable to join activity");
            }
        } catch (error) {
            console.error("Error joining game:", error);
        }
    };

    const handleCancelRSVP = async () => {
        if (!userId) return;
        try {
            const response = await fetch(`http://127.0.0.1:8001/activities/${activityId}/cancel-rsvp?user_id=${userId}`, {
                method: "POST"
            });

            if (response.ok) {
                fetchActivity();
            } else {
                const err = await response.json();
                alert(err.detail || "Unable to cancel RSVP");
            }
        } catch (error) {
            console.error("Error cancelling RSVP:", error);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !userId) return;

        const newMsgObj = {
            id: Date.now(),
            senderName: userName,
            senderId: userId,
            text: newMessage,
            time: "Just now"
        };

        const updated = [...messages, newMsgObj];
        setMessages(updated);
        localStorage.setItem(`mukijo_activity_chat_${activityId}`, JSON.stringify(updated));
        setNewMessage("");
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "80px", color: "var(--brand-secondary)", fontWeight: "600" }}>
                Loading game details...
            </div>
        );
    }

    if (!activity) {
        return (
            <div className="activities-container" style={{ textAlign: "center", padding: "60px 20px" }}>
                <h2 style={{ color: "#ffffff", marginBottom: "16px" }}>Game Not Found</h2>
                <p style={{ color: "rgba(148,163,184,0.6)", marginBottom: "24px" }}>
                    This game activity does not exist or has been deleted.
                </p>
                <Link href="/dashboard/activities" className="secondary-sporty-btn">
                    Back to Games Hub
                </Link>
            </div>
        );
    }

    const confirmedRSVPs = activity.rsvps.filter(r => r.status === "confirmed");
    const waitlistedRSVPs = activity.rsvps.filter(r => r.status === "waitlisted");
    const userRSVP = activity.rsvps.find(r => r.user_id === userId);
    const isJoined = !!userRSVP;
    const userStatus = userRSVP ? userRSVP.status : null;
    const isFull = confirmedRSVPs.length >= activity.max_players;

    return (
        <div className="activities-container">
            {/* Header Navigation */}
            <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Link href="/dashboard/activities" className="secondary-sporty-btn" style={{ textDecoration: "none" }}>
                    ← Back to Games Hub
                </Link>

                {!isMember && activity.status !== "cancelled" && (
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button className="secondary-sporty-btn" onClick={() => setIsRescheduleModalOpen(true)}>
                            Reschedule Game
                        </button>
                        <button className="sporty-btn" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }} onClick={handleCancelGame}>
                            <span>Cancel Game</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="activities-header">
                <div>
                    <span className="game-sport-badge" style={{ marginBottom: "12px", display: "inline-block" }}>
                        {activity.sport}
                    </span>
                    <h1 style={{ background: "linear-gradient(90deg, #ffffff, var(--brand-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {activity.description || `${activity.sport.toUpperCase()} pickup match`}
                    </h1>
                    <p>{activity.location}</p>
                </div>

                {isMember && (
                    <div className="game-card-actions" style={{ minWidth: "180px" }}>
                        {activity.status === "cancelled" ? (
                            <div style={{
                                textAlign: "center",
                                padding: "12px",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                border: "1px solid rgba(239, 68, 68, 0.4)",
                                color: "#ef4444",
                                background: "rgba(239, 68, 68, 0.08)"
                            }}>
                                Game Cancelled
                            </div>
                        ) : isJoined ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                                <div style={{ 
                                    textAlign: "center", 
                                    padding: "8px", 
                                    borderRadius: "8px", 
                                    fontSize: "12px", 
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    border: userStatus === "confirmed" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(245, 158, 11, 0.4)",
                                    color: userStatus === "confirmed" ? "var(--brand-emerald)" : "var(--brand-amber)",
                                    background: userStatus === "confirmed" ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)"
                                }}>
                                    You are {userStatus.toUpperCase()}
                                </div>
                                <button className="waitlist-btn" onClick={handleCancelRSVP} style={{ width: "100%" }}>
                                    Cancel RSVP
                                </button>
                            </div>
                        ) : isFull ? (
                            <button className="waitlist-btn" onClick={handleJoinGame} style={{ width: "100%" }}>
                                Join Waitlist
                            </button>
                        ) : (
                            <button className="join-btn" onClick={handleJoinGame} style={{ width: "100%", padding: "14px" }}>
                                <span>Join Game</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="detail-grid">
                {/* Main Details and Discussion Board */}
                <div className="detail-main">
                    <div className="detail-card">
                        <h2>Match Overview</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginTop: "16px" }}>
                            <div>
                                <label style={{ fontSize: "11px", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", fontWeight: "700" }}>Date & Time</label>
                                <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: "600", marginTop: "4px" }}>
                                    {activity.date} @ {activity.time}
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: "11px", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", fontWeight: "700" }}>Skill Level Needed</label>
                                <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: "600", marginTop: "4px" }}>
                                    {activity.skill_level}
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: "11px", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", fontWeight: "700" }}>Slots Capacity</label>
                                <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: "600", marginTop: "4px" }}>
                                    {confirmedRSVPs.length} / {activity.max_players} Filled
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: "11px", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", fontWeight: "700" }}>Status</label>
                                <p style={{ 
                                    color: activity.status === "open" ? "var(--brand-emerald)" : "var(--brand-accent)", 
                                    fontSize: "16px", 
                                    fontWeight: "700", 
                                    marginTop: "4px",
                                    textTransform: "uppercase" 
                                }}>
                                    {activity.status}
                                </p>
                            </div>
                        </div>

                        {activity.description && (
                            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                <label style={{ fontSize: "11px", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", fontWeight: "700" }}>Description / Rules</label>
                                <p style={{ color: "rgba(241, 245, 249, 0.8)", fontSize: "14px", marginTop: "8px", lineHeight: "1.6" }}>
                                    {activity.description}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Chat / Message Board */}
                    <div className="detail-card">
                        <h2>Discussion Board</h2>
                        <div style={{ marginTop: "16px" }}>
                            <div className="chat-container">
                                {messages.length > 0 ? (
                                    messages.map((msg) => (
                                        <div key={msg.id} className={`chat-bubble ${msg.senderId === userId ? "me" : ""}`}>
                                            <div className="chat-meta">
                                                <span>{msg.senderName}</span>
                                                <span style={{ marginLeft: "12px", opacity: 0.6 }}>{msg.time}</span>
                                            </div>
                                            <p className="chat-text">{msg.text}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px", color: "rgba(148,163,184,0.4)" }}>
                                        No messages posted yet. Start the coordination!
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSendMessage} className="chat-input-row">
                                <input
                                    type="text"
                                    placeholder="Ask about rides, gear, or confirm attendance..."
                                    required
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit">Post</button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Players Roster list */}
                <div className="detail-sidebar" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div className="detail-card">
                        <h2>Confirmed Roster ({confirmedRSVPs.length})</h2>
                        <div className="player-list" style={{ marginTop: "16px" }}>
                            {confirmedRSVPs.length > 0 ? (
                                confirmedRSVPs.map((rsvp) => (
                                    <div className="player-item" key={rsvp.id}>
                                        <div className="player-info">
                                            <div className="player-avatar">
                                                {rsvp.user_id === activity.owner_id ? "★" : "P"}
                                            </div>
                                            <div>
                                                <div className="player-name">
                                                    {rsvp.user_id === userId ? `${userName} (You)` : `Player #${rsvp.user_id}`}
                                                </div>
                                                <div className="player-role">
                                                    {rsvp.user_id === activity.owner_id ? "Host Creator" : "Confirmed"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: "rgba(148,163,184,0.4)", fontSize: "13px", textAlign: "center", padding: "12px" }}>
                                    No players confirmed.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="detail-card">
                        <h2>Waitlist Queue ({waitlistedRSVPs.length})</h2>
                        <div className="player-list" style={{ marginTop: "16px" }}>
                            {waitlistedRSVPs.length > 0 ? (
                                waitlistedRSVPs.map((rsvp, idx) => (
                                    <div className="player-item" key={rsvp.id}>
                                        <div className="player-info">
                                            <div className="player-avatar" style={{ background: "linear-gradient(135deg, var(--brand-amber), var(--brand-accent))" }}>
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <div className="player-name">
                                                    {rsvp.user_id === userId ? `${userName} (You)` : `Player #${rsvp.user_id}`}
                                                </div>
                                                <div className="player-role">
                                                    Joined waitlist {new Date(rsvp.joined_at).toLocaleTimeString().slice(0,5)}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="player-status-badge waitlisted">Queue</span>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: "rgba(148,163,184,0.4)", fontSize: "13px", textAlign: "center", padding: "12px" }}>
                                    Waitlist queue is empty.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reschedule Modal */}
            {isRescheduleModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setIsRescheduleModalOpen(false)}>×</button>
                        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", marginBottom: "20px" }}>Reschedule Game</h2>
                        
                        <form onSubmit={handleRescheduleSubmit}>
                            <div style={{ display: "flex", gap: "16px", marginBottom: "18px" }}>
                                <button 
                                    type="button" 
                                    className={`secondary-sporty-btn ${useCustomLocation ? "active" : ""}`}
                                    style={{ flex: 1, borderColor: useCustomLocation ? "var(--brand-primary)" : "rgba(255,255,255,0.1)" }}
                                    onClick={() => setUseCustomLocation(true)}
                                >
                                    Custom Location
                                </button>
                                <button 
                                    type="button" 
                                    className={`secondary-sporty-btn ${!useCustomLocation ? "active" : ""}`}
                                    style={{ flex: 1, borderColor: !useCustomLocation ? "var(--brand-primary)" : "rgba(255,255,255,0.1)" }}
                                    onClick={() => setUseCustomLocation(false)}
                                >
                                    Booked Venue/Slot
                                </button>
                            </div>

                            {useCustomLocation ? (
                                <div className="form-group" style={{ marginBottom: "18px" }}>
                                    <label>Location Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Community Ground B, Gachibowli" 
                                        required
                                        value={rescheduleData.location}
                                        onChange={(e) => setRescheduleData({ ...rescheduleData, location: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "18px" }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Select Venue</label>
                                        <select 
                                            value={rescheduleData.venue_id} 
                                            onChange={handleVenueChange}
                                            required={!useCustomLocation}
                                        >
                                            <option value="">-- Choose Venue --</option>
                                            {venues.map(v => (
                                                <option key={v.id} value={v.id}>{v.name} ({v.location})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Select Slot Inventory</label>
                                        <select 
                                            value={rescheduleData.slot_id} 
                                            onChange={handleSlotChange}
                                            required={!useCustomLocation}
                                            disabled={!rescheduleData.venue_id}
                                        >
                                            <option value="">-- Choose Time Slot --</option>
                                            {slots.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.start_time.split("T")[0]} ({s.sport.toUpperCase()}): {s.start_time.split("T")[1].slice(0,5)} to {s.end_time.split("T")[1].slice(0,5)} - ₹{s.current_price}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
                                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                    <label>Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        disabled={!useCustomLocation && rescheduleData.slot_id}
                                        value={rescheduleData.date}
                                        onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                    <label>Time</label>
                                    <input 
                                        type="time" 
                                        required
                                        disabled={!useCustomLocation && rescheduleData.slot_id}
                                        value={rescheduleData.time}
                                        onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "14px", justifyContent: "flex-end" }}>
                                <button type="button" className="secondary-sporty-btn" onClick={() => setIsRescheduleModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="sporty-btn">
                                    <span>Reschedule</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
