"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import "../../../../styles/creategroup.css";

export default function EditMemberPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    // Form fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("Member");
    const [groupName, setGroupName] = useState("");

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState("");

    // Roles matching the system's standard roles
    const roles = ["Player", "Coach", "Parent", "Referee", "Member"];

    useEffect(() => {
        const fetchMember = async () => {
            try {
                const response = await fetch(`http://127.0.0.1:8001/members/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setFirstName(data.first_name || "");
                    setLastName(data.last_name || "");
                    setEmail(data.email || "");
                    setPhone(data.phone || "");
                    setRole(data.role || "Member");
                    setGroupName(data.group_name || "No Group");
                    setPassword(data.password || "");
                } else {
                    setError("Failed to retrieve member details. It might have been deleted.");
                }
            } catch (err) {
                console.error("Error fetching member:", err);
                setError("Could not connect to the backend server. Please verify it is running.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchMember();
        }
    }, [id]);

    const handleUpdateMember = async (e) => {
        e.preventDefault();
        
        if (!firstName.trim()) {
            alert("First Name is required");
            return;
        }
        if (!lastName.trim()) {
            alert("Last Name is required");
            return;
        }
        if (!email.trim()) {
            alert("Email is required");
            return;
        }
        if (!phone.trim()) {
            alert("Phone number is required");
            return;
        }
        if (!password.trim()) {
            alert("Password is required");
            return;
        }

        setIsSubmitting(true);
        setError("");

        const updatedData = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            role: role,
            password: password
        };

        try {
            const response = await fetch(`http://127.0.0.1:8001/members/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                setError(errData.detail || "Failed to update member.");
                setIsSubmitting(false);
                return;
            }

            // Success animation trigger
            setShowSuccess(true);
            
            setTimeout(() => {
                router.push("/dashboard/members");
            }, 1800);

        } catch (err) {
            console.error("Error updating member:", err);
            setError("Server connection lost. Unable to update member.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-group-page" style={{ padding: "40px 20px", minHeight: "calc(100vh - 120px)" }}>
            <div className="create-group-container" style={{ maxWidth: "650px" }}>
                
                {/* Back Button Link */}
                <button 
                    className="back-btn" 
                    onClick={() => router.push("/dashboard/members")}
                    style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "6px", 
                        marginBottom: "24px",
                        fontSize: "15px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600"
                    }}
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Back to members list
                </button>

                <div className="form-card" style={{ backdropFilter: "blur(20px)", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.05)" }}>
                    {loading ? (
                        <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                            <div className="loading-spinner" style={{ margin: "0 auto 16px", border: "3px solid #f3f3f3", borderTop: "3px solid #2563eb", borderRadius: "50%", width: "30px", height: "30px", animation: "spin 1s linear infinite" }}></div>
                            <p style={{ fontWeight: "500" }}>Fetching member profile...</p>
                            <style>{`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: "center", padding: "20px 0" }}>
                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
                            <h2 style={{ color: "#ef4444", fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>Profile Load Error</h2>
                            <p style={{ color: "#64748b", marginBottom: "24px" }}>{error}</p>
                            <button 
                                className="next-btn" 
                                onClick={() => router.push("/dashboard/members")}
                                style={{ maxWidth: "200px", margin: "0 auto" }}
                            >
                                Return to Members
                            </button>
                        </div>
                    ) : showSuccess ? (
                        <div className="success-message">
                            <div className="success-icon" style={{ animation: "bounce 0.8s ease infinite alternate" }}>✨</div>
                            <h1>Member Updated!</h1>
                            <p>Profile changes saved persistently in the database. Redirecting...</p>
                            <style>{`
                                @keyframes bounce {
                                    0% { transform: translateY(0); }
                                    100% { transform: translateY(-8px); }
                                }
                            `}</style>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdateMember} className="step-content fade-in">
                            <div className="step-header" style={{ marginBottom: "28px" }}>
                                <span style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "700", letterSpacing: "1.5px", color: "#3b82f6", display: "block", marginBottom: "6px" }}>
                                    Club Member Management
                                </span>
                                <h1>Edit Member Details</h1>
                                <p style={{ fontSize: "14px", marginTop: "4px" }}>Modify first name, last name, and contact details. Club assignment remains read-only.</p>
                            </div>

                            <div className="input-section">
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>First Name *</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="First Name"
                                            required
                                        />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Last Name *</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Last Name"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Email Address *</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        required
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Phone Number *</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Phone Number"
                                            required
                                        />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Member Password *</label>
                                        <input
                                            type="text"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter password"
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div className="input-group">
                                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Member Role</label>
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "14px 18px",
                                                borderRadius: "12px",
                                                border: "2px solid #f1f5f9",
                                                background: "#f8fafc",
                                                fontSize: "16px",
                                                color: "#1e293b",
                                                outline: "none",
                                                cursor: "pointer",
                                                transition: "0.2s"
                                            }}
                                        >
                                            {roles.map((r) => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="input-group">
                                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8" }}>Group / Club (Read-Only)</label>
                                        <input
                                            type="text"
                                            value={groupName}
                                            disabled
                                            style={{
                                                backgroundColor: "#f1f5f9",
                                                borderColor: "#e2e8f0",
                                                color: "#64748b",
                                                cursor: "not-allowed",
                                                fontWeight: "500"
                                            }}
                                            title="Group assignment cannot be changed from this screen."
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="submit-btn" 
                                disabled={isSubmitting}
                                style={{ 
                                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                                    fontWeight: "600",
                                    fontSize: "16px",
                                    padding: "16px",
                                    borderRadius: "14px"
                                }}
                            >
                                {isSubmitting ? "Saving Profile..." : "Update Member"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
