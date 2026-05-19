"use client";

import { useState, useEffect } from "react";

export default function MemberSection() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : "";

    useEffect(() => {
        const fetchAllMembers = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) {
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`http://127.0.0.1:8001/members?owner_id=${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    if (isMember) {
                        // For a member, only show teammates in their assigned squad group!
                        const currentMember = data.find(m => m.email?.toLowerCase() === userEmail?.toLowerCase());
                        if (currentMember && currentMember.group_id) {
                            const teammates = data.filter(m => m.group_id === currentMember.group_id);
                            setMembers(teammates);
                        } else {
                            // fallback: show other members but exclude admin
                            setMembers(data);
                        }
                    } else {
                        // Add admin explicitly as a member for context
                        const storedName = localStorage.getItem("userName") || "Admin";
                        const adminMember = {
                            id: 'admin',
                            first_name: storedName.split(" ")[0] || storedName,
                            last_name: storedName.split(" ")[1] || "",
                            email: "Admin Email", // Placeholder
                            role: "Club Admin",
                            group_name: "All Groups"
                        };
                        setMembers([adminMember, ...data]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch all members:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllMembers();
    }, [isMember, userEmail]);

    const [openMenuId, setOpenMenuId] = useState(null);
    const [search, setSearch] = useState("");

    const toggleMenu = (id) => {
        if (openMenuId === id) setOpenMenuId(null);
        else setOpenMenuId(id);
    };

    const filteredMembers = members.filter((m) => {
        const q = search.toLowerCase();
        return (
            (m.first_name || "").toLowerCase().includes(q) ||
            (m.last_name || "").toLowerCase().includes(q) ||
            (m.email || "").toLowerCase().includes(q) ||
            (m.phone || "").toLowerCase().includes(q) ||
            (m.group_name || "").toLowerCase().includes(q)
        );
    });

    return (
        <section className="event-section" style={{ borderRadius: 0, border: "none", boxShadow: "none", padding: "32px 48px", minHeight: "calc(100vh - 96px)" }}>
            <div className="event-top">
                <span>{isMember ? "Squad Roster / Teammates" : "Club Members"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f1f5f9", borderRadius: "10px", padding: "8px 14px", border: "1px solid #e2e8f0" }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94a3b8" strokeWidth="2" fill="none">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search roster..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "14px", color: "#0f172a", width: "220px" }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-box" style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>Loading roster list...</div>
            ) : filteredMembers.length > 0 ? (
                <div className="members-table-container" style={{ marginTop: "15px", width: "100%", backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--border)", overflow: "visible" }}>
                    <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                        <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid var(--border)", borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}>
                            <tr>
                                <th style={{ padding: "16px", fontWeight: "600", color: "#475569", fontSize: "14px" }}>First Name</th>
                                <th style={{ padding: "16px", fontWeight: "600", color: "#475569", fontSize: "14px" }}>Last Name</th>
                                <th style={{ padding: "16px", fontWeight: "600", color: "#475569", fontSize: "14px" }}>Email</th>
                                <th style={{ padding: "16px", fontWeight: "600", color: "#475569", fontSize: "14px" }}>Phone Number</th>
                                <th style={{ padding: "16px", fontWeight: "600", color: "#475569", fontSize: "14px" }}>Group</th>
                                {!isMember && <th style={{ padding: "16px", fontWeight: "600", color: "#475569", fontSize: "14px", textAlign: "center" }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMembers.map((member, index) => (
                                <tr key={index} style={{ borderBottom: "1px solid var(--border)", backgroundColor: "white" }}>
                                    <td style={{ padding: "16px", color: "var(--text-primary)", fontSize: "15px", fontWeight: "500" }}>{member.first_name}</td>
                                    <td style={{ padding: "16px", color: "var(--text-primary)", fontSize: "15px" }}>{member.last_name || "-"}</td>
                                    <td style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "15px" }}>{member.email || "-"}</td>
                                    <td style={{ padding: "16px", color: "var(--text-secondary)", fontSize: "15px" }}>{member.phone || "-"}</td>
                                    <td style={{ padding: "16px" }}>
                                        <span style={{ fontSize: "13px", padding: "4px 10px", backgroundColor: member.role === "Club Admin" ? "#eff6ff" : "var(--bg-secondary)", color: member.role === "Club Admin" ? "#3b82f6" : "var(--text-secondary)", borderRadius: "12px", fontWeight: "500" }}>
                                            {member.group_name}
                                        </span>
                                    </td>
                                    {!isMember && (
                                        <td style={{ padding: "16px", textAlign: "center", position: "relative" }}>
                                            {member.role !== "Club Admin" && (
                                                <>
                                                    <button 
                                                        onClick={() => toggleMenu(member.id)}
                                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
                                                    >
                                                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                    </button>
                                                    
                                                    {openMenuId === member.id && (
                                                        <div style={{
                                                            position: "absolute",
                                                            right: "40px",
                                                            top: "20px",
                                                            backgroundColor: "white",
                                                            border: "1px solid #e2e8f0",
                                                            borderRadius: "8px",
                                                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                                            zIndex: 10,
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            minWidth: "140px",
                                                            overflow: "hidden"
                                                        }}>
                                                            <button style={{ padding: "10px 16px", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: "14px", borderBottom: "1px solid #f1f5f9", color: "#334155" }}
                                                                onMouseOver={(e) => e.target.style.backgroundColor = "#f8fafc"}
                                                                onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
                                                            >
                                                                Edit Member
                                                            </button>
                                                            <button style={{ padding: "10px 16px", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: "14px", color: "#ef4444" }}
                                                                onMouseOver={(e) => e.target.style.backgroundColor = "#fef2f2"}
                                                                onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
                                                            >
                                                                Delete Member
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-box">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <h2>No squad members found</h2>
                    <p>{isMember ? "You have not been assigned to a group squad roster yet." : "Import groups with members or add members manually to see them here."}</p>
                </div>
            )}
        </section>
    );
}
