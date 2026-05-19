"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../styles/login.module.css";

function LoginContent() {
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
            const response = await fetch(`http://127.0.0.1:8001/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Login successful:", data);
                
                // Clear any previous member login state to avoid role pollution
                localStorage.removeItem("isMember");
                localStorage.removeItem("memberRole");
                localStorage.removeItem("userEmail");
                localStorage.removeItem("userPhone");
                
                // Store the user name and ID for the dashboard
                localStorage.setItem("userName", data.userName);
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("clubName", data.clubName);
                
                // Redirect to dashboard
                window.location.href = "/dashboard";
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.detail || "Login failed. Please check your credentials.");
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("Could not connect to the server. Is the backend running?");
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <span className={styles.logo}>Mukijo</span>
                    <h1 className={styles.title}>Welcome back</h1>
                    <p className={styles.subtitle}>Please enter your details to sign in</p>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                    <button type="submit" className={styles.loginButton}>
                        Sign in
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>or</span>
                </div>

                <div className={styles.footer}>
                    Don&apos;t have an account? 
                    <Link href="/register" className={styles.signupLink}>
                        Sign up for free
                    </Link>
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
