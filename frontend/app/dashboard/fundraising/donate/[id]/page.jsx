"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../../fundraising.css";
import "../../../../styles/fundraising-donate.css";

export default function DonationFormPage() {
    const { id } = useParams();
    const router = useRouter();
    const [campaign, setCampaign] = useState(null);
    const [form, setForm] = useState({
        amount: "",
        donor_name: "",
        donor_email: "",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                const userId = localStorage.getItem("userId");
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
        fetchCampaign();
    }, [id]);

    const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.amount || parseInt(form.amount) <= 0) return;

        setLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8001/fundraising/${id}/donate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: parseInt(form.amount),
                    donor_name: form.donor_name || "Anonymous",
                    donor_email: form.donor_email || ""
                })
            });

            if (res.ok) {
                alert("Thank you for your donation!");
                router.push("/dashboard/fundraising");
            } else {
                alert("Failed to process donation");
            }
        } catch {
            alert("Connection error");
        } finally {
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

                    <div className="progress-summary">
                        <div className="summary-row">
                            <span className="summary-label">Campaign Goal:</span>
                            <span className="summary-value">Rs. {campaign.goal.toLocaleString()}</span>
                        </div>
                        <div className="summary-row">
                            <span className="summary-label">Current Progress:</span>
                            <span className="summary-value progress">{Math.round((campaign.raised / campaign.goal) * 100)}%</span>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="donate-submit-btn">
                        {loading ? "Processing..." : "Complete Donation"}
                    </button>
                </form>
            </div>
        </div>
    );
}
