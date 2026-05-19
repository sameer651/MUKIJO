"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState("verifying"); // verifying, success, error
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid verification link.");
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await fetch(`http://127.0.0.1:8001/verify?token=${token}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus("success");
                    setMessage(data.message || "Your email has been successfully verified!");
                } else {
                    setStatus("error");
                    setMessage(data.detail || "Verification failed. The link may be expired or invalid.");
                }
            } catch (error) {
                console.error("Verification error:", error);
                setStatus("error");
                setMessage("Could not connect to the server. Please try again later.");
            }
        };

        verifyToken();
    }, [token]);

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.iconContainer}>
                    {status === "verifying" && <div style={styles.spinner}></div>}
                    {status === "success" && <div style={styles.successIcon}>✓</div>}
                    {status === "error" && <div style={styles.errorIcon}>✕</div>}
                </div>
                
                <h1 style={styles.title}>
                    {status === "verifying" && "Verifying Email..."}
                    {status === "success" && "Verified!"}
                    {status === "error" && "Verification Failed"}
                </h1>
                
                <p style={styles.message}>{message}</p>
                
                {(status === "success" || status === "error") && (
                    <Link href="/login" style={styles.button}>
                        {status === "success" ? "Go to Login" : "Try Again"}
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyContent />
        </Suspense>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f4f7fa",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    card: {
        backgroundColor: "#ffffff",
        padding: "48px 40px",
        borderRadius: "16px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
        textAlign: "center",
        maxWidth: "400px",
        width: "100%",
    },
    iconContainer: {
        marginBottom: "24px",
        display: "flex",
        justifyContent: "center",
    },
    spinner: {
        width: "50px",
        height: "50px",
        border: "5px solid #f3f3f3",
        borderTop: "5px solid #3498db",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    },
    successIcon: {
        width: "64px",
        height: "64px",
        backgroundColor: "#2ecc71",
        color: "white",
        fontSize: "32px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    errorIcon: {
        width: "64px",
        height: "64px",
        backgroundColor: "#e74c3c",
        color: "white",
        fontSize: "32px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: "24px",
        fontWeight: "700",
        color: "#2c3e50",
        marginBottom: "16px",
    },
    message: {
        fontSize: "16px",
        color: "#7f8c8d",
        lineHeight: "1.5",
        marginBottom: "32px",
    },
    button: {
        display: "inline-block",
        padding: "12px 32px",
        backgroundColor: "#3498db",
        color: "white",
        textDecoration: "none",
        borderRadius: "8px",
        fontWeight: "600",
        transition: "background-color 0.2s",
    },
};
