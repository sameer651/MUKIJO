"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import "../../../styles/fundraising-new.css";

export default function NewCampaignPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        title: "",
        goal: "",
        description: "",
        deadline: "",
        group: "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.goal) return;

        const userId = localStorage.getItem("userId");
        if (!userId) {
            alert("Please log in first");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("http://127.0.0.1:8001/fundraising", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    group_name: form.group,
                    owner_id: parseInt(userId),
                    goal: parseInt(form.goal)
                })
            });

            if (res.ok) {
                router.push("/dashboard/fundraising");
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to create campaign");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Could not connect to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="new-campaign-page">
            <div className="new-campaign-header">
                <Link href="/dashboard/fundraising" className="back-link">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                    Back to Fundraising
                </Link>
                <h1 className="page-title">New Campaign</h1>
                <p className="page-subtitle">Set up a fundraising goal for your club.</p>
            </div>

            <div className="campaign-form-card">
                <div className="card-accent" />
                <form onSubmit={handleSubmit} className="campaign-form">
                    <div>
                        <label className="form-label">Campaign Title *</label>
                        <input className="form-input" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Summer Tournament Fund" required />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                        <div>
                            <label className="form-label">Goal Amount (INR) *</label>
                            <input className="form-input" name="goal" type="number" value={form.goal} onChange={handleChange} placeholder="50000" required min="1" />
                        </div>
                        <div>
                            <label className="form-label">Deadline</label>
                            <input className="form-input" name="deadline" type="date" value={form.deadline} onChange={handleChange} />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Group (optional)</label>
                        <input className="form-input" name="group" value={form.group} onChange={handleChange} placeholder="e.g. Weekend Warriors" />
                    </div>

                    <div>
                        <label className="form-label">Description</label>
                        <textarea className="form-input" name="description" value={form.description} onChange={handleChange} placeholder="What is this campaign for?" rows={5} style={{ resize: "vertical", minHeight: "120px" }} />
                    </div>

                    <div className="form-actions">
                        <Link href="/dashboard/fundraising" className="cancel-link">
                            Cancel
                        </Link>
                        <button type="submit" disabled={loading} className="submit-btn">
                            {loading ? "Launching..." : "Launch Campaign"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
