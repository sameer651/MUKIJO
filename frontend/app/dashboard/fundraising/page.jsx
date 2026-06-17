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
    active: { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", label: "Active", border: "rgba(16,185,129,0.3)" },
    paused: { bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24", label: "Paused", border: "rgba(245,158,11,0.3)" },
    completed: { bg: "rgba(139, 92, 246, 0.15)", text: "#a78bfa", label: "Completed", border: "rgba(139,92,246,0.3)" },
};

function CampaignCard({ c, onDelete }) {
    const progress = pct(c.raised, c.goal);
    const days = daysLeft(c.deadline);
    const sc = STATUS_COLORS[c.status] || STATUS_COLORS.active;
    const isMember = typeof window !== "undefined" ? localStorage.getItem("isMember") === "true" : false;

    return (
        <div className="campaign-card">
            {/* Color-coded top accent bar */}
            <div style={{
                height: "3px",
                background: c.status === "active"
                    ? "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)"
                    : c.status === "paused"
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : "linear-gradient(90deg, #8b5cf6, #a78bfa)"
            }} />

            <div style={{ padding: "24px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div style={{ flex: 1, marginRight: "12px" }}>
                        <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: "700", color: "#f1f5f9", lineHeight: "1.3" }}>{c.title}</h3>
                        {c.group_name && <span style={{ fontSize: "12px", color: "rgba(148,163,184,0.55)" }}>{c.group_name}</span>}
                    </div>
                    <span style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        background: sc.bg,
                        color: sc.text,
                        border: `1px solid ${sc.border}`,
                        flexShrink: 0,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em"
                    }}>{sc.label}</span>
                </div>

                {c.description && (
                    <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.6)", lineHeight: "1.6", margin: "0 0 18px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</p>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px" }}>
                    <div>
                        <div style={{ fontSize: "24px", fontWeight: "800", color: "#f1f5f9", letterSpacing: "-0.5px", lineHeight: 1 }}>{fmt(c.raised)}</div>
                        <div style={{ fontSize: "12px", color: "rgba(148,163,184,0.45)", marginTop: "3px" }}>raised of {fmt(c.goal)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "26px", fontWeight: "800", color: "#818cf8", lineHeight: 1 }}>{progress}%</div>
                        <div style={{ fontSize: "12px", color: "rgba(148,163,184,0.45)", marginTop: "3px" }}>{c.donors_count || 0} donors</div>
                    </div>
                </div>

                <div className="campaign-progress-bg">
                    <div style={{
                        height: "100%",
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)",
                        borderRadius: "99px",
                        transition: "width 0.8s ease",
                        boxShadow: "0 0 8px rgba(99,102,241,0.4)"
                    }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "rgba(148,163,184,0.4)" }}>
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
                    <div className="fr-filter-tabs" style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "4px", borderRadius: "10px" }}>
                        {["all", "active", "paused", "completed"].map(f => (
                            <button 
                                key={f} 
                                onClick={() => setFilter(f)}
                                style={{ 
                                    border: "none", 
                                    background: filter === f ? "rgba(99,102,241,0.2)" : "transparent", 
                                    color: filter === f ? "#a5b4fc" : "rgba(148,163,184,0.55)",
                                    boxShadow: filter === f ? "0 0 12px rgba(99,102,241,0.15)" : "none",
                                    borderRadius: "7px", padding: "6px 14px", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all .2s",
                                    fontFamily: "'Outfit', sans-serif"
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
                    { label: "Total Raised", value: fmt(totalRaised), sub: `of ${fmt(totalGoal)} goal`, icon: "₹", color: "#818cf8", accent: "linear-gradient(90deg, #6366f1, #8b5cf6)" },
                    { label: "Active Campaigns", value: activeCnt, sub: `${campaigns.length} total`, icon: "◈", color: "#67e8f9", accent: "linear-gradient(90deg, #06b6d4, #67e8f9)" },
                    { label: "Overall Progress", value: `${pct(totalRaised, totalGoal)}%`, sub: "towards all goals", icon: "▲", color: "#34d399", accent: "linear-gradient(90deg, #10b981, #34d399)" },
                ].map((s) => (
                    <div key={s.label} className="stats-card">
                        <div className="stats-card-accent" style={{ background: s.accent }} />
                        <div style={{ fontSize: "20px", marginBottom: "10px", color: s.color, fontWeight: "800", filter: `drop-shadow(0 0 8px ${s.color}60)` }}>{s.icon}</div>
                        <div style={{ fontSize: "32px", fontWeight: "800", color: "#f1f5f9", letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "rgba(241,245,249,0.7)", marginTop: "6px" }}>{s.label}</div>
                        <div style={{ fontSize: "12px", color: "rgba(148,163,184,0.45)", marginTop: "2px" }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: "24px" }}>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#f1f5f9" }}>
                    {filtered.length} Campaign{filtered.length !== 1 ? "s" : ""}
                </h2>
            </div>

            {loading ? (
                <div style={{ padding: "80px 40px", textAlign: "center", background: "rgba(15,15,26,0.85)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", backdropFilter: "blur(12px)" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "700", color: "#f1f5f9" }}>Loading campaigns...</h3>
                </div>
            ) : filtered.length > 0 ? (
                <div className="campaign-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "24px" }}>
                    {filtered.map((c) => (
                        <CampaignCard key={c.id} c={c} onDelete={handleDelete} />
                    ))}
                </div>
            ) : (
                <div style={{ padding: "80px 40px", textAlign: "center", background: "rgba(15,15,26,0.85)", border: "1.5px dashed rgba(255,255,255,0.08)", borderRadius: "20px", backdropFilter: "blur(12px)" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "700", color: "#f1f5f9" }}>No campaigns yet</h3>
                    <p style={{ margin: "0 0 28px", fontSize: "14px", color: "rgba(148,163,184,0.55)" }}>
                        {isMember ? "There are currently no active fundraising campaigns scheduled. Check back soon!" : "Launch your first fundraising campaign today."}
                    </p>
                    {!isMember && <Link href="/dashboard/fundraising/new" className="btn-primary">+ Create First Campaign</Link>}
                </div>
            )}
        </div>
    );
}
