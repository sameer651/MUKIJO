"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../styles/signup.module.css";
import CustomRoleRegistration from "../../components/register/CustomRoleRegistration";
import SuccessScreen from "../../components/register/SuccessScreen";

export default function RegisterMemberPage() {
    const [selectedRole, setSelectedRole] = useState(null); // null, "Coach", "Parent", "Player", "Referee"
    const [submitted, setSubmitted] = useState(false);

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <span className={styles.brandName}>Mukijo</span>
                    <span className={styles.brandTag}>Member Registration Portal</span>
                </div>

                {submitted ? (
                    <SuccessScreen role={selectedRole} />
                ) : selectedRole === null ? (
                    <div className={styles.stepContainer} style={{ display: "flex", flexDirection: "column" }}>
                        <Link href="/" className={styles.prevButton} style={{ display: "inline-block", alignSelf: "flex-start", marginBottom: "16px", textDecoration: "none", width: "fit-content" }}>
                            ← Back to Home
                        </Link>
                        <h2 className={styles.stepTitle}>Choose Who You Are</h2>
                        <p className={styles.stepSubtitle}>Select your onboarding role to join a club</p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
                            <div 
                                onClick={() => setSelectedRole("Player")} 
                                style={{
                                    padding: "16px",
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.borderColor = "#2563eb";
                                    e.currentTarget.style.boxShadow = "0 6px 12px rgba(15, 23, 42, 0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "none";
                                    e.currentTarget.style.borderColor = "#e2e8f0";
                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                                }}
                            >
                                <strong style={{ color: "#0f172a", fontSize: "16px", display: "block" }}>Player / Athlete</strong>
                                <span style={{ fontSize: "13px", color: "#475569", marginTop: "4px", display: "block" }}>Join a group/team in a sports club. Fill in your player details.</span>
                            </div>
                            
                            <div 
                                onClick={() => setSelectedRole("Parent")} 
                                style={{
                                    padding: "16px",
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.borderColor = "#2563eb";
                                    e.currentTarget.style.boxShadow = "0 6px 12px rgba(15, 23, 42, 0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "none";
                                    e.currentTarget.style.borderColor = "#e2e8f0";
                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                                }}
                            >
                                <strong style={{ color: "#0f172a", fontSize: "16px", display: "block" }}>Parent / Guardian</strong>
                                <span style={{ fontSize: "13px", color: "#475569", marginTop: "4px", display: "block" }}>Register your children and manage emergency contacts.</span>
                            </div>
                            
                            <div 
                                onClick={() => setSelectedRole("Coach")} 
                                style={{
                                    padding: "16px",
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.borderColor = "#2563eb";
                                    e.currentTarget.style.boxShadow = "0 6px 12px rgba(15, 23, 42, 0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "none";
                                    e.currentTarget.style.borderColor = "#e2e8f0";
                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                                }}
                            >
                                <strong style={{ color: "#0f172a", fontSize: "16px", display: "block" }}>Coach / Trainer</strong>
                                <span style={{ fontSize: "13px", color: "#475569", marginTop: "4px", display: "block" }}>Apply to coach teams, view schedules, and manage sessions.</span>
                            </div>
                            
                            <div 
                                onClick={() => setSelectedRole("Referee")} 
                                style={{
                                    padding: "16px",
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.borderColor = "#2563eb";
                                    e.currentTarget.style.boxShadow = "0 6px 12px rgba(15, 23, 42, 0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "none";
                                    e.currentTarget.style.borderColor = "#e2e8f0";
                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                                }}
                            >
                                <strong style={{ color: "#0f172a", fontSize: "16px", display: "block" }}>Referee / Match Official</strong>
                                <span style={{ fontSize: "13px", color: "#475569", marginTop: "4px", display: "block" }}>Register as an official to referee club tournaments and matches.</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <CustomRoleRegistration
                        role={selectedRole}
                        onBack={() => setSelectedRole(null)}
                        onComplete={() => setSubmitted(true)}
                    />
                )}
            </div>
        </div>
    );
}
