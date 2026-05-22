"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./fundraising.css";

function pct(raised, goal) {
    if (!goal || goal <= 0) return 0;
    return Math.min(100, Math.round((raised / goal) * 100));
}

function daysLeft(deadline) {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return d > 0 ? d : 0;
}

function fmt(n) {
    return `Rs. ${Number(n).toLocaleString("en-IN")}`;
}

const STATUS_COLORS = {
    active: { bg: "#dcfce7", text: "#16a34a", label: "Active" },
    paused: { bg: "#fef9c3", text: "#ca8a04", label: "Paused" },
    completed: { bg: "#ede9fe", text: "#7c3aed", label: "Completed" },
};

function CampaignCard({ c, onDelete }) {
    const progress = pct(c.raised, c.goal);
    const days = daysLeft(c.deadline);
    const sc = STATUS_COLORS[c.status] || STATUS_COLORS.active;
    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;

    return (
        <div className="campaign-card">
            <div style={{ height: "4px", background: "#f1f5f9" }} />

            <div style={{ padding: "24px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div style={{ flex: 1, marginRight: "12px" }}>
                        <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: "700", color: "#0f172a", lineHeight: "1.3" }}>{c.title}</h3>
                        {c.group_name && <span style={{ fontSize: "12px", color: "#64748b" }}>{c.group_name}</span>}
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", background: sc.bg, color: sc.text, flexShrink: 0 }}>{sc.label}</span>
                </div>

                {c.description && (
                    <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6", margin: "0 0 18px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</p>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px" }}>
                    <div>
                        <div style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px", lineHeight: 1 }}>{fmt(c.raised)}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>raised of {fmt(c.goal)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "28px", fontWeight: "800", color: "#3b82f6", lineHeight: 1 }}>{progress}%</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>{c.donors_count || 0} donors</div>
                    </div>
                </div>

                <div className="campaign-progress-bg">
                    <div style={{ height: "100%", width: `${progress}%`, background: "#3b82f6", borderRadius: "99px", transition: "width 0.8s ease" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        {days !== null ? (days === 0 ? "Deadline today" : `${days} days left`) : "No deadline"}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <Link href={`/dashboard/fundraising/donate/${c.id}`} className="btn-donate">
                            Donate
                        </Link>
                        {!isMember && (
                            <button onClick={() => onDelete(c.id)} className="btn-delete">
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function FundraisingPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;

    const fetchCampaigns = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        try {
            const res = await fetch(`http://127.0.0.1:8001/fundraising?owner_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data);
            }
        } catch (error) {
            console.error("Error fetching campaigns:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm("Delete this campaign?")) return;
        const userId = localStorage.getItem("userId");
        
        try {
            const res = await fetch(`http://127.0.0.1:8001/fundraising/${id}?owner_id=${userId}`, {
                method: "DELETE"
            });
            if (res.ok) fetchCampaigns();
        } catch {
            alert("Failed to delete campaign");
        }
    };

    const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);
    const totalRaised = campaigns.reduce((s, c) => s + Number(c.raised || 0), 0);
    const totalGoal = campaigns.reduce((s, c) => s + Number(c.goal || 0), 0);
    const activeCnt = campaigns.filter(c => c.status === "active").length;

    return (
        <div className="fr-container">
            <div className="fr-header">
                <div>
                    <h1 className="fr-title">Fundraising</h1>
                    <p className="fr-subtitle">{isMember ? "Support your sports academy campaigns and track total club contributions" : "Manage campaigns and track money raised for your club"}</p>
                </div>
                <div className="fr-header-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div className="fr-filter-tabs" style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
                        {["all", "active", "paused", "completed"].map(f => (
                            <button 
                                key={f} 
                                onClick={() => setFilter(f)}
                                style={{ 
                                    border: "none", 
                                    background: filter === f ? "#fff" : "transparent", 
                                    color: filter === f ? "#0f172a" : "#64748b",
                                    boxShadow: filter === f ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                    borderRadius: "7px", padding: "6px 12px", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all .2s"
                                }}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    {!isMember && (
                        <Link href="/dashboard/fundraising/new" className="btn-primary">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            New Campaign
                        </Link>
                    )}
                </div>
            </div>

            <div className="stats-grid">
                { [
                    { label: "Total Raised", value: fmt(totalRaised), sub: `of ${fmt(totalGoal)} goal`, icon: "Rs", color: "#3b82f6" },
                    { label: "Active Campaigns", value: activeCnt, sub: `${campaigns.length} total`, icon: "AC", color: "#64748b" },
                    { label: "Overall Progress", value: `${pct(totalRaised, totalGoal)}%`, sub: "towards all goals", icon: "%", color: "#10b981" },
                ].map((s) => (
                    <div key={s.label} className="stats-card">
                        <div className="stats-card-accent" />
                        <div style={{ fontSize: "18px", marginBottom: "10px", color: s.color, fontWeight: "800" }}>{s.icon}</div>
                        <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginTop: "6px" }}>{s.label}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: "24px" }}>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>
                    {filtered.length} Campaign{filtered.length !== 1 ? "s" : ""}
                </h2>
            </div>

            {loading ? (
                <div style={{ padding: "80px 40px", textAlign: "center", background: "#fff", borderRadius: "20px", border: "2px dashed #e2e8f0" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>Loading campaigns...</h3>
                </div>
            ) : filtered.length > 0 ? (
                <div className="campaign-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "24px" }}>
                    {filtered.map((c) => (
                        <CampaignCard key={c.id} c={c} onDelete={handleDelete} />
                    ))}
                </div>
            ) : (
                <div style={{ padding: "80px 40px", textAlign: "center", background: "#fff", borderRadius: "20px", border: "2px dashed #e2e8f0" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>No campaigns yet</h3>
                    <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#64748b" }}>
                        {isMember ? "There are currently no active fundraising campaigns scheduled. Check back soon!" : "Launch your first fundraising campaign today."}
                    </p>
                    {!isMember && <Link href="/dashboard/fundraising/new" className="btn-primary">+ Create First Campaign</Link>}
                </div>
            )}
        </div>
    );
}
