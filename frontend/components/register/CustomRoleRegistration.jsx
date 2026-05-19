"use client";

import { useEffect, useState } from "react";
import { Sparkles, CheckCircle, ArrowLeft } from "lucide-react";
import styles from "../../app/styles/signup.module.css";

export default function CustomRoleRegistration({ role, onBack, onComplete }) {
    const [clubs, setClubs] = useState([]);
    const [selectedClub, setSelectedClub] = useState(null);
    const [formConfig, setFormConfig] = useState(null);
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState("");

    // Fetch all clubs initially
    useEffect(() => {
        const fetchClubs = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8001/clubs");
                if (res.ok) {
                    const data = await res.json();
                    setClubs(data);
                    if (data && data.length > 0) {
                        setSelectedClub(data[0]);
                    } else {
                        setSelectedClub({ id: 1, club_name: "Mukijo Club" });
                    }
                } else {
                    setSelectedClub({ id: 1, club_name: "Mukijo Club" });
                }
            } catch (err) {
                console.error("Error fetching clubs:", err);
                setSelectedClub({ id: 1, club_name: "Mukijo Club" });
            }
        };
        fetchClubs();
    }, []);

    // Fetch form configuration once club is selected
    useEffect(() => {
        if (!selectedClub) return;

        const fetchFormConfig = async () => {
            setLoading(true);
            try {
                const res = await fetch(`http://127.0.0.1:8001/signup-forms/${role.toLowerCase()}?owner_id=${selectedClub.id}`);
                if (res.ok) {
                    const data = await res.json();
                    let parsedFields = [];
                    try {
                        parsedFields = typeof data.fields === "string" ? JSON.parse(data.fields) : data.fields;
                    } catch (e) {
                        parsedFields = [];
                    }
                    setFormConfig({ ...data, fields: parsedFields });

                    // Initialise formData state with empty values
                    const initialData = {};
                    parsedFields.forEach(f => {
                        initialData[f.name] = "";
                    });
                    setFormData(initialData);
                }
            } catch (err) {
                console.error("Error fetching custom form:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFormConfig();
    }, [selectedClub, role]);

    function handleFieldChange(name, value) {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError("");

        // Simple validation
        const newErrors = {};
        if (formConfig && formConfig.fields) {
            formConfig.fields.forEach(field => {
                if (field.required && !formData[field.name]) {
                    newErrors[field.name] = `${field.label} is required`;
                }
            });
        }

        // Validate password if email field exists
        const hasEmail = formConfig?.fields?.some(f => f.name.toLowerCase() === "email");
        if (hasEmail && !formData["password"]) {
            newErrors["password"] = "Password is required";
        }

        // Validate sport if parent role
        if (role.toLowerCase() === "parent" && !formData["sport"]) {
            newErrors["sport"] = "Selecting a sport is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("http://127.0.0.1:8001/signup-submissions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    owner_id: selectedClub.id,
                    role: role,
                    submitted_data: JSON.stringify(formData)
                })
            });

            if (response.ok) {
                onComplete();
            } else {
                setSubmitError("Failed to submit application. Please check details.");
            }
        } catch (err) {
            console.error("Error submitting form application:", err);
            setSubmitError("Server connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    if (loading && !formConfig) {
        return (
            <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ width: "30px", height: "30px", border: "3px solid #cbd5e1", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
                <p style={{ color: "#64748b", fontSize: "14px" }}>Fetching customized form configuration...</p>
                <style jsx>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div className={styles.stepContainer}>
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px" }}>
                <button type="button" className={styles.prevButton} onClick={onBack}>
                    ← Back to Roles
                </button>
            </div>

            {submitError && (
                <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "16px", textAlign: "center" }}>
                    {submitError}
                </div>
            )}

            <h2 className={styles.stepTitle}>{formConfig?.title || `${role} Signup`}</h2>
            <p className={styles.stepSubtitle}>{formConfig?.description || "Apply to join our organisation by filling in your details below."}</p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Embedded Select Club / Academy Dropdown */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                        Select Sports Club / Academy <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                        className={styles.select}
                        value={selectedClub?.id || ""}
                        onChange={(e) => {
                            const clubId = Number(e.target.value);
                            const found = clubs.find(c => c.id === clubId);
                            if (found) {
                                setSelectedClub(found);
                            }
                        }}
                        required
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontSize: "14px",
                            outline: "none",
                            background: "#ffffff",
                            color: "#0f172a",
                            fontWeight: 600
                        }}
                    >
                        {clubs.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.club_name} ({c.sport || "All Sports"})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Customized Club Onboarding Fields */}
                {formConfig?.fields.map((field) => {
                    const isEmailField = field.name.toLowerCase() === "email";
                    return (
                        <div key={field.name} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                                </label>
                                {field.type === "select" ? (
                                    <select
                                        className={styles.select}
                                        value={formData[field.name] || ""}
                                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                    >
                                        <option value="">{field.placeholder || "Select option..."}</option>
                                        {(field.options || ["Father", "Mother", "Guardian", "Male", "Female", "Other"]).map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        className={styles.input}
                                        placeholder={field.placeholder || ""}
                                        value={formData[field.name] || ""}
                                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                    />
                                )}
                                {errors[field.name] && (
                                    <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                                        {errors[field.name]}
                                    </span>
                                )}
                            </div>
                            {isEmailField && (
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>
                                        Create Password <span style={{ color: "#ef4444" }}>*</span>
                                    </label>
                                    <input
                                        type="password"
                                        className={styles.input}
                                        placeholder="Choose a password for your account"
                                        value={formData["password"] || ""}
                                        onChange={(e) => handleFieldChange("password", e.target.value)}
                                        required
                                    />
                                    {errors["password"] && (
                                        <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                                            {errors["password"]}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {role.toLowerCase() === "parent" && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                            Select Sport <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <select
                            className={styles.select}
                            value={formData["sport"] || ""}
                            onChange={(e) => handleFieldChange("sport", e.target.value)}
                            required
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                fontSize: "14px",
                                outline: "none",
                                background: "#ffffff",
                                color: "#0f172a"
                            }}
                        >
                            <option value="">Choose a sport...</option>
                            <option value="Tennis">Tennis</option>
                            <option value="Cricket">Cricket</option>
                            <option value="Football (Soccer)">Football (Soccer)</option>
                            <option value="Basketball">Basketball</option>
                            <option value="Badminton">Badminton</option>
                            <option value="Swimming">Swimming</option>
                        </select>
                        {errors["sport"] && (
                            <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                                {errors["sport"]}
                            </span>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={loading}
                    style={{ width: "100%", marginTop: "10px", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                >
                    {loading ? "Submitting Application..." : "Submit Application"}
                </button>
            </form>
        </div>
    );
}
