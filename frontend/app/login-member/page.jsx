"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../styles/login.module.css";

function LoginMemberContent() {
    const searchParams = useSearchParams();
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (searchParams.get("registered") === "true") {
            setShowSuccess(true);
        }
    }, [searchParams]);

    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setError("");
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const response = await fetch("http://127.0.0.1:8001/login-member", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password.trim(),
                }),
            });

            if (response.ok) {
                const data = await response.json();
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
                setError(errorData.detail || "Login failed. Make sure your application has been approved.");
            }
        } catch (err) {
            setError("Cannot connect to server. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            {/* ── Form Panel ── */}
            <div className={styles.formPanel}>
                <div className={styles.loginCard}>
                    <div className={styles.header}>
                        <span className={styles.logo}>Mukijo</span>
                        <h1 className={styles.title}>Member Login</h1>
                        <p className={styles.subtitle}>
                            Sign in with your approved member credentials
                        </p>
                    </div>

                    {showSuccess && (
                        <div style={{
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            color: "#fcd34d",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            marginBottom: "20px",
                            fontSize: "13px",
                            textAlign: "center",
                        }}>
                            <strong>Application submitted!</strong><br />
                            Your club admin must approve your application before you can log in.
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
                            <label htmlFor="password" className={styles.label}>Password</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className={styles.input}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {error && <div className={styles.errorMsg}>{error}</div>}

                        <button
                            type="submit"
                            className={styles.loginButton}
                            disabled={loading}
                            style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}
                        >
                            {loading ? "Signing in…" : "Enter Member Dashboard →"}
                        </button>
                    </form>

                    <div className={styles.divider}><span>or</span></div>

                    <div className={styles.footer}>
                        Not a member yet?{" "}
                        <Link href="/register-member" className={styles.signupLink}>
                            Register here
                        </Link>
                    </div>
                    <div style={{ textAlign: "center", marginTop: "10px" }}>
                        <Link href="/" className={styles.signupLink} style={{ fontSize: "13px", opacity: 0.6 }}>
                            ← Back to Home
                        </Link>
                    </div>
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
