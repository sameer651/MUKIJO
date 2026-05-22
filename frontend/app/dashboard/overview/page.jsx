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
                        <polyline points="9 18 15 12 9 6" />
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

function getEventDateParts(event) {
    const rawDate = event?.start_time || event?.start_date || event?.date;
    const eventDate = rawDate ? new Date(rawDate) : null;

    if (!eventDate || Number.isNaN(eventDate.getTime())) {
        return { month: "TBA", day: "" };
    }

    return {
        month: eventDate.toLocaleDateString("en-US", { month: "short" }),
        day: String(eventDate.getDate()),
    };
}

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

    // Event response status
    const [responses, setResponses] = useState({});

    const [campaigns, setCampaigns] = useState([]);

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
                // Fetch active fundraising campaigns for all roles
                try {
                    const campaignsRes = await fetch(`http://127.0.0.1:8001/fundraising?owner_id=${userId || 1}`);
                    if (campaignsRes.ok) {
                        const camps = await campaignsRes.json();
                        setCampaigns(camps);
                    }
                } catch (e) {
                    console.error("Error fetching campaigns on overview:", e);
                }

                if (!storedIsMember) {
                    // Admin overview
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
                    // Fetch real events and members for member-based schedules
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

    // Handle interactive player response
    const handlePlayerResponse = async (eventId, responseType) => {
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
                setResponses(prev => ({ ...prev, [eventId]: responseType }));
                alert(`Your response status has been successfully set to: ${responseType.toUpperCase()}`);
            } else {
                alert("Failed to submit your response. Check if session limit was reached.");
            }
        } catch (e) {
            console.error("Event response error:", e);
            alert("Connection error while sending your response.");
        }
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
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 13 8.5 8" /><path d="M6 13h3" /><path d="M9 13c6.667 0 6.667-10 0-10" /></svg>
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
                        <p className={styles.pageSubtitle}>A snapshot of {clubName}&apos;s activity and performance</p>
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
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="violet" label="Total Groups"
                        value={adminData?.total_groups ?? 0} sub="Active groups"
                        href="/dashboard"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="indigo" label="Total Courses"
                        value={adminData?.total_courses ?? 0} sub="Active programs"
                        href="/dashboard/courses"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="amber" label="Pending Payments"
                        value={`\u20B9${(adminData?.pending_payments ?? 0).toLocaleString()}`} sub="Awaiting collection"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 13 8.5 8" /><path d="M6 13h3" /><path d="M9 13c6.667 0 6.667-10 0-10" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="emerald" label="Upcoming Events"
                        value={adminData?.upcoming_events_count ?? 0} sub="Scheduled ahead"
                        href="/dashboard"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="rose" label="Fundraising"
                        value={`\u20B9${(adminData?.fundraising_total ?? 0).toLocaleString()}`} sub="Total raised"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
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
                        Manage Player Members
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
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="violet" label="Upcoming Events"
                        value={coachData?.upcoming_events_count ?? 0} sub="Events & practices"
                        href="/dashboard/events"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="emerald" label="Attendance Rating"
                        value={coachData?.attendance_rating ?? "94.2%"} sub="Team presence average"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                    />
                </div>

                {/* Content Panels */}
                <div className={styles.panels}>
                    <div className={styles.panel}>
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
                                const { month, day } = getEventDateParts(ev);

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
                                                <span>Location: {ev.venue || ev.location}</span>
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
                                Dispatch Announcement
                            </button>
                        </form>
                    </div>

                    {renderActiveCampaignsPanel()}
                </div>
            </div>
        );
    };

    const renderActiveCampaignsPanel = () => {
        const activeCamps = campaigns.filter(c => c.status === "active");
        if (activeCamps.length === 0) return null;

        return (
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Active Club Fundraising</h3>
                    <Link href="/dashboard/fundraising" className={styles.panelLink}>Support Us</Link>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
                    {activeCamps.slice(0, 2).map((c) => {
                        const progress = Math.min(100, Math.round(((c.raised || 0) / (c.goal || 1)) * 100));
                        return (
                            <li key={c.id} style={{ padding: "12px", border: "1px solid #f1f5f9", borderRadius: "10px", background: "#f8fafc" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                    <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>{c.title}</div>
                                    <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb" }}>
                                        {progress}%
                                    </span>
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                    {c.description || "Support our club sports campaigns!"}
                                </div>
                                <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden", marginBottom: "10px" }}>
                                    <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #3b82f6, #10b981)", borderRadius: "99px" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>
                                        Rs. {Number(c.raised || 0).toLocaleString()} <span style={{ color: "#94a3b8", fontWeight: "normal" }}>/ Rs. {Number(c.goal || 0).toLocaleString()}</span>
                                    </span>
                                    <Link
                                        href={`/dashboard/fundraising/donate/${c.id}`}
                                        style={{ padding: "4px 10px", background: "#2563eb", color: "white", textDecoration: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}
                                    >
                                        Donate
                                    </Link>
                                </div>
                            </li>
                        );
                    })}
                </ul>
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
                        {"\u20B9"} Support Club Dues
                    </Link>
                </div>

                {/* Page heading */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Athlete Space</h1>
                        <p className={styles.pageSubtitle}>Welcome back, {userName}! Let&apos;s push our athletic goals today.</p>
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
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="emerald" label="My Presence Rate"
                        value="96.8%" sub="Perfect attendance score"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="amber" label="Registered Classes"
                        value="2 Batches" sub="Elite Skill Development"
                        href="/dashboard/courses"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /></svg>}
                    />
                </div>

                {/* Content Panels */}
                <div className={styles.panels}>
                    <div className={styles.panel} style={{ gridColumn: "span 2" }}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Respond to Invited Matches & Practices</h3>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>Respond here to secure your team day spot</span>
                        </div>
                        <ul className={styles.eventList} style={{ gap: "20px" }}>
                            {(realEvents.length > 0 ? realEvents.slice(0, 2) : [
                                { id: 1, name: "Weekend Cup - Semifinals vs Warriors", venue: "East Arena Pitch 2", start_time: "2026-05-23T09:00", category: "Match" },
                                { id: 2, name: "Intense Drills with Coach", venue: "Indoor Courts", start_time: "2026-05-25T18:00", category: "Training" }
                            ]).map((ev) => {
                                const { month, day } = getEventDateParts(ev);
                                const hasResponded = responses[ev.id];

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
                                                <span>Location: {ev.venue || ev.location}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            {hasResponded ? (
                                                <span style={{ fontSize: "11px", fontWeight: "bold", background: hasResponded === "accepted" ? "#d1fae5" : hasResponded === "declined" ? "#fee2e2" : "#fef3c7", color: hasResponded === "accepted" ? "#065f46" : hasResponded === "declined" ? "#991b1b" : "#92400e", padding: "6px 12px", borderRadius: "12px" }}>
                                                    Response: {hasResponded.toUpperCase()}
                                                </span>
                                            ) : (
                                                <>
                                                    <button onClick={() => handlePlayerResponse(ev.id, "accepted")} style={{ padding: "6px 10px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Accept</button>
                                                    <button onClick={() => handlePlayerResponse(ev.id, "maybe")} style={{ padding: "6px 10px", background: "#f59e0b", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Maybe</button>
                                                    <button onClick={() => handlePlayerResponse(ev.id, "declined")} style={{ padding: "6px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Decline</button>
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

                    {renderActiveCampaignsPanel()}
                </div>
            </div>
        );
    };

    // Render 4: Parent Dashboard
    const renderParentDashboard = () => {
        return (
            <div className={styles.page}>
                {/* Quick Actions */}
                <div className={styles.actionBar}>
                    <Link href="/dashboard/members" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        Members
                    </Link>
                    <Link href="/dashboard/events" className={styles.actionButton}>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none">
                            <rect x="3" y="5" width="18" height="16" rx="2" ry="2"></rect>
                            <line x1="16" y1="3" x2="16" y2="7"></line>
                            <line x1="8" y1="3" x2="8" y2="7"></line>
                            <line x1="3" y1="11" x2="21" y2="11"></line>
                            <circle cx="8" cy="15" r="1"></circle>
                            <circle cx="12" cy="15" r="1"></circle>
                            <circle cx="16" cy="15" r="1"></circle>
                        </svg>
                        Events
                    </Link>
                    <Link href="/dashboard/fundraising" className={styles.actionButton}>
                        <span className={styles.actionSymbol}>{"\u20B9"}</span>
                        Donate
                    </Link>
                </div>

                {/* Page heading */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Guardian Portal</h1>
                        <p className={styles.pageSubtitle}>Welcome back, parent {userName}! Manage emergency details, kids&apos; events, and fees.</p>
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
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="violet" label="Upcoming Events"
                        value={realEvents.length || 4} sub="Events scheduled"
                        href="/dashboard/events"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="amber" label="Outstanding Dues"
                        value="Rs. 1,500" sub="Awaiting card payment"
                        icon={<span className={styles.rupeeIcon}>{"\u20B9"}</span>}
                    />
                </div>

                {/* Content Panels */}
                <div className={styles.panels}>



                    {renderActiveCampaignsPanel()}
                </div>
            </div>
        );
    };

    // Render 5: Referee Dashboard
    const renderRefereeDashboard = () => {
        const officialButtonStyle = {
            background: "#2563eb",
            border: "none",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
            width: "250px",
            padding: "11px 18px",
        };
        const fundraisingTotal = campaigns.reduce((sum, campaign) => sum + Number(campaign.raised || 0), 0);

        return (
            <div className={styles.page}>
                {/* Quick Actions */}
                <div className={styles.actionBar}>
                    <Link href="/dashboard/events" className={styles.actionButton} style={officialButtonStyle}>
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="17" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                            <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
                            <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
                            <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
                        </svg>
                        Events
                    </Link>
                    <Link href="/dashboard/courses" className={styles.actionButton} style={officialButtonStyle}>
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
                            <path d="M8 6h8" />
                            <path d="M8 10h7" />
                        </svg>
                        Courses
                    </Link>
                    <button onClick={() => alert("Availability marked: 100% active!")} className={styles.actionButton} style={officialButtonStyle}>
                        Toggle Availability (Active)
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
                        loading={loading} color="indigo" label="Events"
                        value={realEvents.length || 0} sub="Officiating this week"
                        href="/dashboard/events"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="emerald" label="Members"
                        value={realMembers.length || 0} sub="Current members"
                        href="/dashboard/members"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></svg>}
                    />
                    <StatCard
                        loading={loading} color="rose" label="Fundraising"
                        value={`\u20B9${fundraisingTotal.toLocaleString("en-IN")}`} sub="Total raised"
                        href="/dashboard/fundraising"
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
                    />
                </div>

                {/* Content Panels */}
                <div className={styles.panels}>
                    {renderActiveCampaignsPanel()}
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
