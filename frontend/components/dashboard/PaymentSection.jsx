"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Banknote,
    CalendarClock,
    Check,
    CircleDollarSign,
    Clock3,
    CreditCard,
    Loader2,
    MoreVertical,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";
import api from "../../lib/api";
import "../../app/styles/payment-section.css";

const emptyForm = {
    title: "",
    amount: "",
    category: "Membership Fee",
    due_date: "",
    group_id: "",
    member_id: "",
    description: "",
    status: "pending",
};

const statusMeta = {
    pending: { label: "Pending", tone: "amber" },
    paid: { label: "Paid", tone: "green" },
    overdue: { label: "Overdue", tone: "red" },
    cancelled: { label: "Cancelled", tone: "slate" },
};

function formatMoney(value) {
    return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
    if (!value) return "No due date";
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function loadRazorpayCheckout() {
    if (typeof window === "undefined") return Promise.reject(new Error("Checkout is not available."));
    if (window.Razorpay) return Promise.resolve();

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
}

export default function PaymentSection() {
    const [payments, setPayments] = useState([]);
    const [summary, setSummary] = useState(null);
    const [gatewayConfig, setGatewayConfig] = useState(null);
    const [groups, setGroups] = useState([]);
    const [members, setMembers] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [payingId, setPayingId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [error, setError] = useState("");

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

    const loadPayments = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            const [paymentsRes, summaryRes, groupsRes, membersRes, gatewayRes] = await Promise.all([
                api.get("/payments"),
                api.get("/payments/summary"),
                api.get("/groups"),
                api.get("/members"),
                api.get("/payments/razorpay/config"),
            ]);

            setPayments(paymentsRes.data || []);
            setSummary(summaryRes.data || null);
            setGroups(groupsRes.data || []);
            setMembers(membersRes.data || []);
            setGatewayConfig(gatewayRes.data || null);
        } catch (err) {
            console.error("Failed to load payments:", err);
            setError("Could not load payment records.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadPayments();
    }, [loadPayments]);

    const filteredMembers = useMemo(() => {
        if (!form.group_id) return members;
        return members.filter((member) => String(member.group_id) === String(form.group_id));
    }, [form.group_id, members]);

    const visiblePayments = useMemo(() => {
        const q = search.trim().toLowerCase();

        return payments.filter((payment) => {
            const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
            const haystack = [
                payment.title,
                payment.category,
                payment.group_name,
                payment.member_name,
                payment.description,
                payment.status,
            ].join(" ").toLowerCase();
            return matchesStatus && (!q || haystack.includes(q));
        });
    }, [payments, search, statusFilter]);

    const stats = [
        {
            label: "Collected",
            value: formatMoney(summary?.total_collected),
            note: `${summary?.paid_count || 0} paid`,
            icon: <CircleDollarSign size={20} />,
        },
        {
            label: "Pending",
            value: formatMoney(summary?.pending_amount),
            note: `${summary?.pending_count || 0} requests`,
            icon: <Clock3 size={20} />,
        },
        {
            label: "Overdue",
            value: formatMoney(summary?.overdue_amount),
            note: `${summary?.overdue_count || 0} needs attention`,
            icon: <CalendarClock size={20} />,
        },
    ];

    const updateForm = (field, value) => {
        setForm((current) => {
            const next = { ...current, [field]: value };
            if (field === "group_id") next.member_id = "";
            return next;
        });
    };

    const resetModal = () => {
        setForm(emptyForm);
        setError("");
        setShowModal(false);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!form.title.trim() || !form.amount || Number(form.amount) <= 0) {
            setError("Add a title and an amount greater than zero.");
            return;
        }

        setSaving(true);
        try {
            await api.post("/payments", {
                ...form,
                title: form.title.trim(),
                amount: Number(form.amount),
                group_id: form.group_id ? Number(form.group_id) : null,
                member_id: form.member_id ? Number(form.member_id) : null,
                due_date: form.due_date || null,
                description: form.description.trim() || null,
            });
            resetModal();
            await loadPayments();
        } catch (err) {
            console.error("Failed to create payment:", err);
            setError(err?.response?.data?.detail || "Could not create this payment request.");
        } finally {
            setSaving(false);
        }
    };

    const payWithRazorpay = async (payment) => {
        if (!userId) return;
        setError("");
        setOpenMenuId(null);
        setPayingId(payment.id);

        try {
            await loadRazorpayCheckout();
            const orderRes = await api.post("/payments/razorpay/order", {
                payment_id: payment.id,
            });
            const order = orderRes.data;

            const checkout = new window.Razorpay({
                key: order.key_id,
                amount: order.amount,
                currency: order.currency,
                name: order.name || "Mukijo Club",
                description: order.description || payment.title,
                order_id: order.razorpay_order_id,
                prefill: {
                    name: order.prefill_name || "",
                    email: order.prefill_email || "",
                    contact: order.prefill_contact || "",
                },
                notes: {
                    local_payment_id: String(payment.id),
                },
                theme: {
                    color: "#2563eb",
                },
                handler: async (response) => {
                    try {
                        await api.post("/payments/razorpay/verify", {
                            payment_id: payment.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        await loadPayments();
                    } catch (err) {
                        console.error("Failed to verify payment:", err);
                        setError(err?.response?.data?.detail || "Payment was not verified.");
                    } finally {
                        setPayingId(null);
                    }
                },
                modal: {
                    ondismiss: () => setPayingId(null),
                },
            });

            checkout.on("payment.failed", (response) => {
                setPayingId(null);
                setError(response?.error?.description || "Payment failed. Please try again.");
            });

            checkout.open();
        } catch (err) {
            console.error("Failed to start Razorpay checkout:", err);
            setPayingId(null);
            setError(err?.response?.data?.detail || err?.message || "Could not start Razorpay checkout.");
        }
    };

    const updatePaymentStatus = async (payment, status) => {
        if (!userId) return;

        const payload = { status };
        if (status === "paid") {
            payload.payment_method = payment.payment_method || "Cash";
            payload.paid_at = new Date().toISOString().slice(0, 10);
        }

        try {
            await api.put(`/payments/${payment.id}`, payload, { params: { owner_id: userId } });
            setOpenMenuId(null);
            await loadPayments();
        } catch (err) {
            console.error("Failed to update payment:", err);
            setError("Could not update this payment.");
        }
    };

    const deletePayment = async (paymentId) => {
        if (!userId || !confirm("Delete this payment request?")) return;

        try {
            await api.delete(`/payments/${paymentId}`, { params: { owner_id: userId } });
            setOpenMenuId(null);
            await loadPayments();
        } catch (err) {
            console.error("Failed to delete payment:", err);
            setError("Could not delete this payment.");
        }
    };

    return (
        <section className="payment-section">
            <div className="payment-header">
                <div>
                    <span className="payment-eyebrow">Payments & Fees</span>
                    <h2>Collect, track, and close club dues</h2>
                </div>
                <button className="payment-primary-btn" onClick={() => setShowModal(true)}>
                    <Plus size={16} />
                    Request Payment
                </button>
            </div>

            <div className="payment-stats">
                {stats.map((stat) => (
                    <div className="payment-stat" key={stat.label}>
                        <span className="payment-stat-icon">{stat.icon}</span>
                        <div>
                            <strong>{loading ? "..." : stat.value}</strong>
                            <span>{stat.label}</span>
                            <small>{stat.note}</small>
                        </div>
                    </div>
                ))}
            </div>

            <div className="payment-toolbar">
                <div className="payment-search">
                    <Search size={16} />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payments" />
                </div>
                <div className="payment-filters">
                    {["all", "pending", "paid", "overdue", "cancelled"].map((status) => (
                        <button
                            key={status}
                            className={statusFilter === status ? "active" : ""}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status === "all" ? "All" : statusMeta[status].label}
                        </button>
                    ))}
                </div>
            </div>

            {error && <div className="payment-error">{error}</div>}
            {gatewayConfig && !gatewayConfig.configured && (
                <div className="payment-gateway-alert">
                    Add Razorpay keys on the backend to enable online card, UPI, wallet, and netbanking payments.
                </div>
            )}

            {loading ? (
                <div className="payment-empty">Loading payments...</div>
            ) : visiblePayments.length > 0 ? (
                <div className="payment-table-wrap">
                    <table className="payment-table">
                        <thead>
                            <tr>
                                <th>Request</th>
                                <th>Target</th>
                                <th>Due</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {visiblePayments.map((payment) => {
                                const meta = statusMeta[payment.status] || statusMeta.pending;
                                return (
                                    <tr key={payment.id}>
                                        <td>
                                            <div className="payment-title-cell">
                                                <Banknote size={17} />
                                                <div>
                                                    <strong>{payment.title}</strong>
                                                    <span>{payment.category || "General"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="payment-target">
                                                <strong>{payment.member_name || payment.group_name || "Whole club"}</strong>
                                                {payment.member_name && payment.group_name && <span>{payment.group_name}</span>}
                                            </div>
                                        </td>
                                        <td>{formatDate(payment.due_date)}</td>
                                        <td className="payment-amount">{formatMoney(payment.amount)}</td>
                                        <td>
                                            <span className={`payment-status ${meta.tone}`}>{meta.label}</span>
                                        </td>
                                        <td className="payment-actions-cell">
                                            {payment.status !== "paid" && payment.status !== "cancelled" && (
                                                <button
                                                    className="payment-pay-btn"
                                                    onClick={() => payWithRazorpay(payment)}
                                                    disabled={!gatewayConfig?.configured || payingId === payment.id}
                                                >
                                                    {payingId === payment.id ? <Loader2 className="payment-spin" size={15} /> : <CreditCard size={15} />}
                                                    Pay
                                                </button>
                                            )}
                                            <button className="payment-icon-btn" onClick={() => setOpenMenuId(openMenuId === payment.id ? null : payment.id)}>
                                                <MoreVertical size={17} />
                                            </button>
                                            {openMenuId === payment.id && (
                                                <div className="payment-menu">
                                                    {payment.status !== "paid" && (
                                                        <>
                                                            <button onClick={() => payWithRazorpay(payment)} disabled={!gatewayConfig?.configured || payingId === payment.id}>
                                                                {payingId === payment.id ? <Loader2 className="payment-spin" size={15} /> : <CreditCard size={15} />}
                                                                Pay online
                                                            </button>
                                                            <button onClick={() => updatePaymentStatus(payment, "paid")}>
                                                                <Check size={15} />
                                                                Mark paid
                                                            </button>
                                                        </>
                                                    )}
                                                    {payment.status !== "cancelled" && (
                                                        <button onClick={() => updatePaymentStatus(payment, "cancelled")}>
                                                            <X size={15} />
                                                            Cancel
                                                        </button>
                                                    )}
                                                    <button className="danger" onClick={() => deletePayment(payment.id)}>
                                                        <Trash2 size={15} />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="payment-empty">
                    <CreditCard size={44} />
                    <h3>No payment requests</h3>
                    <p>Create a request for membership fees, event tickets, equipment dues, or any club collection.</p>
                    <button className="payment-primary-btn" onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        Create request
                    </button>
                </div>
            )}

            {showModal && (
                <div className="payment-modal-backdrop" role="presentation">
                    <form className="payment-modal" onSubmit={handleSubmit}>
                        <div className="payment-modal-head">
                            <div>
                                <h3>Request Payment</h3>
                                <p>Target the whole club, one group, or a specific member.</p>
                            </div>
                            <button type="button" className="payment-icon-btn" onClick={resetModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="payment-form-grid">
                            <label>
                                Title
                                <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Monthly membership fee" />
                            </label>
                            <label>
                                Amount
                                <input type="number" min="1" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} placeholder="1500" />
                            </label>
                            <label>
                                Category
                                <select value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                                    <option>Membership Fee</option>
                                    <option>Event Ticket</option>
                                    <option>Training Fee</option>
                                    <option>Equipment</option>
                                    <option>Other</option>
                                </select>
                            </label>
                            <label>
                                Due Date
                                <input type="date" value={form.due_date} onChange={(event) => updateForm("due_date", event.target.value)} />
                            </label>
                            <label>
                                Group
                                <select value={form.group_id} onChange={(event) => updateForm("group_id", event.target.value)}>
                                    <option value="">Whole club</option>
                                    {groups.map((group) => (
                                        <option key={group.id} value={group.id}>{group.group_name}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Member
                                <select value={form.member_id} onChange={(event) => updateForm("member_id", event.target.value)}>
                                    <option value="">Any member</option>
                                    {filteredMembers.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.first_name} {member.last_name} {member.group_name ? `- ${member.group_name}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="payment-form-wide">
                                Note
                                <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Optional message for this payment request" />
                            </label>
                        </div>

                        {error && <div className="payment-error">{error}</div>}

                        <div className="payment-modal-actions">
                            <button type="button" className="payment-secondary-btn" onClick={resetModal}>Cancel</button>
                            <button type="submit" className="payment-primary-btn" disabled={saving}>
                                {saving ? "Saving..." : "Create Request"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}
