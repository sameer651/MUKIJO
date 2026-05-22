"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../styles/signup.module.css";
import CustomRoleRegistration from "../../components/register/CustomRoleRegistration";
import SuccessScreen from "../../components/register/SuccessScreen";

const roles = [
    {
        value: "Player",
        title: "Player / Athlete",
        description: "Join a group/team in a sports club. Fill in your player details.",
    },
    {
        value: "Parent",
        title: "Parent / Guardian",
        description: "Register your children and manage emergency contacts.",
    },
    {
        value: "Coach",
        title: "Coach / Trainer",
        description: "Apply to coach teams, view schedules, and manage sessions.",
    },
    {
        value: "Referee",
        title: "Referee / Match Official",
        description: "Register as an official to referee club tournaments and matches.",
    },
];

const roleCardStyle = {
    padding: "16px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    textAlign: "left",
};

export default function RegisterMemberPage() {
    const [clubs, setClubs] = useState([]);
    const [selectedClub, setSelectedClub] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [loadingClubs, setLoadingClubs] = useState(true);
    const [clubError, setClubError] = useState("");
    const [pendingClubId, setPendingClubId] = useState("");
    const [clubDropdownOpen, setClubDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchClubs = async () => {
            setLoadingClubs(true);
            setClubError("");

            try {
                const response = await fetch("http://127.0.0.1:8001/clubs");
                if (!response.ok) {
                    throw new Error("Could not load clubs.");
                }

                const data = await response.json();
                setClubs(data || []);

                if (!data || data.length === 0) {
                    setClubError("No clubs are available for member registration yet.");
                }
            } catch (error) {
                console.error("Error fetching clubs:", error);
                setClubError("Could not load the club list. Please try again.");
            } finally {
                setLoadingClubs(false);
            }
        };

        fetchClubs();
    }, []);

    function handleClubSubmit(event) {
        event.preventDefault();
        const clubId = Number(pendingClubId);
        const club = clubs.find((item) => item.id === clubId);

        if (!club) {
            setClubError("Please select a club to continue.");
            return;
        }

        setSelectedClub(club);
        setSelectedRole(null);
        setClubError("");
        setClubDropdownOpen(false);
    }

    function resetToClubStep() {
        setSelectedClub(null);
        setSelectedRole(null);
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <span className={styles.brandName}>Mukijo</span>
                    <span className={styles.brandTag}>Member Registration Portal</span>
                </div>

                {submitted ? (
                    <SuccessScreen role={selectedRole} />
                ) : selectedClub === null ? (
                    <div className={styles.stepContainer} style={{ display: "flex", flexDirection: "column" }}>
                        <Link
                            href="/"
                            className={styles.prevButton}
                            style={{
                                display: "inline-block",
                                alignSelf: "flex-start",
                                marginBottom: "16px",
                                textDecoration: "none",
                                width: "fit-content",
                                background: "#2563eb",
                                color: "#ffffff",
                                borderColor: "#2563eb",
                            }}
                        >
                            &lt;- Back to Home
                        </Link>

                        <h2 className={styles.stepTitle}>Select The Club You Want To Join</h2>
                        <p className={styles.stepSubtitle}>Choose your club before continuing registration.</p>

                        {clubError && (
                            <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "16px", textAlign: "center" }}>
                                {clubError}
                            </div>
                        )}

                        <form onSubmit={handleClubSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    Club <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <div style={{ position: "relative" }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!loadingClubs && clubs.length > 0) {
                                                setClubDropdownOpen((open) => !open);
                                            }
                                        }}
                                        disabled={loadingClubs || clubs.length === 0}
                                        style={{
                                            width: "100%",
                                            padding: "11px 14px",
                                            border: "1.5px solid #d8d8d8",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            color: pendingClubId ? "#1a1a1a" : "#888",
                                            background: "#fafafa",
                                            cursor: loadingClubs || clubs.length === 0 ? "not-allowed" : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            textAlign: "left",
                                        }}
                                    >
                                        <span>
                                            {loadingClubs
                                                ? "Loading clubs..."
                                                : clubs.find((club) => club.id === Number(pendingClubId))?.club_name || "Choose your club..."}
                                        </span>
                                        <span style={{ color: "#2563eb", fontWeight: 800 }}>v</span>
                                    </button>

                                    {clubDropdownOpen && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: "calc(100% + 6px)",
                                                left: 0,
                                                right: 0,
                                                zIndex: 20,
                                                maxHeight: "220px",
                                                overflowY: "auto",
                                                background: "#ffffff",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "8px",
                                                boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                                            }}
                                        >
                                            {clubs.map((club) => (
                                                <button
                                                    type="button"
                                                    key={club.id}
                                                    onClick={() => {
                                                        setPendingClubId(String(club.id));
                                                        setClubDropdownOpen(false);
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        padding: "11px 14px",
                                                        border: "none",
                                                        borderBottom: "1px solid #f1f5f9",
                                                        background: Number(pendingClubId) === club.id ? "#eff6ff" : "#ffffff",
                                                        color: "#0f172a",
                                                        cursor: "pointer",
                                                        textAlign: "left",
                                                        fontSize: "14px",
                                                        fontWeight: Number(pendingClubId) === club.id ? 700 : 500,
                                                    }}
                                                >
                                                    {club.club_name} {club.sport ? `(${club.sport})` : ""}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={loadingClubs || clubs.length === 0 || !pendingClubId}
                                style={{
                                    alignSelf: "center",
                                    width: "auto",
                                    minWidth: "150px",
                                    padding: "10px 22px",
                                    background: "#2563eb",
                                    opacity: loadingClubs || clubs.length === 0 || !pendingClubId ? 0.7 : 1,
                                }}
                            >
                                Continue
                            </button>
                        </form>
                    </div>
                ) : selectedRole === null ? (
                    <div className={styles.stepContainer} style={{ display: "flex", flexDirection: "column" }}>
                        <button type="button" className={styles.prevButton} onClick={resetToClubStep} style={{ alignSelf: "flex-start", marginBottom: "16px" }}>
                            &lt;- Back to Clubs
                        </button>

                        <h2 className={styles.stepTitle}>How Do You Want To Continue?</h2>
                        <p className={styles.stepSubtitle}>
                            Registering for {selectedClub.club_name}. Select your onboarding type.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
                            {roles.map((role) => (
                                <button
                                    type="button"
                                    key={role.value}
                                    onClick={() => setSelectedRole(role.value)}
                                    style={roleCardStyle}
                                    onMouseEnter={(event) => {
                                        event.currentTarget.style.transform = "translateY(-2px)";
                                        event.currentTarget.style.borderColor = "#2563eb";
                                        event.currentTarget.style.boxShadow = "0 6px 12px rgba(15, 23, 42, 0.05)";
                                    }}
                                    onMouseLeave={(event) => {
                                        event.currentTarget.style.transform = "none";
                                        event.currentTarget.style.borderColor = "#e2e8f0";
                                        event.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                                    }}
                                >
                                    <strong style={{ color: "#0f172a", fontSize: "16px", display: "block" }}>{role.title}</strong>
                                    <span style={{ fontSize: "13px", color: "#475569", marginTop: "4px", display: "block" }}>{role.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <CustomRoleRegistration
                        role={selectedRole}
                        selectedClub={selectedClub}
                        onBack={() => setSelectedRole(null)}
                        backLabel="<- Back to Type"
                        onComplete={() => setSubmitted(true)}
                    />
                )}
            </div>
        </div>
    );
}
