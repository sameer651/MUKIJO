"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "../../../styles/groupprofile.css";

export default function GroupProfilePage() {
    const { id } = useParams();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("Overview");
    const [groupFundraising, setGroupFundraising] = useState(0);

    // Members state
    const [members, setMembers] = useState([]);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [memberForm, setMemberForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "Player"
    });

    const handleAddMember = async (e) => {
        e.preventDefault();
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        try {
            const encodedId = encodeURIComponent(id);
            const response = await fetch(`http://127.0.0.1:8001/groups/${encodedId}/members?owner_id=${userId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    first_name: memberForm.first_name,
                    last_name: memberForm.last_name || "",
                    email: memberForm.email || "",
                    phone: memberForm.phone || "",
                    role: memberForm.role || "Player"
                })
            });

            if (response.ok) {
                const newMember = await response.json();
                setMembers(prev => [...prev, newMember]);
                setShowAddMemberModal(false);
                // Reset form
                setMemberForm({
                    first_name: "",
                    last_name: "",
                    email: "",
                    phone: "",
                    role: "Player"
                });
                alert("Member added successfully!");
            } else {
                const errData = await response.json();
                alert(`Failed to add member: ${errData.detail || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error adding member:", error);
            alert("Connection error while adding member.");
        }
    };

    // Import members state
    const [showImportModal, setShowImportModal] = useState(false);

    // Event state
    const [events, setEvents] = useState([]);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        const fetchGroupData = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId || userId === "undefined") {
                setError("Please sign in again to view this group profile.");
                setLoading(false);
                return;
            }

            try {
                const encodedId = encodeURIComponent(id);
                // Try fetching group details
                const groupResponse = await fetch(`http://127.0.0.1:8001/groups/${encodedId}?owner_id=${userId}`);
                
                let groupData = null;
                if (groupResponse.ok) {
                    groupData = await groupResponse.json();
                    setGroup(groupData);
                } else {
                    setError("This group could not be found for the signed-in club.");
                    setLoading(false);
                    return;
                }

                // Fetch group members
                const membersResponse = await fetch(`http://127.0.0.1:8001/groups/${encodedId}/members?owner_id=${userId}`);
                if (membersResponse.ok) {
                    const membersData = await membersResponse.json();
                    const storedName = localStorage.getItem("userName") || "Admin";
                    setMembers([{
                        first_name: storedName.split(" ")[0] || storedName,
                        last_name: storedName.split(" ")[1] || "",
                        role: "Admin"
                    }, ...membersData]);
                }

                // Fetch group events
                const eventsResponse = await fetch(`http://127.0.0.1:8001/groups/${encodedId}/events?owner_id=${userId}`);
                if (eventsResponse.ok) {
                    const eventsData = await eventsResponse.json();
                    setEvents(eventsData);
                }

                const paymentsResponse = await fetch(`http://127.0.0.1:8001/payments?owner_id=${userId}&group_id=${groupData.id}`);
                if (paymentsResponse.ok) {
                    const paymentsData = await paymentsResponse.json();
                    setPayments(paymentsData);
                }

                // Fetch group fundraising
                const fundraisingResponse = await fetch(`http://127.0.0.1:8001/fundraising?owner_id=${userId}`);
                if (fundraisingResponse.ok) {
                    const frData = await fundraisingResponse.json();
                    const groupCampaigns = frData.filter(c => c.group_name === groupData.group_name);
                    const total = groupCampaigns.reduce((s, c) => s + (c.raised || 0), 0);
                    setGroupFundraising(total);
                }
            } catch (error) {
                console.error("Network error fetching group data:", error);
                setError("Could not connect to the backend while loading this group.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchGroupData();
    }, [id]);

    const handleDeleteGroup = async () => {
        if (!confirm(`Delete group "${group.group_name}"?`)) return;
        try {
            const response = await fetch(`http://127.0.0.1:8001/groups/${id}?owner_id=${localStorage.getItem("userId")}`, { method: "DELETE" });
            if (response.ok) window.location.href = "/dashboard";
        } catch (error) { console.error(error); }
    };

    if (loading) return <div className="group-state-card">Loading profile...</div>;
    if (!group) return <div className="group-state-card error">{error || "Group not found"}</div>;

    const pendingPayments = payments.filter((payment) => payment.status === "pending" || payment.status === "overdue");
    const paidPayments = payments.filter((payment) => payment.status === "paid");
    const pendingTotal = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const paidTotal = paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const tabs = ["Overview", "Events", "Members", "Payments", "Posts", "Polls", "Files"];

    const renderContent = () => {
        switch (activeTab) {
            case "Overview":
                return (
                    <div className="group-overview-grid">
                        <div className="members-list-card">
                            <div className="members-header">
                                <h3>Group Details</h3>
                            </div>
                            <div className="group-detail-list">
                                <div>
                                    <span>Activity</span>
                                    <strong>{group.activity || "Not set"}</strong>
                                </div>
                                <div>
                                    <span>Age Group</span>
                                    <strong>{group.age_group || "Not set"}</strong>
                                </div>
                                <div>
                                    <span>Sub Group</span>
                                    <strong>{group.sub_group || "None"}</strong>
                                </div>
                                <div>
                                    <span>Description</span>
                                    <strong>{group.description || "No description added yet."}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="members-list-card">
                            <div className="members-header">
                                <h3>Recent Members</h3>
                                <button className="add-member-inline-btn" onClick={() => setActiveTab("Members")}>View All</button>
                            </div>
                            <div className="members-list-content">
                                {members.slice(0, 4).map((member, index) => (
                                    <div className="member-item" key={`${member.id || "admin"}-${index}`}>
                                        <div className="member-avatar">{(member.first_name || "M").charAt(0).toUpperCase()}</div>
                                        <div className="member-info">
                                            <span className="member-name">{member.first_name} {member.last_name}</span>
                                            <span className="member-role">{member.role || "Member"}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case "Events":
                return (
                    <div className="events-container">
                        <div className="members-list-card">
                            <div className="members-header">
                                <h3>Upcoming Events</h3>
                                <button onClick={() => setShowCreateEventModal(true)} className="create-event-inline-btn">+ Create Events</button>
                            </div>
                            <div className="event-list-profile">
                            {events.length > 0 ? (
                                events.map((event, index) => (
                                    <div key={index} className="event-item">
                                        <div className="event-item-header">
                                            <h4>{event.name}</h4>
                                            <span className="event-type-badge">{event.type}</span>
                                        </div>
                                        <div className="event-detail">
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                            <span>{event.date} at {event.time}</span>
                                        </div>
                                    </div>
                                ))
                            ) : <div className="empty-events-profile"><h3>No upcoming events</h3></div>}
                        </div>
                        </div>
                    </div>
                );
            case "Members":
                return (
                    <div className="members-container">
                        <div className="members-list-card">
                            <div className="members-header">
                                <h3>Group Members ({members.length})</h3>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="add-member-inline-btn" onClick={() => setShowImportModal(true)}>Import</button>
                                    <button className="add-member-inline-btn" onClick={() => setShowAddMemberModal(true)}>Add Member</button>
                                </div>
                            </div>
                            <div className="members-list-content">
                                {members.map((member, index) => (
                                    <div className="member-item" key={index}>
                                        <div className="member-avatar">{(member.first_name || "M").charAt(0).toUpperCase()}</div>
                                        <div className="member-info">
                                            <span className="member-name">{member.first_name} {member.last_name}</span>
                                            <span className="member-role">{member.role}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case "Payments":
                return (
                    <div className="members-list-card">
                        <div className="members-header">
                            <h3>Group Payments ({payments.length})</h3>
                            <Link href="/dashboard" className="add-member-inline-btn" style={{ textDecoration: "none" }}>Manage Payments</Link>
                        </div>
                        {payments.length > 0 ? (
                            <div className="group-payment-list">
                                {payments.map((payment) => (
                                    <div className="group-payment-item" key={payment.id}>
                                        <div>
                                            <strong>{payment.title}</strong>
                                            <span>{payment.member_name || "Group request"} - {payment.due_date || "No due date"}</span>
                                        </div>
                                        <div className="group-payment-side">
                                            <strong>Rs. {Number(payment.amount || 0).toLocaleString("en-IN")}</strong>
                                            <span className={`group-payment-status ${payment.status}`}>{payment.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-events-profile"><h3>No payments for this group</h3></div>
                        )}
                    </div>
                );
            default:
                return <div className="empty-events-profile"><h3>No {activeTab.toLowerCase()} yet</h3></div>;
        }
    };

    return (
        <div className="group-profile">
            <header className="profile-header">
                <div>
                    <p className="profile-kicker">{group.activity || "Group"}</p>
                    <h1>{group.group_name}</h1>
                    {group.description && <p className="profile-description">{group.description}</p>}
                </div>
                <div className="group-profile-photo-container">
                    <button className="delete-group-btn" onClick={handleDeleteGroup}>Delete Group</button>
                </div>
            </header>

            <section className="group-profile-stats">
                <div>
                    <span>Members</span>
                    <strong>{members.length}</strong>
                </div>
                <div>
                    <span>Events</span>
                    <strong>{events.length}</strong>
                </div>
                <div>
                    <span>Pending Payments</span>
                    <strong>Rs. {pendingTotal.toLocaleString("en-IN")}</strong>
                </div>
                <div>
                    <span>Collected</span>
                    <strong>Rs. {paidTotal.toLocaleString("en-IN")}</strong>
                </div>
            </section>

            <nav className="profile-tabs">
                {tabs.map(tab => (
                    <div key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
            </nav>

            <div className="profile-content">
                <div className="main-feed">{renderContent()}</div>
                <aside className="right-widgets">
                    <div className="widget-card">
                        <h3>Fundraising</h3>
                        <div className="widget-content">
                            <div style={{ fontSize: "24px", fontWeight: "800", color: "#10b981", margin: "10px 0" }}>
                                ₹{groupFundraising.toLocaleString()}
                            </div>
                            <p style={{ fontSize: "12px", color: "#64748b" }}>Total funds raised by this group.</p>
                            <Link href="/dashboard/fundraising" style={{ display: "block", marginTop: "12px", fontSize: "13px", color: "#3b82f6", textDecoration: "none", fontWeight: "600" }}>
                                View All Campaigns →
                            </Link>
                        </div>
                    </div>
                    <div className="widget-card">
                        <h3>Attendance History</h3>
                        <div className="widget-content">Get an overview of attendance.</div>
                    </div>
                </aside>
            </div>

            {/* Modals - simplified for brevity */}
            {showAddMemberModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>Add New Member</h2>
                            <button className="close-btn" onClick={() => setShowAddMemberModal(false)}>&times;</button>
                        </div>
                        <form className="member-form" onSubmit={handleAddMember}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="first_name">First Name *</label>
                                    <input 
                                        type="text" 
                                        id="first_name"
                                        required 
                                        value={memberForm.first_name}
                                        onChange={(e) => setMemberForm(prev => ({ ...prev, first_name: e.target.value }))}
                                        placeholder="e.g. Rahul"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="last_name">Last Name</label>
                                    <input 
                                        type="text" 
                                        id="last_name"
                                        value={memberForm.last_name}
                                        onChange={(e) => setMemberForm(prev => ({ ...prev, last_name: e.target.value }))}
                                        placeholder="e.g. Sharma"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input 
                                    type="email" 
                                    id="email"
                                    value={memberForm.email}
                                    onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="e.g. rahul@example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input 
                                    type="tel" 
                                    id="phone"
                                    value={memberForm.phone}
                                    onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="e.g. +91 98765 43210"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="role">Role</label>
                                <select 
                                    id="role"
                                    value={memberForm.role}
                                    onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                                    style={{
                                        padding: "12px",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "8px",
                                        fontSize: "0.95rem",
                                        outline: "none",
                                        background: "white"
                                    }}
                                >
                                    <option value="Player">Player</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Coach">Coach</option>
                                    <option value="Referee">Referee</option>
                                </select>
                            </div>
                            <button type="submit" className="submit-member-btn">Add Member to Group</button>
                        </form>
                    </div>
                </div>
            )}
            {showCreateEventModal && <div className="modal-overlay"><div className="modal-card"><h2>Create Event</h2><button onClick={() => setShowCreateEventModal(false)}>Close</button></div></div>}
            {showImportModal && <div className="modal-overlay"><div className="modal-card"><h2>Import</h2><button onClick={() => setShowImportModal(false)}>Close</button></div></div>}
        </div>
    );
}
