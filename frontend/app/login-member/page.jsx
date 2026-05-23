"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../styles/login.module.css";

function LoginMemberContent() {
    const searchParams = useSearchParams();
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (searchParams.get("registered") === "true") {
            setShowSuccess(true);
        }
    }, [searchParams]);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch("http://127.0.0.1:8001/login-member", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password.trim(),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Member login successful:", data);

                localStorage.setItem("userName", data.userName);
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("clubName", data.clubName);
                localStorage.setItem("isMember", "true");
                localStorage.setItem("memberRole", data.memberRole || "Member");
                localStorage.setItem("memberId", data.memberId || "");
                localStorage.setItem("userEmail", data.userEmail || formData.email);
                localStorage.setItem("userPhone", data.userPhone || "");
                localStorage.setItem("memberGroupName", data.groupName || "");
                localStorage.setItem("approvalStatus", data.approvalStatus || "accepted");

                window.location.href = "/dashboard";
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.detail || "Member login failed. Make sure the club admin has accepted your application.");
            }
        } catch (error) {
            console.error("Member Login Error:", error);
            alert("Could not connect to the server. Is the backend running?");
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <span className={styles.logo}>Mukijo</span>
                    <h1 className={styles.title}>Member Login</h1>
                    <p className={styles.subtitle}>Use the email and password from your approved registration</p>
                </div>

                {showSuccess && (
                    <div style={{
                        backgroundColor: "#d4edda",
                        color: "#155724",
                        padding: "12px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        fontSize: "14px",
                        textAlign: "center",
                        border: "1px solid #c3e6cb"
                    }}>
                        <strong>Application submitted!</strong><br />
                        Club admin has to approve your application before you can log in.
                    </div>
                )}

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>Email address</label>
                        <div className={styles.inputWrapper}>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                className={styles.input}
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label htmlFor="password" className={styles.label}>Password</label>
                        </div>
                        <div className={styles.inputWrapper}>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Enter your password"
                                className={styles.input}
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className={styles.loginButton} style={{ backgroundColor: "#2563eb" }}>
                        Login
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>or</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "center" }}>
                    <Link href="/" className={styles.signupLink} style={{ textDecoration: "none", fontSize: "14px" }}>
                        Back to Home
                    </Link>
                </div>

                <div className={styles.footer} style={{ marginTop: "20px" }}>
                    Not a member yet?{" "}
                    <Link href="/register-member" className={styles.signupLink}>
                        Register here
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginMemberPage() {
    return (
        <Suspense fallback={null}>
            <LoginMemberContent />
        </Suspense>
    );
}
