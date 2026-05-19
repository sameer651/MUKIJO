"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "../../app/styles/event-section.css";

export default function EventSection() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllEvents = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) {
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`http://127.0.0.1:8001/events?owner_id=${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setEvents(data);
                }
            } catch (error) {
                console.error("Failed to fetch all events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllEvents();
    }, []);

    return (
        <section className="event-section">
            <div className="event-top">
                <span>Upcoming Events</span>
                <div className="event-controls">
                    <select>
                        <option>Weekly</option>
                        <option>Monthly</option>
                    </select>
                    <Link href="/dashboard/events/new" className="create-event-btn">
                        + Create Event
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="loading-box">Loading events...</div>
            ) : events.length > 0 ? (
                <div className="events-list">
                    {events.map((event, index) => (
                        <div key={index} className="event-item">
                            <div className="event-item-header">
                                <div className="event-item-title">
                                    <h4>{event.name}</h4>
                                    <Link href={`/dashboard/group/${event.group_id}`} style={{ fontSize: "0.8rem", color: "#10b981", textDecoration: "none", fontWeight: "600" }}>
                                        {event.group_name}
                                    </Link>
                                </div>
                                <span className="event-type-badge">{event.type}</span>
                            </div>

                            <div className="event-detail">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                <span>{event.date} at {event.time}</span>
                            </div>
                            {event.location && (
                                <div className="event-detail">
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    <span>{event.location}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-box">
                    <svg viewBox="0 0 24 24" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="9" y1="14" x2="15" y2="18"></line><line x1="15" y1="14" x2="9" y2="18"></line></svg>
                    <h2>No Events scheduled</h2>
                    <p>Schedule matches, training or meetings for your groups.</p>
                    <Link href="/dashboard/events" className="manage-events-link">
                        Manage Events
                    </Link>
                </div>
            )}
        </section>
    );
}
