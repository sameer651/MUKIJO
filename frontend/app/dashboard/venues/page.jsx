"use client";

import { useEffect, useState } from "react";
import "../../styles/venues.css";

const SPORTS = ["all", "football", "badminton", "cricket", "tennis", "pickleball"];

export default function VenuesPage() {
    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [searchQuery, setSearchQuery] = useState("");
    const [sportFilter, setSportFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [bookingStatus, setBookingStatus] = useState(null); // null, 'loading', 'success', 'error'
    const [bookingMessage, setBookingMessage] = useState("");

    const fetchVenues = async () => {
        setLoading(true);
        try {
            let url = "http://127.0.0.1:8001/venues";
            const params = [];
            if (sportFilter !== "all") params.push(`sport=${sportFilter}`);
            if (searchQuery) params.push(`location=${searchQuery}`);
            if (params.length > 0) {
                url += "?" + params.join("&");
            }
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setVenues(data);
            }
        } catch (error) {
            console.error("Error fetching venues:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSlots = async (venueId) => {
        try {
            const response = await fetch(`http://127.0.0.1:8001/venues/${venueId}/slots?date_str=${date}`);
            if (response.ok) {
                const data = await response.json();
                setSlots(data);
            }
        } catch (error) {
            console.error("Error fetching slots:", error);
        }
    };

    useEffect(() => {
        fetchVenues();
    }, [sportFilter, searchQuery]);

    useEffect(() => {
        if (selectedVenue) {
            fetchSlots(selectedVenue.id);
            setSelectedSlot(null);
        }
    }, [selectedVenue, date]);



    const handleConfirmBooking = async () => {
        if (!selectedSlot) return;
        setBookingStatus("loading");
        
        try {
            const userId = localStorage.getItem("userId") || 9;
            const response = await fetch("http://127.0.0.1:8001/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: parseInt(userId),
                    slot_id: selectedSlot.id,
                    amount_paid: selectedSlot.current_price,
                    payment_status: "paid"
                })
            });

            const data = await response.json();
            if (response.ok) {
                setBookingStatus("success");
                setBookingMessage(`Successfully booked slot ID: ${data.slot_id} for ₹${data.amount_paid}!`);
                fetchSlots(selectedVenue.id);
                setSelectedSlot(null);
            } else {
                setBookingStatus("error");
                setBookingMessage(data.detail || "This slot was already booked in a concurrent request.");
            }
        } catch (error) {
            setBookingStatus("error");
            setBookingMessage("Network error occurred during checkout.");
            console.error("Booking error:", error);
        }
    };

    const formatTime = (dateTimeStr) => {
        try {
            const dateObj = new Date(dateTimeStr);
            return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return dateTimeStr;
        }
    };

    return (
        <div className="venues-container">
            {/* Header */}
            <header className="venues-header">
                <div>
                    <h1>Venues & Arenas</h1>
                    <p>Discover hyperlocal turfs, courts, and book your sports slots instantly.</p>
                </div>

            </header>

            {/* Main view switcher */}
            {!selectedVenue ? (
                <>
                    {/* Filters Toolbar */}
                    <div className="venues-toolbar">
                        <div className="search-box">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input 
                                type="text" 
                                placeholder="Search location or arena name..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="sport-filters">
                            {SPORTS.map((sport) => (
                                <button
                                    key={sport}
                                    className={`sport-filter-btn ${sportFilter === sport ? "active" : ""}`}
                                    onClick={() => setSportFilter(sport)}
                                >
                                    {sport}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                            <p>Loading sports venues...</p>
                        </div>
                    )}

                    {/* Grid List */}
                    {!loading && (
                        <div className="venues-grid">
                            {venues.map((venue) => {
                                const sports = venue.sports_supported ? JSON.parse(venue.sports_supported) : [];
                                return (
                                    <div 
                                        key={venue.id} 
                                        className="venue-card"
                                        onClick={() => setSelectedVenue(venue)}
                                    >
                                        <div className="venue-cover">
                                            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                        </div>
                                        <div className="venue-body">
                                            <h3 className="venue-title">{venue.name}</h3>
                                            <div className="venue-location">
                                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                <span>{venue.location}</span>
                                            </div>
                                            <div className="venue-sports">
                                                {sports.map((sport) => (
                                                    <span key={sport} className="sport-tag">{sport}</span>
                                                ))}
                                            </div>
                                            <div className="venue-footer">
                                                <div className="venue-rating">
                                                    ★ <span>{venue.rating.toFixed(1)}</span>
                                                </div>
                                                <span className="book-now-text">Instantly Book →</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {venues.length === 0 && (
                                <div className="empty-slots-box" style={{ gridColumn: "1 / -1", padding: "60px" }}>
                                    <p>No venues found. Please register a venue to check available slots.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                /* Details & Slots View */
                <div className="venue-details-grid">
                    {/* Left Info Bar */}
                    <div className="venue-info-sidebar">
                        <h2>{selectedVenue.name}</h2>
                        <div className="venue-location" style={{ marginBottom: "14px" }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span>{selectedVenue.location}</span>
                        </div>
                        <div className="venue-rating" style={{ marginBottom: "20px" }}>
                            ★ <span>{selectedVenue.rating.toFixed(1)} Rating</span>
                        </div>
                        <p>This arena offers premium quality playing surfaces, changing room facilities, and is highly accessible within local hubs.</p>

                        <div className="amenity-list">
                            <h4 style={{ color: "var(--text-primary)", fontSize: "12px", textTransform: "uppercase", marginBottom: "8px" }}>Amenities</h4>
                            {(selectedVenue.amenities ? JSON.parse(selectedVenue.amenities) : []).map((amenity) => (
                                <div key={amenity} className="amenity-item">
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <span>{amenity}</span>
                                </div>
                            ))}
                        </div>

                        <button 
                            className="sport-filter-btn" 
                            style={{ width: "100%", marginTop: "28px" }}
                            onClick={() => setSelectedVenue(null)}
                        >
                            ← Back to Venues
                        </button>
                    </div>

                    {/* Right Slots Panel */}
                    <div className="slots-panel">
                        <div className="slots-header">
                            <h3>Available Time Slots</h3>
                            <input 
                                type="date" 
                                className="slots-date-picker"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <div className="slots-grid">
                            {slots.map((slot) => {
                                const isSelected = selectedSlot?.id === slot.id;
                                return (
                                    <div 
                                        key={slot.id} 
                                        className={`slot-item ${slot.is_blocked ? "blocked" : ""} ${isSelected ? "selected" : ""}`}
                                        onClick={() => !slot.is_blocked && setSelectedSlot(slot)}
                                    >
                                        <span className="slot-time">{formatTime(slot.start_time)}</span>
                                        <span className="slot-sport">{slot.sport}</span>
                                        <span className="slot-price">{slot.is_blocked ? "Booked" : `₹${slot.current_price}`}</span>
                                    </div>
                                );
                            })}

                            {slots.length === 0 && (
                                <div className="empty-slots-box">
                                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    <p>No available slots found for this date. Check another calendar date.</p>
                                </div>
                            )}
                        </div>

                        {/* Confirmation Box */}
                        <div className="confirm-booking-box">
                            <button
                                className="confirm-booking-btn"
                                disabled={!selectedSlot}
                                onClick={handleConfirmBooking}
                            >
                                Confirm instant booking
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Overlay Modal */}
            {bookingStatus && bookingStatus !== "loading" && (
                <div className="modal-overlay" onClick={() => setBookingStatus(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                        <div className="modal-header">
                            <h2 style={{ color: bookingStatus === "success" ? "var(--brand)" : "var(--rose)" }}>
                                {bookingStatus === "success" ? "Booking Confirmed!" : "Booking Conflict"}
                            </h2>
                            <button className="close-btn" onClick={() => setBookingStatus(null)}>×</button>
                        </div>
                        <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "24px" }}>
                            {bookingMessage}
                        </p>
                        <button 
                            className="confirm-booking-btn" 
                            style={{ width: "100%" }}
                            onClick={() => setBookingStatus(null)}
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
