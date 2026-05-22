"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../../fundraising.css";
import "../../../../styles/fundraising-donate.css";

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

async function getErrorMessage(response, fallback) {
    try {
        const data = await response.json();
        return data.detail || data.message || fallback;
    } catch {
        return fallback;
    }
}

export default function DonationFormPage() {
    const { id } = useParams();
    const router = useRouter();
    const [campaign, setCampaign] = useState(null);
    const [form, setForm] = useState({
        amount: "",
        donor_name: "",
        donor_email: "",
        group_id: "",
    });
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

    useEffect(() => {
        if (typeof window !== "undefined") {
            const userName = localStorage.getItem("userName") || "";
            const userEmail = localStorage.getItem("userEmail") || "";
            setForm(p => ({
                ...p,
                donor_name: p.donor_name || userName,
                donor_email: p.donor_email || userEmail
            }));
        }
    }, []);

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8001/fundraising?owner_id=${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    const found = data.find(c => c.id === parseInt(id));
                    setCampaign(found);
                }
            } catch (err) {
                console.error(err);
            }
        };
        const fetchGroups = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8001/groups?owner_id=${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    setGroups(data);
                }
            } catch (err) {
                console.error("Error fetching groups:", err);
            }
        };
        if (userId) {
            fetchCampaign();
            fetchGroups();
        }
    }, [id, userId]);

    const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.amount || parseInt(form.amount) <= 0) return;
        if (!userId) {
            alert("Session error. Please log in again.");
            return;
        }

        setLoading(true);
        try {
            // 1. Initiate temporary Payment record
            const initiateRes = await fetch(`http://127.0.0.1:8001/fundraising/${id}/initiate-donation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: parseInt(form.amount),
                    donor_name: form.donor_name || "Anonymous",
                    donor_email: form.donor_email || "",
                    group_id: form.group_id ? parseInt(form.group_id) : null
                })
            });

            if (!initiateRes.ok) {
                alert(await getErrorMessage(initiateRes, "Failed to initiate donation session"));
                setLoading(false);
                return;
            }

            const { payment_id, owner_id } = await initiateRes.json();

            // 2. Load Razorpay Checkout library
            await loadRazorpayCheckout();

            // 3. Create Razorpay order
            const orderRes = await fetch("http://127.0.0.1:8001/payments/razorpay/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payment_id: payment_id,
                    owner_id: owner_id
                })
            });

            if (!orderRes.ok) {
                alert(await getErrorMessage(orderRes, "Failed to create Secure Razorpay Transaction order"));
                setLoading(false);
                return;
            }

            const order = await orderRes.json();

            // 4. Open secure Razorpay checkout modal
            const checkout = new window.Razorpay({
                key: order.key_id,
                amount: order.amount,
                currency: order.currency,
                name: order.name || "Mukijo Club",
                description: order.description || `Donation to: ${campaign.title}`,
                order_id: order.razorpay_order_id,
                prefill: {
                    name: form.donor_name || "",
                    email: form.donor_email || "",
                },
                theme: {
                    color: "#2563eb",
                },
                handler: async (response) => {
                    setLoading(true);
                    try {
                        // 5. Verify transaction signature
                        const verifyRes = await fetch("http://127.0.0.1:8001/payments/razorpay/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                payment_id: payment_id,
                                owner_id: owner_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            })
                        });

                        if (!verifyRes.ok) {
                            alert(await getErrorMessage(verifyRes, "Payment verification failed."));
                            setLoading(false);
                            return;
                        }

                        // 6. Complete and register campaign donation
                        const completeRes = await fetch(`http://127.0.0.1:8001/fundraising/${id}/complete-donation`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                payment_id: payment_id,
                                owner_id: owner_id
                            })
                        });

                        if (completeRes.ok) {
                            alert("Thank you so much for your premium donation!");
                            router.push("/dashboard/fundraising");
                        } else {
                            alert(await getErrorMessage(completeRes, "Failed to finalize donation in system. Please contact club support."));
                        }
                    } catch (err) {
                        console.error(err);
                        alert("Network verification error occurred.");
                    } finally {
                        setLoading(false);
                    }
                },
                modal: {
                    ondismiss: () => setLoading(false),
                },
            });

            checkout.on("payment.failed", (response) => {
                setLoading(false);
                alert(response?.error?.description || "Payment failed. Please try again.");
            });

            checkout.open();
        } catch (err) {
            console.error(err);
            alert("An error occurred while launching Razorpay secure payment flow.");
            setLoading(false);
        }
    };

    if (!campaign) return <div className="loading-state" style={{ padding: "40px", textAlign: "center" }}>Loading campaign...</div>;

    return (
        <div className="donation-page">
            <div className="donation-header">
                <Link href="/dashboard/fundraising" className="back-to-campaigns">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                    Back to Campaigns
                </Link>
                <h1 className="support-title">Support: {campaign.title}</h1>
                <p className="support-subtitle">Every contribution makes a difference for our club.</p>
            </div>

            <div className="donation-form-card">
                <div className="card-accent" />
                <form onSubmit={handleSubmit} className="donation-form">
                    <div>
                        <label className="form-label">Donation Amount (INR) *</label>
                        <div className="amount-input-wrapper">
                            <span className="currency-prefix">Rs.</span>
                            <input className="form-input amount-input" name="amount" type="number" value={form.amount} onChange={handleChange} placeholder="500" required min="1" />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Your Name (Optional)</label>
                        <input className="form-input" name="donor_name" value={form.donor_name} onChange={handleChange} placeholder="John Doe" />
                    </div>

                    <div>
                        <label className="form-label">Email Address (Optional)</label>
                        <input className="form-input" name="donor_email" type="email" value={form.donor_email} onChange={handleChange} placeholder="john@example.com" />
                    </div>

                    <div>
                        <label className="form-label">Select Group</label>
                        <select className="form-input" name="group_id" value={form.group_id} onChange={handleChange} style={{ width: "100%", background: "#fff", cursor: "pointer", height: "46px", appearance: "auto" }}>
                            <option value="">No Group / General Club</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.group_name} ({g.activity})</option>
                            ))}
                        </select>
                    </div>

                    <div className="progress-summary">
                        <div className="summary-row">
                            <span className="summary-label">Campaign Goal:</span>
                            <span className="summary-value">Rs. {campaign.goal.toLocaleString()}</span>
                        </div>
                        <div className="summary-row">
                            <span className="summary-label">Current Progress:</span>
                            <span className="summary-value progress">{campaign.goal > 0 ? Math.round((campaign.raised / campaign.goal) * 100) : 0}%</span>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="donate-submit-btn">
                        {loading ? "Processing Secure Payment..." : "Complete donation"}
                    </button>
                </form>
            </div>
        </div>
    );
}
