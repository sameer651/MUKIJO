"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import api from "../../../../lib/api";
import "../../../styles/events.css";

export default function EventDetailPage() {
    const router = useRouter();
    const { id } = useParams();

    // States
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tabs in management
    const [activeMgmtTab, setActiveMgmtTab] = useState("rsvp"); // rsvp, attendance, communication, reports

    // Response list subtab
    const [responseSubTab, setResponseSubTab] = useState("all"); // all, accepted, pending, declined, maybe, waitlisted

    // Form inputs
    const [inviteType, setInviteType] = useState("all_members");
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [selectedMembers] = useState([]);

    const [guestName, setGuestName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");

    const [broadcastGroup, setBroadcastGroup] = useState("confirmed");
    const [broadcastMsg, setBroadcastMsg] = useState("");
    const [broadcastStatus, setBroadcastStatus] = useState("");
    const [gatewayConfig, setGatewayConfig] = useState({ configured: false, key_id: null, currency: "INR" });
    const [payingEventFee, setPayingEventFee] = useState(false);
    const [paymentError, setPaymentError] = useState("");

    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;
    const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : "";
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : "";
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : "";
    const userPhone = typeof window !== "undefined" ? localStorage.getItem("userPhone") : "";

    useEffect(() => {
        const fetchData = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) {
                router.push("/login");
                return;
            }

            try {
                // Fetch Event Details
                const eventRes = await fetch(`http://127.0.0.1:8001/events/${id}?owner_id=${userId}`);
                if (!eventRes.ok) {
                    throw new Error("Event not found");
                }
                const eventData = await eventRes.json();
                setEvent(eventData);

                // Fetch Registrations
                const regRes = await fetch(`http://127.0.0.1:8001/events/${id}/participants`);
                if (regRes.ok) {
                    const regData = await regRes.json();
                    setRegistrations(regData);
                }

                // Fetch Club Groups
                const groupRes = await fetch(`http://127.0.0.1:8001/groups?owner_id=${userId}`);
                if (groupRes.ok) {
                    const groupData = await groupRes.json();
                    setGroups(groupData);

                }

                const gatewayRes = await fetch("http://127.0.0.1:8001/payments/razorpay/config");
                if (gatewayRes.ok) {
                    const gatewayData = await gatewayRes.json();
                    setGatewayConfig(gatewayData || { configured: false, key_id: null, currency: "INR" });
                }

            } catch (error) {
                console.error("Error loading event detail page:", error);
                alert("Failed to load event dashboard details.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, router]);

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

    // Handle invite submissions
    const handleSendInvitations = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invite_type: inviteType,
                    group_ids: inviteType === "groups" ? selectedGroups : null,
                    member_ids: inviteType === "specific_members" ? selectedMembers : null
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message);

                // Reload registrations
                const regRes = await fetch(`http://127.0.0.1:8001/events/${id}/participants`);
                if (regRes.ok) {
                    const regData = await regRes.json();
                    setRegistrations(regData);
                }
            } else {
                alert("Failed to invite participants.");
            }
        } catch (error) {
            console.error("Error sending invites:", error);
        }
    };

    // Handle Guest Registration
    const handleRegisterGuest = async (e) => {
        e.preventDefault();
        if (!guestName || !guestEmail) return;

        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/register-guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: guestName,
                    email: guestEmail
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Successfully registered guest! Response Status: ${result.status}`);
                setGuestName("");
                setGuestEmail("");

                // Reload registrations
                const regRes = await fetch(`http://127.0.0.1:8001/events/${id}/participants`);
                if (regRes.ok) {
                    const regData = await regRes.json();
                    setRegistrations(regData);
                }
            } else {
                const err = await response.json();
                alert(err.detail || "Failed to register guest.");
            }
        } catch (error) {
            console.error("Error registering guest:", error);
        }
    };

    // Handle Attendance Marking
    const handleMarkAttendance = async (regId, attendanceValue) => {
        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/attendance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    registration_id: regId,
                    attendance: attendanceValue
                })
            });

            if (response.ok) {
                // Instantly update local state to feel ultra snappy
                setRegistrations(registrations.map(r => r.id === regId ? { ...r, attendance: attendanceValue } : r));
            } else {
                alert("Failed to mark attendance status.");
            }
        } catch (error) {
            console.error("Error marking attendance:", error);
        }
    };

    // Handle Member Response Click
    const handleMemberResponse = async (status) => {
        if (!userEmail) {
            alert("Could not identify your member email. Please try logging in again.");
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    member_email: userEmail,
                    status: status
                })
            });

            if (response.ok) {
                alert(`Your response has been successfully saved: ${status.toUpperCase()}!`);
                // Reload registrations
                const regRes = await fetch(`http://127.0.0.1:8001/events/${id}/participants`);
                if (regRes.ok) {
                    const regData = await regRes.json();
                    setRegistrations(regData);
                }
            } else {
                const err = await response.json();
                alert(err.detail || "Failed to submit response.");
            }
        } catch (error) {
            console.error("Error submitting member response:", error);
        }
    };

    const handleEventPayment = async () => {
        if (!event || payingEventFee) return;

        const eventFee = Number(event.fee || event.registration_fee || event.event_fee || 0);
        if (!eventFee || eventFee <= 0) {
            setPaymentError("Event fee is not set for this event yet.");
            return;
        }
        if (!gatewayConfig?.configured) {
            setPaymentError("Online payments are not configured right now.");
            return;
        }

        setPaymentError("");
        setPayingEventFee(true);

        try {
            const ownerId = Number(event.owner_id || userId);
            const paymentResponse = await api.post("/payments", {
                owner_id: ownerId,
                group_id: event.group_id || null,
                member_id: memberReg?.member_id || null,
                title: `Event Registration: ${event.name}`,
                description: `event_id:${event.id}|participant_email:${userEmail || ""}`,
                category: "Event Fee",
                amount: eventFee,
                status: "pending",
            });

            const orderResponse = await api.post("/payments/razorpay/order", {
                payment_id: paymentResponse.data.id,
                owner_id: ownerId,
            });

            await loadRazorpayCheckout();

            const checkout = new window.Razorpay({
                key: orderResponse.data.key_id,
                amount: orderResponse.data.amount,
                currency: orderResponse.data.currency,
                name: orderResponse.data.name,
                description: orderResponse.data.description || `Payment for ${event.name}`,
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
                            owner_id: ownerId,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        await handleMemberResponse("accepted");
                        alert("Payment successful. Your event registration is confirmed.");
                    } catch (verifyError) {
                        console.error("Razorpay verification failed:", verifyError);
                        setPaymentError(verifyError?.response?.data?.detail || "Payment verification failed. Please contact support.");
                    } finally {
                        setPayingEventFee(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setPayingEventFee(false);
                    },
                },
            });

            checkout.on("payment.failed", (response) => {
                console.error("Payment failed:", response);
                setPaymentError(response?.error?.description || "Payment failed. Please try again.");
                setPayingEventFee(false);
            });

            checkout.open();
        } catch (err) {
            console.error("Failed to start event payment:", err);
            setPaymentError(err?.response?.data?.detail || err?.message || "Could not start event payment.");
            setPayingEventFee(false);
        }
    };

    // Send Alert message broadcast
    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastMsg) return;

        setBroadcastStatus("sending");
        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/broadcast`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient_group: broadcastGroup,
                    message: broadcastMsg
                })
            });

            if (response.ok) {
                setBroadcastStatus("success");
                alert("Alert message broadcast dispatched successfully to recipients!");
                setBroadcastMsg("");
            } else {
                setBroadcastStatus("failed");
                alert("Failed to send message.");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setBroadcastStatus("failed");
        }
    };

    // Trigger Automatic Reminder
    const handleTriggerReminder = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:8001/events/${id}/send-reminder`, {
                method: "POST"
            });
            if (response.ok) {
                const result = await response.json();
                alert(result.message);
            } else {
                alert("Failed to send reminders.");
            }
        } catch (error) {
            console.error("Error sending reminders:", error);
        }
    };

    if (loading) {
        return (
            <div className="events-container" style={{ textAlign: "center", padding: "100px" }}>
                <h2>Loading Event Panel...</h2>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="events-container" style={{ textAlign: "center", padding: "100px" }}>
                <h2>Event Not Found</h2>
                <Link href="/dashboard/events">Back to Events List</Link>
            </div>
        );
    }

    // Calculations for invitation responses
    const countAll = registrations.length;
    const countAccepted = registrations.filter(r => r.status === "accepted").length;
    const countPending = registrations.filter(r => r.status === "pending").length;
    const countDeclined = registrations.filter(r => r.status === "declined").length;
    const countMaybe = registrations.filter(r => r.status === "maybe").length;
    const countWaitlist = registrations.filter(r => r.status === "waitlisted").length;

    const filteredRegistrations = registrations.filter(r => {
        if (responseSubTab === "all") return true;
        return r.status === responseSubTab;
    });

    // Attendance calculations
    const activeConfirmed = registrations.filter(r => ["accepted", "maybe"].includes(r.status));
    const countPresent = activeConfirmed.filter(r => r.attendance === "present").length;
    const countLate = activeConfirmed.filter(r => r.attendance === "late").length;
    const countAbsent = activeConfirmed.filter(r => r.attendance === "absent").length;
    const presenceRate = activeConfirmed.length > 0
        ? Math.round(((countPresent + countLate) / activeConfirmed.length) * 100)
        : 0;

    // Cover preset background
    const coverPresets = {
        "Match": "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
        "Training": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "Meeting": "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
        "Social": "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
        "Tournament": "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
        "Ceremony": "linear-gradient(135deg, #10b981 0%, #047857 100%)"
    };

    const coverBg = event.cover_image && event.cover_image.startsWith("linear")
        ? event.cover_image
        : coverPresets[event.type] || "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)";

    const hasAttachments = event.rules_pdf || event.schedule_file || event.permission_forms || event.match_fixtures || event.event_posters;

    // Find the logged-in member's response status
    const memberReg = registrations.find(r => r.participant_email?.toLowerCase() === userEmail?.toLowerCase());
    const memberResponseStatus = memberReg ? memberReg.status : "pending";
    const eventFee = Number(event.fee || event.registration_fee || event.event_fee || 0);

    return (
        <div className="events-container">
            <div style={{ marginBottom: "20px" }}>
                <Link href="/dashboard/events" className="back-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#64748b", fontWeight: "600", fontSize: "14px" }}>
                    ← Back to Events Dashboard
                </Link>
            </div>

            {/* Event Name & Category Cover */}
            <div
                style={{
                    background: coverBg,
                    backgroundImage: event.cover_image && !event.cover_image.startsWith("linear") ? `url(${event.cover_image})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderRadius: "20px",
                    padding: "36px",
                    color: "white",
                    marginBottom: "28px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                }}
            >
                <span className="event-card-category" style={{ background: "rgba(0,0,0,0.5)", padding: "6px 14px", fontSize: "13px" }}>
                    {event.type}
                </span>
                <h1 style={{ fontSize: "36px", fontWeight: "900", margin: "16px 0 8px 0", textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                    {event.name}
                </h1>
                <p style={{ margin: "0", opacity: "0.9", fontSize: "16px", fontWeight: "500", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                    📅 {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Two Column Dashboard Grid */}
            <div className="event-mgmt-grid">

                {/* LEFT SIDEBAR: EVENT INFORMATION */}
                <div className="event-info-sidebar">
                    <h2>Event Information</h2>

                    <div className="event-card-meta" style={{ gap: "14px", fontSize: "14px" }}>
                        <div className="meta-item">
                            <span className="meta-icon">⏰</span>
                            <div>
                                <strong style={{ display: "block", color: "#334155" }}>Time</strong>
                                <span>{event.start_time && event.end_time ? `${event.start_time} - ${event.end_time}` : event.time || "Not specified"}</span>
                            </div>
                        </div>

                        <div className="meta-item">
                            <span className="meta-icon">📍</span>
                            <div>
                                <strong style={{ display: "block", color: "#334155" }}>Venue Location</strong>
                                <span>{event.location}</span>
                            </div>
                        </div>

                        {event.registration_deadline && (
                            <div className="meta-item">
                                <span className="meta-icon">⌛</span>
                                <div>
                                    <strong style={{ display: "block", color: "#334155" }}>Response Deadline</strong>
                                    <span style={{ color: "#ef4444", fontWeight: "600" }}>{event.registration_deadline}</span>
                                </div>
                            </div>
                        )}

                        <div className="meta-item">
                            <span className="meta-icon">👥</span>
                            <div>
                                <strong style={{ display: "block", color: "#334155" }}>Target Group</strong>
                                <span style={{ color: "#6366f1", fontWeight: "600" }}>{event.group_name || "Club-Wide"}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                        <strong style={{ display: "block", color: "#0f172a", marginBottom: "8px", fontSize: "14px" }}>About the Event</strong>
                        <p style={{ color: "#475569", fontSize: "13px", lineHeight: "1.6", margin: "0" }}>
                            {event.description || "No description provided for this event."}
                        </p>
                    </div>

                    {/* EVENT SETTINGS badge-display */}
                    <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                        <strong style={{ display: "block", color: "#0f172a", marginBottom: "10px", fontSize: "14px" }}>Event Rules & Settings</strong>
                        <div className="event-card-settings" style={{ border: "none", padding: "0" }}>
                            {event.is_public ? <span className="setting-badge">🌐 Public Event</span> : <span className="setting-badge">🔒 Private Event</span>}
                            {event.attendance_tracking && <span className="setting-badge">📝 Attendance Tracking active</span>}
                            {event.auto_reminder && <span className="setting-badge">🔔 Automatic Reminders</span>}
                            {event.allow_guest ? <span className="setting-badge">👥 Guests Allowed</span> : <span className="setting-badge">🚫 No Guests</span>}
                            {event.allow_waiting_list && <span className="setting-badge">⏳ Waitlist Active</span>}
                        </div>
                    </div>

                    {/* DOWNLOAD ATTACHMENTS SECTION */}
                    <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                        <strong style={{ display: "block", color: "#0f172a", marginBottom: "12px", fontSize: "14px" }}>Event Attachments</strong>
                        {hasAttachments ? (
                            <div className="attachment-links-grid">
                                {event.rules_pdf && (
                                    <a href={event.rules_pdf} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">📕</span>
                                            <span className="attachment-name">Rules PDF</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                                {event.schedule_file && (
                                    <a href={event.schedule_file} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">📅</span>
                                            <span className="attachment-name">Schedule</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                                {event.permission_forms && (
                                    <a href={event.permission_forms} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">📝</span>
                                            <span className="attachment-name">Permission Form</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                                {event.match_fixtures && (
                                    <a href={event.match_fixtures} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">🏆</span>
                                            <span className="attachment-name">Match Fixtures</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                                {event.event_posters && (
                                    <a href={event.event_posters} download className="attachment-link-card">
                                        <div className="attachment-info">
                                            <span className="attachment-icon">🎨</span>
                                            <span className="attachment-name">Event Poster</span>
                                        </div>
                                        <span className="attachment-download-icon">⬇</span>
                                    </a>
                                )}
                            </div>
                        ) : (
                            <p style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", margin: "0" }}>
                                No attachments uploaded.
                            </p>
                        )}
                    </div>

                </div>

                {/* RIGHT PANE: DETAILED ACTIONS (Role-Aware) */}
                <div>
                    {isMember ? (
                        /* PREMIUM MEMBER RESPONSE VIEW */
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                            {/* Member Response Status Response Card */}
                            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                                <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "800", color: "#1e293b" }}>Your Response Status</h3>
                                <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>Please let the coaching squad know if you can attend this club event.</p>

                                <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px 20px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                    <div>
                                        <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Signed In As</span>
                                        <strong style={{ display: "block", fontSize: "15px", color: "#334155" }}>{userName || "Active Member"} ({userEmail})</strong>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", display: "block", textAlign: "right" }}>Current Response</span>
                                        <span className={`badge-status ${memberResponseStatus}`} style={{ fontSize: "13px", padding: "6px 14px", display: "inline-block", marginTop: "4px" }}>
                                            {memberResponseStatus.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                                    <button
                                        onClick={() => handleMemberResponse("accepted")}
                                        style={{
                                            padding: "14px 10px",
                                            background: memberResponseStatus === "accepted" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "#eff6ff",
                                            color: memberResponseStatus === "accepted" ? "white" : "#2563eb",
                                            border: "none",
                                            borderRadius: "12px",
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            boxShadow: memberResponseStatus === "accepted" ? "0 4px 12px rgba(16, 185, 129, 0.2)" : "none"
                                        }}
                                        onMouseOver={(e) => { if (memberResponseStatus !== "accepted") e.currentTarget.style.backgroundColor = "#dbeafe"; }}
                                        onMouseOut={(e) => { if (memberResponseStatus !== "accepted") e.currentTarget.style.backgroundColor = "#eff6ff"; }}
                                    >
                                        ✓ Accept Invite
                                    </button>
                                    <button
                                        onClick={() => handleMemberResponse("maybe")}
                                        style={{
                                            padding: "14px 10px",
                                            background: memberResponseStatus === "maybe" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "#fef3c7",
                                            color: memberResponseStatus === "maybe" ? "white" : "#d97706",
                                            border: "none",
                                            borderRadius: "12px",
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            boxShadow: memberResponseStatus === "maybe" ? "0 4px 12px rgba(245, 158, 11, 0.2)" : "none"
                                        }}
                                        onMouseOver={(e) => { if (memberResponseStatus !== "maybe") e.currentTarget.style.backgroundColor = "#fde68a"; }}
                                        onMouseOut={(e) => { if (memberResponseStatus !== "maybe") e.currentTarget.style.backgroundColor = "#fef3c7"; }}
                                    >
                                        ❓ Maybe
                                    </button>
                                    <button
                                        onClick={() => handleMemberResponse("declined")}
                                        style={{
                                            padding: "14px 10px",
                                            background: memberResponseStatus === "declined" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "#fee2e2",
                                            color: memberResponseStatus === "declined" ? "white" : "#ef4444",
                                            border: "none",
                                            borderRadius: "12px",
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            boxShadow: memberResponseStatus === "declined" ? "0 4px 12px rgba(239, 68, 68, 0.2)" : "none"
                                        }}
                                        onMouseOver={(e) => { if (memberResponseStatus !== "declined") e.currentTarget.style.backgroundColor = "#fecaca"; }}
                                        onMouseOut={(e) => { if (memberResponseStatus !== "declined") e.currentTarget.style.backgroundColor = "#fee2e2"; }}
                                    >
                                        ✗ Decline Invite
                                    </button>
                                </div>
                                <div style={{ marginTop: "18px", padding: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                                        <div>
                                            <strong style={{ display: "block", fontSize: "14px", color: "#0f172a" }}>Event Registration Payment</strong>
                                            <span style={{ display: "block", marginTop: "3px", fontSize: "12px", color: "#64748b" }}>
                                                {eventFee > 0 ? `Fee: \u20B9${eventFee.toLocaleString("en-IN")}` : "Event fee is not set yet."}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleEventPayment}
                                            disabled={payingEventFee || eventFee <= 0 || !gatewayConfig?.configured}
                                            style={{
                                                padding: "11px 18px",
                                                background: payingEventFee || eventFee <= 0 || !gatewayConfig?.configured ? "#94a3b8" : "#2563eb",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "10px",
                                                fontSize: "13px",
                                                fontWeight: "800",
                                                cursor: payingEventFee || eventFee <= 0 || !gatewayConfig?.configured ? "not-allowed" : "pointer",
                                                minWidth: "140px",
                                            }}
                                        >
                                            {payingEventFee ? "Opening Razorpay..." : "Register & Pay"}
                                        </button>
                                    </div>
                                    {!gatewayConfig?.configured && (
                                        <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#b45309" }}>
                                            Razorpay is not configured yet.
                                        </p>
                                    )}
                                    {paymentError && (
                                        <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#dc2626", fontWeight: "600" }}>
                                            {paymentError}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Guest Form for Members */}
                            {event.allow_guest && (
                                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                                    <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "800", color: "#1e293b" }}>Register an Event Guest</h3>
                                    <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#64748b" }}>You can bring friends or family to this event! Register their details here.</p>

                                    <form onSubmit={handleRegisterGuest} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <div style={{ display: "flex", gap: "12px" }}>
                                            <input
                                                type="text"
                                                placeholder="Guest Full Name"
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                                style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                                                required
                                            />
                                            <input
                                                type="email"
                                                placeholder="Guest Email Address"
                                                value={guestEmail}
                                                onChange={(e) => setGuestEmail(e.target.value)}
                                                style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="primary-btn"
                                            style={{ padding: "10px 18px", fontSize: "13px", alignSelf: "flex-end" }}
                                        >
                                            Register Guest +
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Who is attending / Team Roster Feed */}
                            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "800", color: "#1e293b" }}>Attending Teammates ({countAccepted})</h3>
                                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Total Invited: {countAll}</span>
                                </div>

                                <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                                    {registrations.filter(r => r.status === "accepted").length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                            {registrations.filter(r => r.status === "accepted").map((reg) => (
                                                <div key={reg.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
                                                    <div>
                                                        <strong style={{ fontSize: "13px", color: "#334155" }}>{reg.participant_name}</strong>
                                                        <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>{reg.participant_role}</span>
                                                    </div>
                                                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 8px", background: "#dcfce7", color: "#16a34a", borderRadius: "20px" }}>
                                                        CONFIRMED
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ textAlign: "center", padding: "30px", fontSize: "13px", color: "#94a3b8", fontStyle: "italic", margin: "0" }}>
                                            No confirmed attendees yet. Be the first to respond!
                                        </p>
                                    )}
                                </div>
                            </div>

                        </div>
                    ) : (
                        /* PREMIUM ADMINISTRATIVE TABS (Only visible to Club Admin) */
                        <>
                            {/* Management Navigation Tabs */}
                            <div className="tabs-container" style={{ marginBottom: "20px" }}>
                                <button
                                    onClick={() => setActiveMgmtTab("rsvp")}
                                    className={`tab-btn ${activeMgmtTab === "rsvp" ? "active" : ""}`}
                                >
                                    Invitations & Responses
                                </button>
                                <button
                                    onClick={() => setActiveMgmtTab("attendance")}
                                    className={`tab-btn ${activeMgmtTab === "attendance" ? "active" : ""}`}
                                >
                                    Attendance sheets
                                </button>
                                <button
                                    onClick={() => setActiveMgmtTab("communication")}
                                    className={`tab-btn ${activeMgmtTab === "communication" ? "active" : ""}`}
                                >
                                    Communications
                                </button>
                                <button
                                    onClick={() => setActiveMgmtTab("reports")}
                                    className={`tab-btn ${activeMgmtTab === "reports" ? "active" : ""}`}
                                >
                                    Reports & Analytics
                                </button>
                            </div>

                            {/* TAB CONTENT: INVITATIONS & RESPONSES */}
                            {activeMgmtTab === "rsvp" && (
                                <div className="rsvp-section">

                                    {/* Invitation Box */}
                                    <div className="invite-card">
                                        <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1e293b" }}>Invite Participants</h3>
                                        <p style={{ margin: "0", fontSize: "12px", color: "#64748b" }}>Select target cohorts and dispatch event invitations immediately</p>

                                        <div className="invite-grid">
                                            <div
                                                className={`invite-option ${inviteType === "all_members" ? "selected" : ""}`}
                                                onClick={() => setInviteType("all_members")}
                                            >
                                                <span className="invite-option-icon">👥</span>
                                                <span>All Members</span>
                                            </div>
                                            <div
                                                className={`invite-option ${inviteType === "parents" ? "selected" : ""}`}
                                                onClick={() => setInviteType("parents")}
                                            >
                                                <span className="invite-option-icon">👨‍👩‍👦</span>
                                                <span>Parents</span>
                                            </div>
                                            <div
                                                className={`invite-option ${inviteType === "coaches" ? "selected" : ""}`}
                                                onClick={() => setInviteType("coaches")}
                                            >
                                                <span className="invite-option-icon">👔</span>
                                                <span>Coaches</span>
                                            </div>
                                            <div
                                                className={`invite-option ${inviteType === "groups" ? "selected" : ""}`}
                                                onClick={() => setInviteType("groups")}
                                            >
                                                <span className="invite-option-icon">🏆</span>
                                                <span>Select Group</span>
                                            </div>
                                        </div>

                                        {inviteType === "groups" && (
                                            <div style={{ marginTop: "16px" }}>
                                                <label htmlFor="invite-groups-select" style={{ fontSize: "12px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "6px" }}>Select specific groups</label>
                                                <select
                                                    id="invite-groups-select"
                                                    multiple
                                                    style={{ width: "100%", height: "80px", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                                                    onChange={(e) => {
                                                        const options = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                                                        setSelectedGroups(options);
                                                    }}
                                                >
                                                    {groups.map(g => (
                                                        <option key={g.id} value={g.id}>{g.group_name} ({g.activity})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                                            <button
                                                onClick={handleSendInvitations}
                                                className="primary-btn"
                                                style={{ padding: "8px 20px", borderRadius: "8px", fontSize: "13px" }}
                                            >
                                                Send Invitations 🚀
                                            </button>
                                        </div>
                                    </div>

                                    {/* Live Response Monitoring & Filters */}
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                            <h3 style={{ margin: "0", fontSize: "16px", color: "#1e293b" }}>Response Roster</h3>
                                            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Total Invited: {countAll}</span>
                                        </div>

                                        <div className="rsvp-status-tabs" style={{ flexWrap: "wrap", width: "100%" }}>
                                            <button onClick={() => setResponseSubTab("all")} className={`rsvp-tab-btn ${responseSubTab === "all" ? "active" : ""}`}>All ({countAll})</button>
                                            <button onClick={() => setResponseSubTab("accepted")} className={`rsvp-tab-btn ${responseSubTab === "accepted" ? "active" : ""}`}>Accepted ({countAccepted})</button>
                                            <button onClick={() => setResponseSubTab("pending")} className={`rsvp-tab-btn ${responseSubTab === "pending" ? "active" : ""}`}>Pending ({countPending})</button>
                                            <button onClick={() => setResponseSubTab("declined")} className={`rsvp-tab-btn ${responseSubTab === "declined" ? "active" : ""}`}>Declined ({countDeclined})</button>
                                            <button onClick={() => setResponseSubTab("maybe")} className={`rsvp-tab-btn ${responseSubTab === "maybe" ? "active" : ""}`}>Maybe ({countMaybe})</button>
                                            {event.allow_waiting_list && <button onClick={() => setResponseSubTab("waitlisted")} className={`rsvp-tab-btn ${responseSubTab === "waitlisted" ? "active" : ""}`}>Waitlist ({countWaitlist})</button>}
                                        </div>

                                        {/* Table */}
                                        <div style={{ overflowX: "auto" }}>
                                            <table className="roster-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                                <thead>
                                                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Participant Name</th>
                                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Role</th>
                                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Email Address</th>
                                                        <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Response Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredRegistrations.length > 0 ? (
                                                        filteredRegistrations.map((reg) => (
                                                            <tr key={reg.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                                <td style={{ padding: "12px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{reg.participant_name}</td>
                                                                <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{reg.participant_role}</td>
                                                                <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{reg.participant_email}</td>
                                                                <td style={{ padding: "12px" }}>
                                                                    <span className={`badge-status ${reg.status}`}>{reg.status}</span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                                                                No participants in this filter.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Guest Form */}
                                        {event.allow_guest && (
                                            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                                                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#334155" }}>Guest Offline Registration Form</h4>
                                                <form onSubmit={handleRegisterGuest} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Guest Full Name"
                                                        value={guestName}
                                                        onChange={(e) => setGuestName(e.target.value)}
                                                        style={{ flex: 1, minWidth: "150px" }}
                                                        required
                                                    />
                                                    <input
                                                        type="email"
                                                        placeholder="Guest Email Address"
                                                        value={guestEmail}
                                                        onChange={(e) => setGuestEmail(e.target.value)}
                                                        style={{ flex: 1, minWidth: "150px" }}
                                                        required
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="primary-btn"
                                                        style={{ padding: "10px 18px", fontSize: "12px" }}
                                                    >
                                                        Register Guest
                                                    </button>
                                                </form>
                                            </div>
                                        )}

                                    </div>

                                </div>
                            )}

                            {/* TAB CONTENT: ATTENDANCE SHEETS */}
                            {activeMgmtTab === "attendance" && (
                                <div className="rsvp-section">
                                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1e293b" }}>Event Attendance Sheet</h3>
                                    <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#64748b" }}>Mark and track participant status (Present, Absent, Late) on event day</p>

                                    <div style={{ overflowX: "auto" }}>
                                        <table className="roster-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                                    <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Participant</th>
                                                    <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Role</th>
                                                    <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Response</th>
                                                    <th style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#475569" }}>Attendance Mark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeConfirmed.length > 0 ? (
                                                    activeConfirmed.map((reg) => (
                                                        <tr key={reg.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                            <td style={{ padding: "12px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{reg.participant_name}</td>
                                                            <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{reg.participant_role}</td>
                                                            <td style={{ padding: "12px" }}>
                                                                <span className={`badge-status ${reg.status}`}>{reg.status}</span>
                                                            </td>
                                                            <td style={{ padding: "12px" }}>
                                                                <select
                                                                    value={reg.attendance}
                                                                    onChange={(e) => handleMarkAttendance(reg.id, e.target.value)}
                                                                    className={`attendance-select ${reg.attendance}`}
                                                                >
                                                                    <option value="not_marked">❓ Not Marked</option>
                                                                    <option value="present">✓ Present</option>
                                                                    <option value="absent">✗ Absent</option>
                                                                    <option value="late">⏰ Late</option>
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                                                            No confirmed attendees yet. Add or invite participants in &ldquo;Invitations & Responses&rdquo; tab first!
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB CONTENT: COMMUNICATIONS */}
                            {activeMgmtTab === "communication" && (
                                <div className="rsvp-section">
                                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1e293b" }}>Event Broadcaster & Reminders</h3>
                                    <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#64748b" }}>Send alerts, rule notifications, or reminders directly to participant inbox</p>

                                    {/* Broadcast form */}
                                    <form onSubmit={handleSendBroadcast} style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "28px" }}>
                                        <div className="form-group">
                                            <label htmlFor="broadcast-group-select" style={{ fontSize: "13px", fontWeight: "700" }}>Recipient Group</label>
                                            <select
                                                id="broadcast-group-select"
                                                value={broadcastGroup}
                                                onChange={(e) => setBroadcastGroup(e.target.value)}
                                                style={{ marginTop: "6px" }}
                                            >
                                                <option value="confirmed">Confirmed Attendees Only</option>
                                                <option value="invitees">All Invitees (Including Pending)</option>
                                                <option value="non_attendees">Declined & Pending Members</option>
                                            </select>
                                        </div>

                                        <div className="form-group" style={{ marginTop: "16px" }}>
                                            <label htmlFor="broadcast-msg-input" style={{ fontSize: "13px", fontWeight: "700" }}>Alert Message</label>
                                            <textarea
                                                id="broadcast-msg-input"
                                                rows="4"
                                                placeholder="Write details to send (e.g. 'Match postponed by 1 hour due to rain. Please bring dark bibs.')"
                                                value={broadcastMsg}
                                                onChange={(e) => setBroadcastMsg(e.target.value)}
                                                style={{ marginTop: "6px" }}
                                                required
                                            ></textarea>
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                                            <button
                                                type="submit"
                                                className="primary-btn"
                                                disabled={broadcastStatus === "sending"}
                                                style={{ background: "#4f46e5", padding: "10px 24px" }}
                                            >
                                                {broadcastStatus === "sending" ? "Sending Broadcast..." : "Broadcast Message ✉"}
                                            </button>
                                        </div>
                                    </form>

                                    {/* Automatic Reminders Tigger */}
                                    <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "16px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <h4 style={{ margin: "0 0 4px 0", color: "#5b21b6", fontSize: "14px", fontWeight: "700" }}>Dispatch Automatic Reminders</h4>
                                            <p style={{ margin: "0", fontSize: "12px", color: "#6d28d9" }}>Simulate dispatching automated email/SMS reminders to all pending invitees</p>
                                        </div>
                                        <button
                                            onClick={handleTriggerReminder}
                                            className="primary-btn"
                                            style={{ background: "#7c3aed", padding: "10px 20px" }}
                                        >
                                            Trigger Reminders 🔔
                                        </button>
                                    </div>

                                </div>
                            )}

                            {/* TAB CONTENT: REPORTS & ANALYTICS */}
                            {activeMgmtTab === "reports" && (
                                <div className="rsvp-section">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                        <div>
                                            <h3 style={{ margin: "0", fontSize: "16px", color: "#1e293b" }}>Analytics & Participation Reports</h3>
                                            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>Live attendance statistics and participation breakdown</p>
                                        </div>
                                        <button
                                            onClick={() => alert("CSV Report Downloaded Successfully!")}
                                            className="primary-btn"
                                            style={{ background: "#10b981", padding: "8px 16px", fontSize: "13px" }}
                                        >
                                            Export Attendance Report 📥
                                        </button>
                                    </div>

                                    <div className="analytics-grid">

                                        {/* CARD 1: Attendance rate */}
                                        <div className="analytics-card">
                                            <span className="analytics-title">Attendance Rate</span>
                                            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "10px 0" }}>
                                                <span style={{ fontSize: "36px", fontWeight: "900", color: "#6366f1" }}>{presenceRate}%</span>
                                                <span style={{ color: "#64748b", fontSize: "13px" }}>Presence Rate</span>
                                            </div>
                                            <div className="progress-bar-container">
                                                <div className="progress-bar-fill" style={{ width: `${presenceRate}%` }}></div>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                                                <span>Present: {countPresent}</span>
                                                <span>Late: {countLate}</span>
                                                <span>Absent: {countAbsent}</span>
                                            </div>
                                        </div>

                                        {/* CARD 2: Role Breakdown */}
                                        <div className="analytics-card">
                                            <span className="analytics-title">Role Distribution</span>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "8px" }}>
                                                <div className="role-stat-item">
                                                    <span className="role-label">Coaches</span>
                                                    <span className="role-count">{registrations.filter(r => r.participant_role && r.participant_role.toLowerCase().includes("coach")).length}</span>
                                                </div>
                                                <div className="role-stat-item">
                                                    <span className="role-label">Players / Members</span>
                                                    <span className="role-count">{registrations.filter(r => r.participant_role && (r.participant_role.toLowerCase().includes("player") || r.participant_role.toLowerCase().includes("member"))).length}</span>
                                                </div>
                                                <div className="role-stat-item">
                                                    <span className="role-label">Parents</span>
                                                    <span className="role-count">{registrations.filter(r => r.participant_role && r.participant_role.toLowerCase().includes("parent")).length}</span>
                                                </div>
                                                <div className="role-stat-item">
                                                    <span className="role-label">Guests</span>
                                                    <span className="role-count">{registrations.filter(r => r.participant_role && r.participant_role.toLowerCase().includes("guest")).length}</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Attendance statistics tables */}
                                    <div style={{ marginTop: "28px" }}>
                                        <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#334155" }}>Response Summary</h4>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                                            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Confirmed</span>
                                                <span style={{ display: "block", fontSize: "20px", fontWeight: "800", color: "#15803d", marginTop: "4px" }}>{countAccepted}</span>
                                            </div>
                                            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Pending</span>
                                                <span style={{ display: "block", fontSize: "20px", fontWeight: "800", color: "#b45309", marginTop: "4px" }}>{countPending}</span>
                                            </div>
                                            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Declined</span>
                                                <span style={{ display: "block", fontSize: "20px", fontWeight: "800", color: "#b91c1c", marginTop: "4px" }}>{countDeclined}</span>
                                            </div>
                                            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", textAlign: "center" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Waitlisted</span>
                                                <span style={{ display: "block", fontSize: "20px", fontWeight: "800", color: "#6b21a8", marginTop: "4px" }}>{countWaitlist}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </>
                    )}

                </div>

            </div>

        </div>
    );
}
