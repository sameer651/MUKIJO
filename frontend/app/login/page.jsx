"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../styles/login.module.css";

function LoginContent() {
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
            const response = await fetch(`http://127.0.0.1:8001/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.removeItem("isMember");
                localStorage.removeItem("memberRole");
                localStorage.removeItem("userEmail");
                localStorage.removeItem("userPhone");
                localStorage.setItem("userName", data.userName);
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("clubName", data.clubName);
                window.location.href = "/dashboard";
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.detail || "Invalid credentials. Please try again.");
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
                        <h1 className={styles.title}>Admin Sign In</h1>
                        <p className={styles.subtitle}>Welcome back — enter your credentials to continue</p>
                    </div>

                    {showSuccess && (
                        <div style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            color: "#6ee7b7",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            marginBottom: "20px",
                            fontSize: "14px",
                            textAlign: "center",
                        }}>
                            <strong>Registration successful!</strong><br />
                            You can now sign in with your account.
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
                                <Link href="/forgot-password" className={styles.forgotPassword}>
                                    Forgot password?
                                </Link>
                            </div>
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

                        <button type="submit" className={styles.loginButton} disabled={loading}>
                            {loading ? "Signing in…" : "Sign in to Dashboard →"}
                        </button>
                    </form>

                    <div className={styles.divider}><span>or</span></div>

                    <div className={styles.footer}>
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className={styles.signupLink}>
                            Create one free
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginContent />
        </Suspense>
    );
}
