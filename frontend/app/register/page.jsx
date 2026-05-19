"use client";

import { useState } from "react";
import styles from "../styles/signup.module.css";
import Step1 from "../../components/register/Step1";
import Step2 from "../../components/register/Step2";
import SuccessScreen from "../../components/register/SuccessScreen";

export default function SignupPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        clubName: "",
        country: "",
        state: "",
        memberCount: "",
        sport: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        aadharNumber: "",
        hearAbout: "",
        termsAgreed: false,
    });

    function handleChange(fieldName, value) {
        setFormData((prev) => ({
            ...prev,
            [fieldName]: value,
        }));
    }

    function handleNext() {
        setCurrentStep(2);
    }

    function handlePrevious() {
        setCurrentStep(1);
    }

    async function handleSubmit() {
        setLoading(true);
        setError(null);
        try {
            const apiUrl = `http://127.0.0.1:8001/register`;
            console.log("Attempting registration at:", apiUrl);

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                try {
                    const data = await response.json();
                    console.log("Registration successful:", data);
                    localStorage.setItem("userName", formData.firstName || "Admin");
                } catch (e) {
                    console.warn("Error parsing response or saving to localStorage", e);
                }
                setSubmitted(true);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Registration failed:", errorData);
                
                let errorMessage = "Registration failed. Please check your data.";
                if (errorData.detail) {
                    if (typeof errorData.detail === "string") {
                        errorMessage = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(err => err.msg || JSON.stringify(err)).join(", ");
                    }
                }
                setError(errorMessage);
            }
        } catch (error) {
            console.error("Connection Error:", error);
            setError("Cannot connect to server. Is the backend running?");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.card}>
                {error && (
                    <div style={{
                        backgroundColor: "#ffe3e3",
                        color: "#d32f2f",
                        padding: "12px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        fontSize: "14px",
                        textAlign: "center",
                        border: "1px solid #fbc2c2"
                    }}>
                        {error}
                    </div>
                )}
                
                <div className={styles.brand}>
                    <span className={styles.brandName}>Mukijo</span>
                    <span className={styles.brandTag}>Club Administrator Sign Up</span>
                </div>

                {submitted ? (
                    <SuccessScreen role="admin" />
                ) : currentStep === 1 ? (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <a href="/" className={styles.prevButton} style={{ display: "inline-block", alignSelf: "flex-start", marginBottom: "16px", textDecoration: "none", width: "fit-content" }}>
                            ← Back to Home
                        </a>
                        <Step1
                            formData={formData}
                            onChange={handleChange}
                            onNext={handleNext}
                        />
                    </div>
                ) : (
                    <Step2
                        formData={formData}
                        onChange={handleChange}
                        onPrevious={handlePrevious}
                        onSubmit={handleSubmit}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
}