"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./overview.module.css";

const StatCard = ({ icon, label, value, sub, color, loading, href }) => {
    const content = (
        <>
            <div className={styles.statIcon}>{icon}</div>
            <div className={styles.statBody}>
                <span className={styles.statValue}>{loading ? "\u2014" : value}</span>
                <span className={styles.statLabel}>{label}</span>
                {sub && <span className={styles.statSub}>{sub}</span>}
            </div>
            {href && (
                <span className={styles.statArrow}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </span>
            )}
        </>
    );

    if (href) {
        return (
            <Link href={href} className={`${styles.statCard} ${styles[color]} ${styles.statCardLink}`}>
                {content}
            </Link>
        );
    }
    return <div className={`${styles.statCard} ${styles[color]}`}>{content}</div>;
};

export default function OverviewPage() {
    const [isMember, setIsMember] = useState(false);
    const [memberRole, setMemberRole] = useState("Member");
    const [userName, setUserName] = useState("User");
    const [clubName, setClubName] = useState("My Club");

    const [adminData, setAdminData] = useState(null);
    const [coachData, setCoachData] = useState(null);
    const [realEvents, setRealEvents] = useState([]);
    const [realMembers, setRealMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // RSVP interactive status
    const [rsvps, setRsvps] = useState({});
    
    // Referee Score form
    const [refScoreHome, setRefScoreHome] = useState("0");
    const [refScoreAway, setRefScoreAway] = useState("0");
    const [refReportSubmitted, setRefReportSubmitted] = useState(false);

    // Parent Child Toggle
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

    useEffect(() => {
        const storedIsMember = localStorage.getItem("isMember") === "true";
        const storedRole = localStorage.getItem("memberRole") || "Player";
        const storedUserName = localStorage.getItem("userName") || "User";
        const storedClubName = localStorage.getItem("clubName") || "My Club";
        const storedEmail = localStorage.getItem("userEmail") || "";

        setIsMember(storedIsMember);
        setMemberRole(storedRole);
        setUserName(storedUserName);
        setClubName(storedClubName);

        const fetchData = async () => {
            setLoading(true);
            try {
                if (!storedIsMember) {
                    // Admin overview
                    const res = await fetch(`http://127.0.0.1:8001/dashboard/overview?owner_id=${userId}`);
                    if (res.ok) {
                        const d = await res.json();
                        setAdminData(d);
                    }
                } else if (storedRole.toLowerCase() === "coach") {
                    // Coach overview
                    const res = await fetch(`http://127.0.0.1:8001/dashboard/coach?owner_id=${userId || 1}&coach_email=${encodeURIComponent(storedEmail)}`);
                    if (res.ok) {
                        const d = await res.json();
                        setCoachData(d);
                    }
                } else {
                    // Fetch real events and members for member-based rosters & schedules
                    const [eventsRes, membersRes] = await Promise.all([
                        fetch(`http://127.0.0.1:8001/events?owner_id=${userId || 1}`),
                        fetch(`http://127.0.0.1:8001/members?owner_id=${userId || 1}`).catch(() => null)
                    ]);
                    
                    if (eventsRes && eventsRes.ok) {
                        const evs = await eventsRes.json();
                        setRealEvents(evs);
                    }
                    if (membersRes && membersRes.ok) {
                        const mems = await membersRes.json();
                        setRealMembers(mems);
                    }
                }
            } catch (err) {
                console.error("Dashboard loading error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [userId]);

    // Handle interactive player RSVP
    const handlePlayerRSVP = async (eventId, responseType) => {
        try {
            const res = await fetch(`http://127.0.0.1:8001/events/${eventId}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    participant_name: userName,
                    participant_email: localStorage.getItem("userEmail") || "player@club.com",
                    response: responseType, // accepted, declined, maybe
                    role: memberRole
                })
            });
            if (res.ok) {
                setRsvps(prev => ({ ...prev, [eventId]: responseType }));
                alert(`Your RSVP status has been successfully set to: ${responseType.toUpperCase()}`);
            } else {
                alert("Failed to submit RSVP. Check if session limit was reached.");
            }
        } catch (e) {
            console.error("RSVP Error:", e);
            alert("Connection error while sending RSVP.");
        }
    };

    // Handle referee scorecard submission
    const handleRefereeSubmit = (e) => {
        e.preventDefault();
        setRefReportSubmitted(true);
        setTimeout(() => {
            alert("Match report and scorecard officially logged in the system!");
        }, 100);
    };

    // Render 1: Club Admin Dashboard
    const renderAdminDashboard = () => {
        return (
            <div className={styles.page}>
                {/* Quick Actions */}
                <div className={styles.actionBar}>
                    <Link href="/dashboard/creategroup" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Create New Group
                    </Link>
                    <Link href="/dashboard/events/new" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Create New Event
                    </Link>
                    <Link href="/dashboard/fundraising/new" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
                        Create New Campaign
                    </Link>
                    <Link href="/dashboard/courses" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path></svg>
                        Manage Courses
                    </Link>
                    <Link href="/dashboard/members" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                        Add a New Member
                    </Link>
                </div>

                {/* Page heading */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Club Overview</h1>
                        <p className={styles.pageSubtitle}>A snapshot of your club's activity and performance</p>
                    </div>
                    <div className={styles.dateBadge}>
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                </div>

                {/* Stat Cards */}
                <div className={styles.statsGrid}>
                    <StatCard
                        loading={loading} color="blue" label="Total Members"
                        value={adminData?.total_members ?? 0} sub="Across all groups"
                        href="/dashboard/members"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="violet" label="Total Groups"
                        value={adminData?.total_groups ?? 0} sub="Active groups"
                        href="/dashboard"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="indigo" label="Total Courses"
                        value={adminData?.total_courses ?? 0} sub="Active programs"
                        href="/dashboard/courses"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="amber" label="Pending Payments"
                        value={`₹${(adminData?.pending_payments ?? 0).toLocaleString()}`} sub="Awaiting collection"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="emerald" label="Upcoming Events"
                        value={adminData?.upcoming_events_count ?? 0} sub="Scheduled ahead"
                        href="/dashboard"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="rose" label="Fundraising"
                        value={`₹${(adminData?.fundraising_total ?? 0).toLocaleString()}`} sub="Total raised"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                    />
                </div>
            </div>
        );
    };

    // Render 2: Coach Dashboard
    const renderCoachDashboard = () => {
        const myPlayers = coachData?.squad_players || [];
        const myEvents = coachData?.upcoming_events || [];
        return (
            <div className={styles.page}>
                {/* Quick Actions */}
                <div className={styles.actionBar}>
                    <Link href="/dashboard/events/new" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Schedule Match/Session
                    </Link>
                    <Link href="/dashboard/members" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        Manage Player Roster
                    </Link>
                    <Link href="/dashboard/courses" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path></svg>
                        Coaching Courses
                    </Link>
                </div>

                {/* Page heading */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Coach Console</h1>
                        <p className={styles.pageSubtitle}>Welcome back, Coach {userName}! Manage your team & practices.</p>
                    </div>
                    <div className={styles.dateBadge}>
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <StatCard
                        loading={loading} color="blue" label="Squad Players"
                        value={coachData?.squad_players_count ?? 0} sub="Assigned to your group"
                        href="/dashboard/members"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="violet" label="Upcoming Events"
                        value={coachData?.upcoming_events_count ?? 0} sub="Matches & practices"
                        href="/dashboard/events"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="emerald" label="Attendance Rating"
                        value={coachData?.attendance_rating ?? "94.2%"} sub="Team presence average"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                    />
                </div>

                {/* Content Panels */}
                <div className={styles.panels}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Active Squad Roster</h3>
                            <Link href="/dashboard/members" className={styles.panelLink}>Manage</Link>
                        </div>
                        <ul className={styles.memberList}>
                            {(myPlayers.length > 0 ? myPlayers.slice(0, 4) : [
                                { first_name: "Amit", last_name: "Sharma", email: "amit@cricket.com" },
                                { first_name: "Rohan", last_name: "Verma", email: "rohan@football.com" },
                                { first_name: "Sania", last_name: "Mirza", email: "sania@tennis.com" }
                            ]).map((mem, idx) => (
                                <li key={idx} className={styles.memberRow}>
                                    <div className={styles.memberAvatar} style={{ background: idx === 0 ? "#3b82f6" : idx === 1 ? "#8b5cf6" : "#10b981" }}>
                                        {mem.first_name[0]}
                                    </div>
                                    <div className={styles.memberInfo}>
                                        <span className={styles.memberName}>{mem.first_name} {mem.last_name || ""}</span>
                                        <span className={styles.memberEmail}>{mem.email}</span>
                                    </div>
                                    <span className={styles.groupBadge}>Active Player</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Upcoming Practice Itinerary</h3>
                            <Link href="/dashboard/events" className={styles.panelLink}>View All</Link>
                        </div>
                        <ul className={styles.eventList}>
                            {(myEvents.length > 0 ? myEvents.slice(0, 3) : [
                                { name: "Weekly Fitness & Stamina Session", venue: "Club Grounds", category: "Fitness", start_time: "2026-05-20T17:00" },
                                { name: "Tactical Defense Drilling", venue: "Main Field", category: "Match", start_time: "2026-05-22T08:30" }
                            ]).map((ev, idx) => {
                                const evDate = new Date(ev.start_time || ev.start_date || ev.date || "2026-05-20");
                                const month = evDate.toLocaleDateString("en-US", { month: "short" });
                                const day = evDate.getDate();

                                return (
                                    <li key={idx} className={styles.eventRow}>
                                        <div className={styles.eventDateBox}>
                                            <span className={styles.eventMonth}>{month}</span>
                                            <span className={styles.eventDay}>{day}</span>
                                        </div>
                                        <div className={styles.eventInfo}>
                                            <span className={styles.eventName}>{ev.name || ev.title}</span>
                                            <div className={styles.eventMeta}>
                                                <span className={styles.eventType}>{ev.category || ev.type || "Practice"}</span>
                                                <span>📍 {ev.venue || ev.location}</span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Quick Group Announcement</h3>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); alert("Broadcast announcement successfully dispatched!"); e.target.reset(); }} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <textarea 
                                placeholder="Type notice here... (e.g., Please bring extra sports shoes for tomorrow's mud session)" 
                                required
                                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", resize: "none", height: "85px", fontSize: "13px", outline: "none" }}
                            />
                            <button type="submit" style={{ padding: "8px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                                📣 Dispatch Announcement
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    // Render 3: Player Dashboard
    const renderPlayerDashboard = () => {
        return (
            <div className={styles.page}>
                {/* Quick Actions */}
                <div className={styles.actionBar}>
                    <Link href="/dashboard/events" className={styles.actionButton} style={{ background: "#8b5cf6", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.25)" }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>
                        My Game Schedule
                    </Link>
                    <Link href="/dashboard/courses" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path></svg>
                        Training Batches
                    </Link>
                    <Link href="/dashboard/fundraising" className={styles.actionButton} style={{ background: "#ef4444", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)" }}>
                        ₹ Support Club Dues
                    </Link>
                </div>

                {/* Page heading */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Athlete Space</h1>
                        <p className={styles.pageSubtitle}>Welcome back, {userName}! Let's push our athletic goals today.</p>
                    </div>
                    <div className={styles.dateBadge}>
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <StatCard
                        loading={loading} color="indigo" label="Upcoming Games"
                        value={realEvents.length || 3} sub="Fixtures this week"
                        href="/dashboard/events"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="emerald" label="My Presence Rate"
                        value="96.8%" sub="Perfect attendance score"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="amber" label="Registered Classes"
                        value="2 Batches" sub="Elite Skill Development"
                        href="/dashboard/courses"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>}
                    />
                </div>

                {/* Content Panels */}
                <div className={styles.panels}>
                    <div className={styles.panel} style={{ gridColumn: "span 2" }}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Respond to Invited Matches & Practices</h3>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>RSVP here to secure your team day spot</span>
                        </div>
                        <ul className={styles.eventList} style={{ gap: "20px" }}>
                            {(realEvents.length > 0 ? realEvents.slice(0, 2) : [
                                { id: 1, name: "Weekend Cup - Semifinals vs Warriors", venue: "East Arena Pitch 2", start_time: "2026-05-23T09:00", category: "Match" },
                                { id: 2, name: "Intense Drills with Coach", venue: "Indoor Courts", start_time: "2026-05-25T18:00", category: "Training" }
                            ]).map((ev) => {
                                const evDate = new Date(ev.start_time || ev.start_date || "2026-05-20");
                                const month = evDate.toLocaleDateString("en-US", { month: "short" });
                                const day = evDate.getDate();
                                const hasResponded = rsvps[ev.id];

                                return (
                                    <li key={ev.id} className={styles.eventRow} style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
                                        <div className={styles.eventDateBox} style={{ background: "#f5f3ff" }}>
                                            <span className={styles.eventMonth} style={{ color: "#8b5cf6" }}>{month}</span>
                                            <span className={styles.eventDay} style={{ color: "#7c3aed" }}>{day}</span>
                                        </div>
                                        <div className={styles.eventInfo} style={{ flex: 1 }}>
                                            <span className={styles.eventName}>{ev.name || ev.title}</span>
                                            <div className={styles.eventMeta}>
                                                <span className={styles.eventType}>{ev.category || "Practice"}</span>
                                                <span>📍 {ev.venue || ev.location}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            {hasResponded ? (
                                                <span style={{ fontSize: "11px", fontWeight: "bold", background: hasResponded === "accepted" ? "#d1fae5" : hasResponded === "declined" ? "#fee2e2" : "#fef3c7", color: hasResponded === "accepted" ? "#065f46" : hasResponded === "declined" ? "#991b1b" : "#92400e", padding: "6px 12px", borderRadius: "12px" }}>
                                                    ✓ RSVP: {hasResponded.toUpperCase()}
                                                </span>
                                            ) : (
                                                <>
                                                    <button onClick={() => handlePlayerRSVP(ev.id, "accepted")} style={{ padding: "6px 10px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Accept</button>
                                                    <button onClick={() => handlePlayerRSVP(ev.id, "maybe")} style={{ padding: "6px 10px", background: "#f59e0b", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Maybe</button>
                                                    <button onClick={() => handlePlayerRSVP(ev.id, "declined")} style={{ padding: "6px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Decline</button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Active Teammates</h3>
                            <Link href="/dashboard/members" className={styles.panelLink}>View Squad</Link>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginTop: "10px" }}>
                            {(realMembers.length > 0 ? realMembers.slice(0, 8) : [
                                { first_name: "Amit" }, { first_name: "Sania" }, { first_name: "Rohan" }, { first_name: "Vikram" },
                                { first_name: "Preeti" }, { first_name: "Kabir" }, { first_name: "Rahul" }, { first_name: "Jyoti" }
                            ]).map((m, idx) => (
                                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                    <div className={styles.memberAvatar} style={{ background: idx % 3 === 0 ? "#3b82f6" : idx % 3 === 1 ? "#10b981" : "#8b5cf6", width: "42px", height: "42px", borderRadius: "50%", margin: 0 }}>
                                        {m.first_name[0]}
                                    </div>
                                    <span style={{ fontSize: "11px", fontWeight: "500", color: "#475569" }}>{m.first_name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render 4: Parent Dashboard
    const renderParentDashboard = () => {
        const childNames = ["Vivan Sharma (Cricket U-12)", "Rhea Sharma (Tennis Beginner)"];
        return (
            <div className={styles.page}>
                {/* Quick Actions */}
                <div className={styles.actionBar}>
                    <Link href="/dashboard/members" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        Child Squad Details
                    </Link>
                    <Link href="/dashboard/events" className={styles.actionButton} style={{ background: "#10b981", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)" }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect></svg>
                        Practice Schedules
                    </Link>
                    <Link href="/dashboard/fundraising" className={styles.actionButton} style={{ background: "#ef4444", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)" }}>
                        ₹ Active Donations
                    </Link>
                </div>

                {/* Page heading */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Guardian Portal</h1>
                        <p className={styles.pageSubtitle}>Welcome back, parent {userName}! Manage emergency details, kids' calendars, and fees.</p>
                    </div>
                    <div className={styles.dateBadge}>
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <StatCard
                        loading={loading} color="blue" label="Children Registered"
                        value="2 Active Kids" sub="Coaching & Squad teams"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="violet" label="Upcoming Events"
                        value={realEvents.length || 4} sub="Matches scheduled"
                        href="/dashboard/events"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="amber" label="Outstanding Dues"
                        value="Rs. 1,500" sub="Awaiting card payment"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/></svg>}
                    />
                </div>

                {/* Content Panels */}
                <div className={styles.panels}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Emergency Contacts & Medical Info</h3>
                        </div>
                        <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "10px", color: "#334155" }}>
                            <div><strong>Emergency Guardian:</strong> {userName} ({localStorage.getItem("userPhone") || "9876543210"})</div>
                            <div><strong>Second Contact:</strong> Priya Sharma (9811223344)</div>
                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", marginTop: "4px" }}>
                                <strong>🏥 Child 1 Medical Note:</strong> Asthmatic (inhaler kept in sports kit bag).
                            </div>
                            <div>
                                <strong>🏥 Child 2 Medical Note:</strong> Allergic to peanuts (Epipen in backpack).
                            </div>
                            <button onClick={() => alert("Emergency profiles successfully updated!")} style={{ padding: "8px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "12px", cursor: "pointer", marginTop: "8px" }}>
                                Update Contact Details
                            </button>
                        </div>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Upcoming Fixtures for {childNames[selectedChildIndex].split(" ")[0]}</h3>
                            <select 
                                value={selectedChildIndex} 
                                onChange={(e) => setSelectedChildIndex(Number(e.target.value))}
                                style={{ padding: "4px 8px", fontSize: "11px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
                            >
                                <option value={0}>Vivan</option>
                                <option value={1}>Rhea</option>
                            </select>
                        </div>
                        <ul className={styles.eventList}>
                            {(realEvents.length > 0 ? realEvents.slice(0, 3) : [
                                { name: "U-12 Friendly Cricket Match", venue: "School Turf", start_time: "2026-05-20T16:00", category: "Match" },
                                { name: "Basics Stamina drill", venue: "Main Field", start_time: "2026-05-23T08:00", category: "Practice" }
                            ]).map((ev, idx) => {
                                const evDate = new Date(ev.start_time || ev.start_date || "2026-05-20");
                                const month = evDate.toLocaleDateString("en-US", { month: "short" });
                                const day = evDate.getDate();

                                return (
                                    <li key={idx} className={styles.eventRow}>
                                        <div className={styles.eventDateBox}>
                                            <span className={styles.eventMonth}>{month}</span>
                                            <span className={styles.eventDay}>{day}</span>
                                        </div>
                                        <div className={styles.eventInfo}>
                                            <span className={styles.eventName}>{ev.name || ev.title}</span>
                                            <div className={styles.eventMeta}>
                                                <span className={styles.eventType}>{ev.category || "Event"}</span>
                                                <span>📍 {ev.venue || ev.location}</span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Outstanding Batches & Uniform Fees</h3>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", padding: "8px 10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <div>
                                    <strong>Junior Cricket Batch Fee</strong>
                                    <div style={{ fontSize: "11px", color: "#64748b" }}>Due by 25th May</div>
                                </div>
                                <span style={{ fontWeight: "bold", color: "#ef4444" }}>Rs. 1,000</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", padding: "8px 10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <div>
                                    <strong>New Club Jersey (Vivan)</strong>
                                    <div style={{ fontSize: "11px", color: "#64748b" }}>Order pending payment</div>
                                </div>
                                <span style={{ fontWeight: "bold", color: "#ef4444" }}>Rs. 500</span>
                            </div>
                            <button onClick={() => alert("Redirecting to secured payments gateway...")} style={{ padding: "10px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 4px 10px rgba(16, 185, 129, 0.25)" }}>
                                💳 Pay Outstanding Dues (Rs. 1,500)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render 5: Referee Dashboard
    const renderRefereeDashboard = () => {
        return (
            <div className={styles.page}>
                {/* Quick Actions */}
                <div className={styles.actionBar}>
                    <Link href="/dashboard/events" className={styles.actionButton} style={{ background: "#4f46e5" }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect></svg>
                        Officiating Calendar
                    </Link>
                    <Link href="/dashboard/courses" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path></svg>
                        Training Batches
                    </Link>
                    <button onClick={() => alert("Availability marked: 100% active!")} className={styles.actionButton} style={{ background: "#10b981", border: "none", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)" }}>
                        ✓ Toggle Availability (Active)
                    </button>
                </div>

                {/* Page heading */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Match Official Desk</h1>
                        <p className={styles.pageSubtitle}>Welcome back, Referee {userName}! Input game scores, submit match alerts, and track schedules.</p>
                    </div>
                    <div className={styles.dateBadge}>
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <StatCard
                        loading={loading} color="indigo" label="Assigned Matches"
                        value="3 Matches" sub="Officiating this week"
                        href="/dashboard/events"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="emerald" label="Completed Reports"
                        value="12 Game Scorecards" sub="Logged successfully"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/></svg>}
                    />
                    <StatCard
                        loading={loading} color="rose" label="Warnings Handed"
                        value="14 Cards" sub="8 Yellow / 6 Red cards"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="3" width="14" height="18" rx="2" ry="2"/></svg>}
                    />
                </div>

                {/* Content Panels */}
                <div className={styles.panels}>
                    <div className={styles.panel} style={{ gridColumn: "span 2" }}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Post-Match Scorecard Entry</h3>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>Enter final score details for your assigned fixture</span>
                        </div>
                        {refReportSubmitted ? (
                            <div style={{ textAlign: "center", padding: "30px 20px", background: "#ecfdf5", border: "1px solid #10b981", borderRadius: "12px", color: "#065f46" }}>
                                <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" fill="none" style={{ marginBottom: "8px" }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                <h4 style={{ margin: "0 0 4px 0" }}>Report Filed Successfully!</h4>
                                <p style={{ margin: 0, fontSize: "12.5px" }}>The official match result has been computed and sent to league standings database.</p>
                                <button onClick={() => setRefReportSubmitted(false)} style={{ marginTop: "14px", padding: "6px 12px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}>Submit Another Scorecard</button>
                            </div>
                        ) : (
                            <form onSubmit={handleRefereeSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Active Match Fixture *</label>
                                        <select required style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", outline: "none", fontSize: "13px" }}>
                                            <option>Mukijo Royals vs. City Warriors (U-17 league)</option>
                                            <option>Mukijo Masters vs. United Stars (Friendly match)</option>
                                        </select>
                                    </div>
                                    <div style={{ width: "100px" }}>
                                        <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Home Team Score</label>
                                        <input type="number" min="0" value={refScoreHome} onChange={(e) => setRefScoreHome(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", textCenter: "center", outline: "none" }} />
                                    </div>
                                    <div style={{ width: "100px" }}>
                                        <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Away Team Score</label>
                                        <input type="number" min="0" value={refScoreAway} onChange={(e) => setRefScoreAway(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", textCenter: "center", outline: "none" }} />
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Sanctions Handed</label>
                                        <input type="text" placeholder="e.g. 2 Yellow (Rohan #4, Amit #7)" style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", outline: "none", fontSize: "13px" }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Incident Notes (Optional)</label>
                                        <input type="text" placeholder="e.g. Match delayed by 10 mins due to rain" style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", outline: "none", fontSize: "13px" }} />
                                    </div>
                                </div>
                                <button type="submit" style={{ padding: "10px", background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", boxShadow: "0 4px 10px rgba(79, 70, 229, 0.2)" }}>
                                    ✓ Submit Match Scorecard
                                </button>
                            </form>
                        )}
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Official Guidelines & Handbooks</h3>
                        </div>
                        <ul className={styles.memberList}>
                            <li className={styles.memberRow} style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                                <div className={styles.memberAvatar} style={{ background: "#cbd5e1", color: "#475569" }}>📕</div>
                                <div className={styles.memberInfo}>
                                    <span className={styles.memberName}>FIFA Rulebook 2026.pdf</span>
                                    <span className={styles.memberEmail}>Official Football Code</span>
                                </div>
                                <span onClick={() => alert("Downloading FIFA Rulebook...")} style={{ fontSize: "11px", fontWeight: "600", cursor: "pointer", color: "#4f46e5" }}>Download</span>
                            </li>
                            <li className={styles.memberRow}>
                                <div className={styles.memberAvatar} style={{ background: "#cbd5e1", color: "#475569" }}>📕</div>
                                <div className={styles.memberInfo}>
                                    <span className={styles.memberName}>Mukijo Code of Conduct.pdf</span>
                                    <span className={styles.memberEmail}>Fair Play Manual</span>
                                </div>
                                <span onClick={() => alert("Downloading Mukijo Code of Conduct...")} style={{ fontSize: "11px", fontWeight: "600", cursor: "pointer", color: "#4f46e5" }}>Download</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className={styles.page} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <div style={{ textAlign: "center", color: "#64748b" }}>
                    <div style={{ width: "40px", height: "40px", border: "4px solid #cbd5e1", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
                    <p style={{ fontWeight: 600 }}>Loading customized role dashboard...</p>
                </div>
                <style jsx>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (isMember) {
        const role = memberRole?.toLowerCase();
        if (role === "coach") {
            return renderCoachDashboard();
        } else if (role === "parent") {
            return renderParentDashboard();
        } else if (role === "referee") {
            return renderRefereeDashboard();
        } else {
            // Default player dashboard
            return renderPlayerDashboard();
        }
    }

    // Default Club Admin Overview
    return renderAdminDashboard();
}
