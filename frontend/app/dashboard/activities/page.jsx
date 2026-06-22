"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../../styles/activities.css";

const SPORTS = ["all", "football", "badminton", "cricket", "tennis", "basketball", "pickleball"];

export default function ActivitiesPage() {
    const [activities, setActivities] = useState([]);
    const [venues, setVenues] = useState([]);
    const [slots, setSlots] = useState([]);
    
    // Filters
    const [sportFilter, setSportFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [useCustomLocation, setUseCustomLocation] = useState(true);
    
    const [formData, setFormData] = useState({
        sport: "football",
        date: "",
        time: "",
        location: "",
        venue_id: "",
        slot_id: "",
        max_players: 10,
        min_players: 2,
        skill_level: "All",
        description: ""
    });

    const [userId, setUserId] = useState(null);
    const [isMember, setIsMember] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const id = localStorage.getItem("userId") || "2"; // Default fallback to test user
            setUserId(parseInt(id));
            setIsMember(localStorage.getItem("isMember") === "true");
        }
    }, []);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            let url = "http://127.0.0.1:8001/activities";
            const params = [];
            if (sportFilter !== "all") params.push(`sport=${sportFilter}`);
            if (searchQuery) params.push(`location=${searchQuery}`);
            if (params.length > 0) {
                url += "?" + params.join("&");
            }
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setActivities(data);
            }
        } catch (error) {
            console.error("Error fetching activities:", error);
        } finally {
            setLoading(false);
        }
    };

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
                // Filter slots to only those that are not blocked
                setSlots(data.filter(s => !s.is_blocked));
            }
        } catch (error) {
            console.error("Error fetching slots:", error);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, [sportFilter, searchQuery]);

    useEffect(() => {
        if (isModalOpen) {
            fetchVenues();
        }
    }, [isModalOpen]);

    // When venue changes, fetch its slots
    const handleVenueChange = (e) => {
        const venueId = e.target.value;
        setFormData(prev => ({
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
                setFormData(prev => ({
                    ...prev,
                    venue_id: venueId,
                    location: `${venue.name}, ${venue.location}`
                }));
            }
        }
    };

    // When slot changes, fill date and time
    const handleSlotChange = (e) => {
        const slotId = e.target.value;
        if (!slotId) {
            setFormData(prev => ({ ...prev, slot_id: "", date: "", time: "" }));
            return;
        }
        
        const slot = slots.find(s => s.id === parseInt(slotId));
        if (slot) {
            // start_time format is YYYY-MM-DDTHH:MM:SS
            const dt = new Date(slot.start_time);
            const dateStr = dt.toISOString().split("T")[0];
            const timeStr = dt.toTimeString().split(" ")[0].slice(0, 5); // HH:MM
            
            setFormData(prev => ({
                ...prev,
                slot_id: slotId,
                date: dateStr,
                time: timeStr,
                sport: slot.sport
            }));
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!userId) return;
        if (isMember) {
            alert("Only club admins are allowed to create games.");
            return;
        }

        const payload = {
            owner_id: userId,
            sport: formData.sport,
            date: formData.date,
            time: formData.time,
            location: formData.location || "Custom Location",
            max_players: parseInt(formData.max_players),
            min_players: parseInt(formData.min_players),
            skill_level: formData.skill_level,
            description: formData.description || ""
        };

        if (!useCustomLocation) {
            payload.venue_id = formData.venue_id ? parseInt(formData.venue_id) : null;
            payload.slot_id = formData.slot_id ? parseInt(formData.slot_id) : null;
        }

        try {
            const headers = { "Content-Type": "application/json" };
            if (isMember) {
                headers["X-Is-Member"] = "true";
            }

            const response = await fetch("http://127.0.0.1:8001/activities", {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setIsModalOpen(false);
                setFormData({
                    sport: "football",
                    date: "",
                    time: "",
                    location: "",
                    venue_id: "",
                    slot_id: "",
                    max_players: 10,
                    min_players: 2,
                    skill_level: "All",
                    description: ""
                });
                fetchActivities();
            } else {
                const err = await response.json();
                alert(`Error: ${err.detail || "Failed to create activity"}`);
            }
        } catch (error) {
            console.error("Error creating activity:", error);
            alert("Failed to connect to backend server.");
        }
    };

    const handleJoinGame = async (activityId) => {
        if (!userId) {
            alert("Please log in to RSVP.");
            return;
        }
        try {
            const response = await fetch(`http://127.0.0.1:8001/activities/${activityId}/rsvp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, status: "confirmed" })
            });

            if (response.ok) {
                fetchActivities();
            } else {
                const err = await response.json();
                alert(err.detail || "Unable to join activity");
            }
        } catch (error) {
            console.error("Error joining game:", error);
        }
    };

    const handleCancelRSVP = async (activityId) => {
        if (!userId) return;
        try {
            const response = await fetch(`http://127.0.0.1:8001/activities/${activityId}/cancel-rsvp?user_id=${userId}`, {
                method: "POST"
            });

            if (response.ok) {
                fetchActivities();
            } else {
                const err = await response.json();
                alert(err.detail || "Unable to cancel RSVP");
            }
        } catch (error) {
            console.error("Error cancelling RSVP:", error);
        }
    };

    return (
        <div className="activities-container">
            <div className="activities-header">
                <div>
                    <h1>Games Hub</h1>
                    <p>Discover pickup matches, find players, and coordinate community games</p>
                </div>
                {!isMember && (
                    <button className="sporty-btn" onClick={() => setIsModalOpen(true)}>
                        <span>+ Create Game</span>
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <svg className="search-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search games by location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="sport-filters">
                    {SPORTS.map((sport) => (
                        <button
                            key={sport}
                            className={`sport-chip ${sportFilter === sport ? "active" : ""}`}
                            onClick={() => setSportFilter(sport)}
                        >
                            {sport.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--brand-secondary)", fontWeight: "600" }}>
                    Loading Games...
                </div>
            ) : activities.length > 0 ? (
                <div className="games-grid">
                    {activities.map((activity) => {
                        const confirmedRSVPs = activity.rsvps.filter(r => r.status === "confirmed");
                        const userRSVP = activity.rsvps.find(r => r.user_id === userId);
                        const isJoined = !!userRSVP;
                        const isFull = confirmedRSVPs.length >= activity.max_players;
                        
                        const fillPercent = Math.min(100, (confirmedRSVPs.length / activity.max_players) * 100);

                        return (
                            <div className="game-card" key={activity.id}>
                                <div className="game-card-header">
                                    <span className="game-sport-badge">{activity.sport}</span>
                                    <span className="game-level-badge">{activity.skill_level}</span>
                                </div>
                                <div className="game-card-body">
                                    <h3>{activity.description || `${activity.sport.toUpperCase()} pickup match`}</h3>
                                    
                                    <div className="game-info-list">
                                        <div className="game-info-item">
                                            <svg className="game-info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>{activity.location}</span>
                                        </div>
                                        <div className="game-info-item">
                                            <svg className="game-info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>{activity.date} @ {activity.time}</span>
                                        </div>
                                    </div>

                                    <div className="game-players-progress">
                                        <div className="progress-header">
                                            <span>Joined Players</span>
                                            <span className="slots-left">
                                                {confirmedRSVPs.length} / {activity.max_players} {isFull ? "(Full)" : ""}
                                            </span>
                                        </div>
                                        <div className="progress-track">
                                            <div 
                                                className={`progress-fill ${isFull ? "full" : ""}`}
                                                style={{ width: `${fillPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="game-card-actions">
                                        <Link href={`/dashboard/activities/${activity.id}`} className="view-btn">
                                            View Game
                                        </Link>
                                        {isJoined ? (
                                            <button className="waitlist-btn" onClick={() => handleCancelRSVP(activity.id)}>
                                                Leave
                                            </button>
                                        ) : isFull ? (
                                            <button className="waitlist-btn" onClick={() => handleJoinGame(activity.id)}>
                                                Join Waitlist
                                            </button>
                                        ) : (
                                            <button className="join-btn" onClick={() => handleJoinGame(activity.id)}>
                                                <span>Join Game</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255, 255, 255, 0.02)", border: "1px dashed rgba(255, 255, 255, 0.08)", borderRadius: "16px" }}>
                    <p style={{ color: "rgba(148, 163, 184, 0.6)", fontSize: "16px", marginBottom: "16px" }}>
                        No games coordinated in this location/sport.
                    </p>
                    {!isMember && (
                        <button className="secondary-sporty-btn" onClick={() => setIsModalOpen(true)}>
                            Create the first Game
                        </button>
                    )}
                </div>
            )}

            {/* Creation Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
                        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", marginBottom: "20px" }}>Create a Game</h2>
                        
                        <form onSubmit={handleFormSubmit}>
                            <div className="form-group" style={{ marginBottom: "18px" }}>
                                <label>Sport Activity</label>
                                <select 
                                    value={formData.sport} 
                                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                                >
                                    <option value="football">Football</option>
                                    <option value="badminton">Badminton</option>
                                    <option value="cricket">Cricket</option>
                                    <option value="tennis">Tennis</option>
                                    <option value="basketball">Basketball</option>
                                    <option value="pickleball">Pickleball</option>
                                </select>
                            </div>

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
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "18px" }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Select Venue</label>
                                        <select 
                                            value={formData.venue_id} 
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
                                            value={formData.slot_id} 
                                            onChange={handleSlotChange}
                                            required={!useCustomLocation}
                                            disabled={!formData.venue_id}
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

                            <div style={{ display: "flex", gap: "16px", marginBottom: "18px" }}>
                                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                    <label>Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        disabled={!useCustomLocation && formData.slot_id}
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                    <label>Time</label>
                                    <input 
                                        type="time" 
                                        required
                                        disabled={!useCustomLocation && formData.slot_id}
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "16px", marginBottom: "18px" }}>
                                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                    <label>Max Players Capacity</label>
                                    <input 
                                        type="number" 
                                        required
                                        min="2"
                                        value={formData.max_players}
                                        onChange={(e) => setFormData({ ...formData, max_players: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                    <label>Skill Level</label>
                                    <select 
                                        value={formData.skill_level} 
                                        onChange={(e) => setFormData({ ...formData, skill_level: e.target.value })}
                                    >
                                        <option value="All">All Skill Levels</option>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: "24px" }}>
                                <label>Description / Match Notes</label>
                                <textarea 
                                    placeholder="Add notes, rules, or items players need to bring..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "14px", justifyContent: "flex-end" }}>
                                <button type="button" className="secondary-sporty-btn" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="sporty-btn">
                                    <span>Launch Game</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
