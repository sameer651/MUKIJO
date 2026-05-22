"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    Check,
    CreditCard,
    MapPin,
    Trash2,
    UserPlus,
    X,
} from "lucide-react";
import api from "../../../../lib/api";
import "../../../styles/course-registration.css";

const emptyRegistration = {
    member_id: "",
    participant_name: "",
    participant_email: "",
    participant_phone: "",
    payment_status: "unpaid",
    notes: "",
};

const statusLabels = {
    draft: "Draft",
    open: "Open",
    full: "Full",
    closed: "Closed",
    completed: "Completed",
    unregistered: "Unregistered",
    registered: "Registered",
    waitlisted: "Waitlisted",
    cancelled: "Cancelled",
    unpaid: "Unpaid",
    paid: "Paid",
    waived: "Waived",
};

function money(value) {
    return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function dateText(value) {
    if (!value) return "Not scheduled";
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function CourseDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [course, setCourse] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [members, setMembers] = useState([]);
    const [registrationForm, setRegistrationForm] = useState(emptyRegistration);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [gatewayConfig, setGatewayConfig] = useState({ configured: false, key_id: null, currency: "INR" });
    const [payingRegistrationId, setPayingRegistrationId] = useState(null);
    const [isBuying, setIsBuying] = useState(false);

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;
    const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : "";
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : "";
    const userPhone = typeof window !== "undefined" ? localStorage.getItem("userPhone") : "";

    const myRegistration = useMemo(() => {
        if (!userEmail) return null;
        return registrations.find(r => r.participant_email?.toLowerCase() === userEmail.toLowerCase());
    }, [registrations, userEmail]);

    const isRegistrationPaid = myRegistration?.payment_status === "paid";

    const loadData = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            setError("Please sign in to view this course.");
            return;
        }

        try {
            const [courseRes, registrationsRes, membersRes] = await Promise.all([
                api.get(`/courses/${id}`, { params: { owner_id: userId } }),
                api.get(`/courses/${id}/registrations`, { params: { owner_id: userId } }),
                api.get("/members", { params: { owner_id: userId } }),
            ]);

            setCourse(courseRes.data);
            setRegistrations(registrationsRes.data || []);
            setMembers(membersRes.data || []);
        } catch (err) {
            console.error("Failed to load course details:", err);
            setError("Could not load course details.");
        } finally {
            setLoading(false);
        }
    }, [id, userId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const memberOptions = useMemo(() => {
        if (!course?.group_id) return members;
        return members.filter((member) => String(member.group_id) === String(course.group_id));
    }, [members, course]);

    const updateRegistrationField = (field, value) => {
        setRegistrationForm((current) => ({ ...current, [field]: value }));
    };

    const loadGatewayConfig = async () => {
        if (!userId) return;
        try {
            const response = await api.get("/payments/razorpay/config");
            setGatewayConfig(response.data || { configured: false, key_id: null, currency: "INR" });
        } catch (err) {
            console.error("Failed to load Razorpay config:", err);
        }
    };

    useEffect(() => {
        loadGatewayConfig();
    }, [userId]);

    const loadRazorpayCheckout = async () => {
        if (typeof window === "undefined") {
            throw new Error("Checkout is not available in this environment.");
        }
        if (window.Razorpay) return;

        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector("script[src='https://checkout.razorpay.com/v1/checkout.js']");
            if (existingScript) {
                existingScript.addEventListener("load", resolve, { once: true });
                existingScript.addEventListener("error", () => reject(new Error("Could not load Razorpay Checkout.")), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
            document.body.appendChild(script);
        });
    };

    const payCourseFee = async (registration) => {
        if (!course || !registration) return;
        if (!gatewayConfig.configured) {
            setError("Online payments are not configured right now.");
            return;
        }
        if (!course.fee || Number(course.fee) <= 0) {
            setError("This course does not have a payable fee.");
            return;
        }

        setError("");
        setPayingRegistrationId(registration.id);

        try {
            const paymentResponse = await api.post("/payments", {
                owner_id: Number(userId),
                group_id: course.group_id || null,
                member_id: registration.member_id || null,
                title: `Course Fee: ${course.title}`,
                description: `course_registration_id:${registration.id}|course_id:${course.id}`,
                category: "Course Fee",
                amount: Number(course.fee || 0),
                status: "pending",
            });
            const orderResponse = await api.post("/payments/razorpay/order", {
                payment_id: paymentResponse.data.id,
                owner_id: Number(userId),
            });

            await loadRazorpayCheckout();

            const checkout = new window.Razorpay({
                key: orderResponse.data.key_id,
                amount: orderResponse.data.amount,
                currency: orderResponse.data.currency,
                name: orderResponse.data.name,
                description: orderResponse.data.description || `Payment for ${course.title}`,
                order_id: orderResponse.data.razorpay_order_id,
                prefill: {
                    name: orderResponse.data.prefill_name || userName || "",
                    email: orderResponse.data.prefill_email || userEmail || "",
                    contact: orderResponse.data.prefill_contact || userPhone || "",
                },
                handler: async (response) => {
                    try {
                        await api.post("/payments/razorpay/verify", {
                            payment_id: paymentResponse.data.id,
                            owner_id: Number(userId),
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        await loadData();
                        await loadGatewayConfig();
                        alert("Payment successful. Your course fee is now paid.");
                    } catch (verifyError) {
                        console.error("Razorpay verification failed:", verifyError);
                        setError(verifyError?.response?.data?.detail || "Payment verification failed. Please contact support.");
                    } finally {
                        setPayingRegistrationId(null);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setPayingRegistrationId(null);
                    },
                },
            });

            checkout.on("payment.failed", (response) => {
                console.error("Payment failed:", response);
                setError(response?.error?.description || "Payment failed. Please try again.");
                setPayingRegistrationId(null);
            });

            checkout.open();
        } catch (err) {
            console.error("Failed to initiate Razorpay payment:", err);
            setError(err?.response?.data?.detail || err?.message || "Could not start payment.");
            setPayingRegistrationId(null);
        }
    };

    const buyCourse = async () => {
        if (!course || !userId) return;
        if (!gatewayConfig.configured) {
            setError("Online payments are not configured. Please contact support.");
            return;
        }

        setError("");
        setSaving(true);
        setIsBuying(true);

        try {
            await api.post(`/courses/${course.id}/registrations`, {
                owner_id: Number(userId),
                member_id: null,
                participant_name: userName || "Active Member",
                participant_email: userEmail,
                participant_phone: userPhone || "",
                payment_status: "unpaid",
                notes: "Purchased via course profile",
            });

            const [courseRes, registrationsRes] = await Promise.all([
                api.get(`/courses/${id}`, { params: { owner_id: userId } }),
                api.get(`/courses/${id}/registrations`, { params: { owner_id: userId } }),
            ]);

            setCourse(courseRes.data);
            setRegistrations(registrationsRes.data || []);

            const newRegistration = (registrationsRes.data || []).find(
                (r) => r.participant_email?.toLowerCase() === userEmail?.toLowerCase()
            );

            if (newRegistration) {
                await payCourseFee(newRegistration);
            } else {
                setError("Registration created, but we could not locate your enrollment to pay for it.");
            }
        } catch (err) {
            console.error("Failed to buy course:", err);
            setError(err?.response?.data?.detail || "Could not start course purchase.");
        } finally {
            setSaving(false);
            setIsBuying(false);
        }
    };

    const registerParticipant = async (event) => {
        event.preventDefault();
        setError("");

        if (!course) return;
        if (!registrationForm.member_id && !registrationForm.participant_name.trim()) {
            setError("Choose a member or enter a participant name.");
            return;
        }

        setSaving(true);
        try {
            await api.post(`/courses/${course.id}/registrations`, {
                ...registrationForm,
                owner_id: Number(userId),
                member_id: registrationForm.member_id ? Number(registrationForm.member_id) : null,
                participant_name: registrationForm.participant_name.trim() || null,
                participant_email: registrationForm.participant_email.trim() || null,
                participant_phone: registrationForm.participant_phone.trim() || null,
                payment_status: "unpaid",
                notes: registrationForm.notes.trim() || null,
            });
            setShowRegisterModal(false);
            setRegistrationForm(emptyRegistration);
            // Reload registrations and course data
            const [courseRes, registrationsRes] = await Promise.all([
                api.get(`/courses/${id}`, { params: { owner_id: userId } }),
                api.get(`/courses/${id}/registrations`, { params: { owner_id: userId } })
            ]);
            setCourse(courseRes.data);
            setRegistrations(registrationsRes.data || []);
        } catch (err) {
            console.error("Failed to register participant:", err);
            setError(err?.response?.data?.detail || "Could not register this participant.");
        } finally {
            setSaving(false);
        }
    };

    const handleSelfRegister = async () => {
        if (!course) return;
        setError("");
        setSaving(true);
        try {
            await api.post(`/courses/${course.id}/registrations`, {
                owner_id: Number(userId),
                member_id: null,
                participant_name: userName || "Active Member",
                participant_email: userEmail,
                participant_phone: userPhone || "",
                payment_status: "unpaid",
                notes: "Self-registered via Member Dashboard",
            });
            alert(`Congratulations! You have successfully registered for ${course.title}!`);
            // Reload data
            const [courseRes, registrationsRes] = await Promise.all([
                api.get(`/courses/${id}`, { params: { owner_id: userId } }),
                api.get(`/courses/${id}/registrations`, { params: { owner_id: userId } })
            ]);
            setCourse(courseRes.data);
            setRegistrations(registrationsRes.data || []);
        } catch (err) {
            console.error("Failed to self-register:", err);
            alert(err?.response?.data?.detail || "Could not complete registration.");
        } finally {
            setSaving(false);
        }
    };

    const updateRegistration = async (registration, patch) => {
        if (!userId) return;
        try {
            await api.put(`/course-registrations/${registration.id}`, patch, {
                params: { owner_id: userId },
            });
            // Reload data
            const [courseRes, registrationsRes] = await Promise.all([
                api.get(`/courses/${id}`, { params: { owner_id: userId } }),
                api.get(`/courses/${id}/registrations`, { params: { owner_id: userId } })
            ]);
            setCourse(courseRes.data);
            setRegistrations(registrationsRes.data || []);
        } catch (err) {
            console.error("Failed to update registration:", err);
            setError("Could not update this registration.");
        }
    };

    const deleteCourse = async () => {
        if (!userId || !confirm("Delete this course and its registrations?")) return;
        try {
            await api.delete(`/courses/${id}`, { params: { owner_id: userId } });
            router.push("/dashboard/courses");
        } catch (err) {
            console.error("Failed to delete course:", err);
            setError("Could not delete this course.");
        }
    };

    if (loading) {
        return (
            <div className="courses-page" style={{ padding: "24px" }}>
                <div className="courses-empty">Loading course details...</div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="courses-page" style={{ padding: "24px" }}>
                <button className="courses-secondary-btn" onClick={() => router.push("/dashboard/courses")} style={{ alignSelf: "flex-start", marginBottom: "16px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <ArrowLeft size={16} /> Back to Courses
                </button>
                <div className="courses-error">{error || "Course not found"}</div>
            </div>
        );
    }

    return (
        <div className="courses-page" style={{ padding: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <button className="courses-secondary-btn" onClick={() => router.push("/dashboard/courses")} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <ArrowLeft size={16} /> Back to Courses
                </button>

                {error && <div className="courses-error">{error}</div>}

                <div className="course-detail">
                    <div className="course-detail-top">
                        <div>
                            <span className="courses-kicker">{course.group_name || "Whole club"}</span>
                            <h2>{course.title}</h2>
                            <p>{course.description || "No description added."}</p>
                        </div>
                        <div className="course-detail-actions">
                            {isMember ? (
                                myRegistration ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <span style={{ 
                                            display: "inline-flex", 
                                            alignItems: "center", 
                                            gap: "6px", 
                                            background: isRegistrationPaid ? "#dcfce7" : "#fef3c7", 
                                            color: isRegistrationPaid ? "#16a34a" : "#d97706", 
                                            fontWeight: "700", 
                                            padding: "10px 20px", 
                                            borderRadius: "12px", 
                                            fontSize: "14px" 
                                        }}>
                                            {isRegistrationPaid ? <Check size={16} /> : <X size={16} />} {isRegistrationPaid ? "Registered" : "Unregistered"}
                                        </span>
                                        {!isRegistrationPaid && Number(course.fee || 0) > 0 && (
                                            <button
                                                className="courses-primary-btn course-buy-btn"
                                                disabled={payingRegistrationId === myRegistration.id}
                                                onClick={() => payCourseFee(myRegistration)}
                                            >
                                                <CreditCard size={16} />
                                                {payingRegistrationId === myRegistration.id ? "Opening Razorpay..." : "Buy Course"}
                                            </button>
                                        )}
                                    </div>
                                ) : course.status === "full" ? (
                                    <span style={{ 
                                        display: "inline-flex", 
                                        alignItems: "center", 
                                        background: "#fee2e2", 
                                        color: "#ef4444", 
                                        fontWeight: "700", 
                                        padding: "10px 20px", 
                                        borderRadius: "12px", 
                                        fontSize: "14px" 
                                    }}>
                                        Course Full
                                    </span>
                                ) : course.status !== "open" ? (
                                    <span style={{ 
                                        display: "inline-flex", 
                                        alignItems: "center", 
                                        background: "#f1f5f9", 
                                        color: "#64748b", 
                                        fontWeight: "700", 
                                        padding: "10px 20px", 
                                        borderRadius: "12px", 
                                        fontSize: "14px" 
                                    }}>
                                        Closed
                                    </span>
                                ) : Number(course.fee || 0) > 0 ? (
                                    <button className="courses-primary-btn course-buy-btn" onClick={buyCourse} disabled={saving || isBuying}>
                                        <CreditCard size={16} />
                                        {isBuying ? "Opening Razorpay..." : "Buy Course"}
                                    </button>
                                ) : (
                                    <button className="courses-primary-btn" onClick={handleSelfRegister} disabled={saving}>
                                        <UserPlus size={16} />
                                        Confirm Registration
                                    </button>
                                )
                            ) : (
                                <button className="courses-icon-btn danger" onClick={deleteCourse}>
                                    <Trash2 size={17} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="course-detail-grid">
                        <div><span>Instructor</span><strong>{course.instructor || "Not assigned"}</strong></div>
                        <div><span>Schedule</span><strong>{course.schedule || "Not scheduled"}</strong></div>
                        <div><span>Dates</span><strong>{dateText(course.start_date)} - {dateText(course.end_date)}</strong></div>
                        <div><span>Seats Left</span><strong>{course.available_seats}</strong></div>
                    </div>

                    {/* Secure Registration Panels */}
                    {isMember ? (
                        <div className="registrations-panel" style={{ background: "#f8fafc", padding: "24px", borderRadius: "20px", border: "1px solid #e2e8f0", marginTop: "24px" }}>
                            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#1e293b", fontWeight: "800" }}>Your Enrollment Status</h3>
                            <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#64748b" }}>Manage your registration and payment status for this cricket batch.</p>
                            
                            {myRegistration ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "white", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                        <div>
                                            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Registration Status</span>
                                            <strong style={{ display: "block", fontSize: "14px", color: isRegistrationPaid ? "#16a34a" : "#d97706", marginTop: "3px" }}>
                                                {isRegistrationPaid ? "Registered & Confirmed" : "Unregistered"}
                                            </strong>
                                        </div>
                                        <span style={{ 
                                            fontSize: "12px", 
                                            fontWeight: "700", 
                                            padding: "6px 14px", 
                                            background: isRegistrationPaid ? "#dcfce7" : "#fef3c7", 
                                            color: isRegistrationPaid ? "#16a34a" : "#d97706", 
                                            borderRadius: "20px" 
                                        }}>
                                            {isRegistrationPaid ? "ACTIVE" : "UNREGISTERED"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "white", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                        <div>
                                            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Fee Payment Status</span>
                                            <strong style={{ display: "block", fontSize: "14px", color: myRegistration.payment_status === "paid" ? "#16a34a" : "#d97706", marginTop: "3px" }}>
                                                {myRegistration.payment_status === "paid" ? "Paid" : "Pending Payment / Unpaid"}
                                            </strong>
                                        </div>
                                        <span style={{ 
                                            fontSize: "12px", 
                                            fontWeight: "700", 
                                            padding: "6px 14px", 
                                            background: myRegistration.payment_status === "paid" ? "#dcfce7" : "#fef3c7", 
                                            color: myRegistration.payment_status === "paid" ? "#16a34a" : "#d97706", 
                                            borderRadius: "20px" 
                                        }}>
                                            {myRegistration.payment_status.toUpperCase()}
                                        </span>
                                    </div>
                                    {myRegistration.notes && (
                                        <div style={{ padding: "14px 18px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #e2e8f0", fontSize: "13px", color: "#64748b" }}>
                                            <strong>Note:</strong> {myRegistration.notes}
                                        </div>
                                    )}

                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "30px 10px" }}>
                                    <p style={{ margin: "0", fontSize: "13px", color: "#64748b" }}>You are not enrolled in this course yet. Use the button at the top of the page to enroll.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="registrations-panel">
                            <div className="registrations-head">
                                <h3>Registrations ({registrations.length})</h3>
                            </div>
                            {registrations.length > 0 ? (
                                <div className="registrations-list">
                                    {registrations.map((registration) => (
                                        <div className="registration-row" key={registration.id}>
                                            <div>
                                                <strong>{registration.participant_name}</strong>
                                                <span>{registration.participant_email || "No email"} · {statusLabels[registration.status] || registration.status}</span>
                                            </div>
                                            <div className="registration-actions">
                                                <span className={`mini-pill ${registration.payment_status}`}>
                                                    {statusLabels[registration.payment_status] || registration.payment_status}
                                                </span>
                                                {registration.status !== "cancelled" && (
                                                    <button className="courses-icon-btn" onClick={() => updateRegistration(registration, { status: "cancelled" })}>
                                                        <X size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="courses-empty compact">No registrations for this course yet.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showRegisterModal && (
                <div className="courses-modal-backdrop">
                    <form className="courses-modal narrow" onSubmit={registerParticipant}>
                        <div className="courses-modal-head">
                            <div>
                                <h2>Register Participant</h2>
                                <p>{course.title}</p>
                            </div>
                            <button type="button" className="courses-icon-btn" onClick={() => setShowRegisterModal(false)}><X size={18} /></button>
                        </div>
                        <div className="courses-form-grid single">
                            <label>Existing Member<select value={registrationForm.member_id} onChange={(e) => updateRegistrationField("member_id", e.target.value)}><option value="">Register by name instead</option>{memberOptions.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name} - {member.group_name}</option>)}</select></label>
                            <label>Participant Name<input value={registrationForm.participant_name} onChange={(e) => updateRegistrationField("participant_name", e.target.value)} placeholder="Required for non-members" disabled={Boolean(registrationForm.member_id)} /></label>
                            <label>Email<input value={registrationForm.participant_email} onChange={(e) => updateRegistrationField("participant_email", e.target.value)} placeholder="participant@example.com" disabled={Boolean(registrationForm.member_id)} /></label>
                            <label>Phone<input value={registrationForm.participant_phone} onChange={(e) => updateRegistrationField("participant_phone", e.target.value)} placeholder="Phone number" disabled={Boolean(registrationForm.member_id)} /></label>
                            <label>Payment<input value="Unpaid until member pays online" disabled /></label>
                            <label>Notes<textarea value={registrationForm.notes} onChange={(e) => updateRegistrationField("notes", e.target.value)} placeholder="Optional registration note" /></label>
                        </div>
                        <div className="courses-modal-actions">
                            <button type="button" className="courses-secondary-btn" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                            <button type="submit" className="courses-primary-btn" disabled={saving}>{saving ? "Registering..." : "Register"}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
