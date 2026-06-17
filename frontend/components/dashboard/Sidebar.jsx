"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const [groups, setGroups] = useState([]);
    const [clubName, setClubName] = useState("My Club");
    const [isMember, setIsMember] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsMember(localStorage.getItem("isMember") === "true");
        setClubName(localStorage.getItem("clubName") || "My Club");
        const fetchGroups = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) return;

            try {
                const response = await fetch(`http://127.0.0.1:8001/groups?owner_id=${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setGroups(data);
                }
            } catch (error) {
                console.error("Error fetching groups:", error);
            }
        };

        fetchGroups();

        // Listen for groups updates to refresh the list
        window.addEventListener("groupsUpdated", fetchGroups);
        return () => window.removeEventListener("groupsUpdated", fetchGroups);
    }, []);

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="club-badge">{clubName.charAt(0)}</span>
                <span className="club-name-text">{clubName}</span>
            </div>

            <Link href="/dashboard/overview" className={`menu-item ${pathname === '/dashboard/overview' ? 'active' : ''}`}>
                <span className="icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                </span>
                <span>Dashboard</span>
            </Link>

            {!isMember && (
                <Link href="/dashboard" className={`menu-item ${pathname === '/dashboard' ? 'active' : ''}`}>
                    <span className="icon">
                        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    </span>
                    <span>Home</span>
                </Link>
            )}

            <div className="menu-item">
                <span className="icon">
                    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </span>
                <span>Messages</span>
            </div>

            <Link href="/dashboard/members" className={`menu-item ${pathname === '/dashboard/members' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                <span className="icon">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </span>
                <span>Members</span>
            </Link>

            <Link href="/dashboard/courses" className={`menu-item ${pathname.startsWith('/dashboard/courses') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                <span className="icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path></svg>
                </span>
                <span>Courses</span>
            </Link>

            <Link href="/dashboard/fundraising" className={`menu-item ${pathname.startsWith('/dashboard/fundraising') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                <span className="icon" style={{ fontSize: '20px', fontWeight: '700', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ₹
                </span>
                <span>Fundraising</span>
            </Link>

            {!isMember && (
                <Link href="/dashboard/payments" className={`menu-item ${pathname.startsWith('/dashboard/payments') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                    <span className="icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                    </span>
                    <span>Payments</span>
                </Link>
            )}

            <Link href="/dashboard/events" className={`menu-item ${pathname.startsWith('/dashboard/events') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                <span className="icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </span>
                <span>Events</span>
            </Link>

            <Link href="/dashboard/venues" className={`menu-item ${pathname.startsWith('/dashboard/venues') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                <span className="icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                </span>
                <span>Venues</span>
            </Link>

            <Link href="/dashboard/activities" className={`menu-item ${pathname.startsWith('/dashboard/activities') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                <span className="icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z"></path>
                    </svg>
                </span>
                <span>Games Hub</span>
            </Link>

            {!isMember && (
                <Link href="/dashboard/signup-forms" className={`menu-item ${pathname.startsWith('/dashboard/signup-forms') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                    <span className="icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </span>
                    <span>Signup Forms</span>
                </Link>
            )}

            {!isMember && (
                <div className="sidebar-section">
                    <h4>Groups</h4>
                    {groups.length > 0 ? (
                        groups.map((group) => {
                            const isActive = pathname === `/dashboard/group/${group.id}`;
                            return (
                                <Link
                                    key={group.id}
                                    href={`/dashboard/group/${group.id}`}
                                    className={`sidebar-group-link ${isActive ? 'active' : ''}`}
                                    style={{ textDecoration: "none" }}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    {group.group_name}
                                </Link>
                            );
                        })
                    ) : (
                        <p>
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            No groups
                        </p>
                    )}
                </div>
            )}

            <div className="bottom-links">
                {!isMember && (
                    <Link href="/dashboard/settings" className={`bottom-link-item ${pathname === '/dashboard/settings' ? 'active' : ''}`} style={{ textDecoration: "none" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Club Settings
                    </Link>
                )}
                <p className="bottom-link-item">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Help
                </p>
                <p className="bottom-link-item">
                    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    Feedback
                </p>
                <p className="bottom-link-item">
                    <svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    Facebook
                </p>
            </div>
        </aside>
    );
}
