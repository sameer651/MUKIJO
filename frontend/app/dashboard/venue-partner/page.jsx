"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "../../styles/partner-portal.css";

const AVAILABLE_SPORTS = ["football", "badminton", "cricket", "tennis", "pickleball"];
const AVAILABLE_AMENITIES = ["Parking", "Washroom", "Drinking Water", "Changing Rooms", "Floodlights", "Cafe"];

export default function VenuePartnerPage() {
    const router = useRouter();
    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [payouts, setPayouts] = useState(null);

    // Form inputs for blocking/unblocking
    const [blockStart, setBlockStart] = useState("");
    const [blockEnd, setBlockEnd] = useState("");
    const [blockSport, setBlockSport] = useState("all");

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [loading, setLoading] = useState(false);

    // Show toast message
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
    };

    // 1. Fetch all venues owned by current user
    const fetchVenues = async (selectVenueId = null) => {
        const ownerId = localStorage.getItem("userId") || 9; // Fallback to test user ID 9
        setLoading(true);
        try {
            const response = await fetch(`http://127.0.0.1:8001/venues/owner/${ownerId}`);
            if (response.ok) {
                const data = await response.json();
                setVenues(data);
                if (data.length > 0) {
                    if (selectVenueId) {
                        const match = data.find(v => v.id === selectVenueId);
                        setSelectedVenue(match || data[0]);
                    } else {
                        setSelectedVenue(data[0]);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching partner venues:", error);
            showToast("Failed to fetch venues.", "error");
        } finally {
            setLoading(false);
        }
    };

    // 1b. Placeholder for routing
    const handleGoToRegister = () => {
        router.push("/dashboard/venue-partner/register");
    };

    // 2. Fetch analytics and payouts for selected venue
    const fetchVenueData = async (venueId) => {
        try {
            const [analyticsRes, payoutsRes] = await Promise.all([
                fetch(`http://127.0.0.1:8001/venues/${venueId}/analytics`),
                fetch(`http://127.0.0.1:8001/venues/${venueId}/payouts`)
            ]);

            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                setAnalytics(analyticsData);
            }
            if (payoutsRes.ok) {
                const payoutsData = await payoutsRes.json();
                setPayouts(payoutsData);
            }
        } catch (error) {
            console.error("Error fetching venue analytics/payouts:", error);
            showToast("Failed to reload analytics.", "error");
        }
    };

    useEffect(() => {
        fetchVenues();
    }, []);

    useEffect(() => {
        if (selectedVenue) {
            fetchVenueData(selectedVenue.id);
        }
    }, [selectedVenue]);

    // 3. Block Slots Action
    const handleBlockSlots = async (e) => {
        e.preventDefault();
        if (!selectedVenue) return;
        if (!blockStart || !blockEnd) {
            showToast("Please select start and end dates.", "error");
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8001/venues/${selectedVenue.id}/block-slots`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    start_date: blockStart,
                    end_date: blockEnd,
                    sport: blockSport === "all" ? null : blockSport
                })
            });

            const data = await response.json();
            if (response.ok) {
                showToast(data.message || "Slots successfully blocked.");
                fetchVenueData(selectedVenue.id);
            } else {
                showToast(data.detail || "Failed to block slots.", "error");
            }
        } catch (error) {
            console.error("Error blocking slots:", error);
            showToast("Network error.", "error");
        }
    };

    // 4. Unblock Slots Action
    const handleUnblockSlots = async (e) => {
        e.preventDefault();
        if (!selectedVenue) return;
        if (!blockStart || !blockEnd) {
            showToast("Please select start and end dates.", "error");
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8001/venues/${selectedVenue.id}/unblock-slots`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    start_date: blockStart,
                    end_date: blockEnd,
                    sport: blockSport === "all" ? null : blockSport
                })
            });

            const data = await response.json();
            if (response.ok) {
                showToast(data.message || "Slots successfully unblocked.");
                fetchVenueData(selectedVenue.id);
            } else {
                showToast(data.detail || "Failed to unblock slots.", "error");
            }
        } catch (error) {
            console.error("Error unblocking slots:", error);
            showToast("Network error.", "error");
        }
    };

    // 5. Request Instant Payout (Mock Simulation)
    const handleRequestPayout = () => {
        if (!payouts || payouts.final_payout <= 0) {
            showToast("No revenue available for payout.", "error");
            return;
        }
        showToast("Payout request submitted! Processing transfer...");
    };

    // Render loading state if venues are loading
    if (loading && venues.length === 0) {
        return (
            <div className="partner-portal-container" style={{ display: "flex", justifyContent: "center", padding: "100px" }}>
                <p>Loading Venue Partner Dashboard...</p>
            </div>
        );
    }

    // Render onboarding state if no venues exist
    if (venues.length === 0) {
        return (
            <div className="partner-portal-container">
                <header className="portal-header">
                    <div>
                        <h1>Venue Partner SaaS</h1>
                        <p>No registered sports venues found. Onboard a venue to get started.</p>
                    </div>
                </header>
                <div style={{ textAlign: "center", padding: "60px", background: "var(--glass-bg)", borderRadius: "16px", border: "1px solid var(--glass-border)" }}>
                    <h3>Welcome, Partner!</h3>
                    <p style={{ color: "#64748b", margin: "16px 0 24px" }}>
                        It looks like you haven't added any sports arenas to your account yet. Register your first venue here to start managing bookings, slot schedules, and payouts.
                    </p>
                    <button className="payout-btn" style={{ padding: "12px 24px", fontSize: "14px" }} onClick={handleGoToRegister}>
                        + Register First Venue
                    </button>
                </div>
                {toast.show && (
                    <div className={`status-toast ${toast.type}`}>
                        <span>{toast.message}</span>
                    </div>
                )}
            </div>
        );
    }

    // Peak hours bar rendering helper
    const maxBookingsCount = analytics?.peak_hours?.length > 0 
        ? Math.max(...analytics.peak_hours.map(h => h.bookings_count)) 
        : 1;

    // SVG Chart points calculation helper
    const trends = analytics?.revenue_trends || [];
    const maxRev = trends.length > 0 ? Math.max(...trends.map(t => t.revenue), 1000) : 1000;
    const chartHeight = 180;
    const chartWidth = 500;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    return (
        <div className="partner-portal-container">
            {/* Header with Venue Switcher */}
            <header className="portal-header">
                <div>
                    <h1>Venue Partner Portal</h1>
                    <p>SaaS administration panel for venue owners and turf administrators.</p>
                </div>
                <div className="venue-selector-wrapper" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <button 
                        className="payout-btn" 
                        style={{ margin: 0, height: "40px" }}
                        onClick={handleGoToRegister}
                    >
                        + Register Venue
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="venue-select-label">Active Venue:</span>
                        <select 
                            className="venue-select"
                            value={selectedVenue?.id || ""}
                            onChange={(e) => {
                                const selected = venues.find(v => v.id === parseInt(e.target.value));
                                setSelectedVenue(selected);
                            }}
                        >
                            {venues.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* Quick Metrics */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-info">
                        <h3>Occupancy Rate</h3>
                        <div className="stat-value primary-color">{analytics?.occupancy_rate || 0.0}%</div>
                    </div>
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><path d="M11 18H8a2 2 0 0 1-2-2V9"></path></svg>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Total SaaS Bookings</h3>
                        <div className="stat-value secondary-color">{analytics?.total_bookings || 0}</div>
                    </div>
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Gross Revenue</h3>
                        <div className="stat-value">₹{payouts?.total_revenue?.toLocaleString() || "0"}</div>
                    </div>
                    <div className="stat-icon">
                        <span style={{ fontSize: "20px", fontWeight: "700" }}>₹</span>
                    </div>
                </div>

                <div className="stat-card accent">
                    <div className="stat-info">
                        <h3>Final Payout (90%)</h3>
                        <div className="stat-value" style={{ color: "var(--brand-emerald)" }}>
                            ₹{payouts?.final_payout?.toLocaleString() || "0"}
                        </div>
                        <button className="payout-btn" onClick={handleRequestPayout}>Request Instant Payout</button>
                    </div>
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                    </div>
                </div>
            </div>

            {/* Main Row: Revenue Trends & Holiday Block */}
            <div className="dashboard-grid">
                {/* Revenue trends Chart */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <h2>
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            Revenue Trends (Monthly Gross)
                        </h2>
                    </div>
                    <div className="chart-container">
                        {trends.length > 0 ? (
                            <svg className="svg-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                                <defs>
                                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--brand-secondary)" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="var(--brand-secondary)" stopOpacity="0.05" />
                                    </linearGradient>
                                    <linearGradient id="chart-gradient-hover" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="1" />
                                        <stop offset="100%" stopColor="var(--brand-secondary)" stopOpacity="0.2" />
                                    </linearGradient>
                                </defs>
                                
                                {/* Grid lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                                    const yVal = paddingTop + (chartHeight - paddingTop - paddingBottom) * ratio;
                                    return (
                                        <line 
                                            key={index}
                                            x1={paddingLeft}
                                            y1={yVal}
                                            x2={chartWidth - paddingRight}
                                            y2={yVal}
                                            className="chart-grid-line"
                                        />
                                    );
                                })}

                                {/* Bars */}
                                {trends.map((t, i) => {
                                    const width = (chartWidth - paddingLeft - paddingRight) / trends.length;
                                    const x = paddingLeft + i * width + width * 0.15;
                                    const barWidth = width * 0.7;
                                    
                                    const heightRatio = t.revenue / maxRev;
                                    const barHeight = Math.max((chartHeight - paddingTop - paddingBottom) * heightRatio, 4);
                                    const y = chartHeight - paddingBottom - barHeight;

                                    return (
                                        <g key={i}>
                                            <rect 
                                                x={x}
                                                y={y}
                                                width={barWidth}
                                                height={barHeight}
                                                className="chart-bar"
                                            />
                                            <text 
                                                x={x + barWidth / 2}
                                                y={chartHeight - 10}
                                                className="chart-axis-text"
                                            >
                                                {t.month.split(" ")[0]}
                                            </text>
                                            <text 
                                                x={x + barWidth / 2}
                                                y={y - 6}
                                                fill="#ffffff"
                                                fontSize="10"
                                                fontWeight="700"
                                                textAnchor="middle"
                                            >
                                                ₹{Math.round(t.revenue)}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        ) : (
                            <p style={{ textAlign: "center", color: "#64748b", padding: "60px" }}>No revenue trends logs found.</p>
                        )}
                    </div>
                </div>

                {/* Holiday slots block tool */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <h2>
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Manage Holidays / Block Slots
                        </h2>
                    </div>
                    <form className="block-form">
                        <div className="form-group">
                            <label>Start Date</label>
                            <input 
                                type="date" 
                                className="form-input"
                                value={blockStart}
                                onChange={(e) => setBlockStart(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>End Date</label>
                            <input 
                                type="date" 
                                className="form-input"
                                value={blockEnd}
                                onChange={(e) => setBlockEnd(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Sport Scope</label>
                            <select 
                                className="form-input"
                                value={blockSport}
                                onChange={(e) => setBlockSport(e.target.value)}
                            >
                                <option value="all">All Sports</option>
                                <option value="football">Football</option>
                                <option value="badminton">Badminton</option>
                                <option value="cricket">Cricket</option>
                                <option value="tennis">Tennis</option>
                                <option value="pickleball">Pickleball</option>
                            </select>
                        </div>
                        <div className="action-buttons-wrap">
                            <button className="block-btn" onClick={handleBlockSlots}>Block Schedules</button>
                            <button className="unblock-btn" onClick={handleUnblockSlots}>Unblock</button>
                        </div>
                    </form>
                    <p style={{ fontSize: "11px", color: "#64748b", marginTop: "16px", lineHeight: "1.4" }}>
                        Blocking dates sets slot availability `is_blocked` status to true, preventing double bookings from customers on public schedules.
                    </p>
                </div>
            </div>

            {/* Second Row: Peak Hours & Customer Logs */}
            <div className="dashboard-grid">
                {/* Peak Hours */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <h2>
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Peak Usage Hours
                        </h2>
                    </div>
                    <div className="peak-hours-list">
                        {analytics?.peak_hours?.map((hour, idx) => {
                            const barPct = hour.bookings_count / maxBookingsCount * 100;
                            return (
                                <div key={idx} className="peak-hour-item">
                                    <span className="peak-hour-time">{hour.time}</span>
                                    <div className="peak-hour-metrics">
                                        <div className="peak-hour-bar-outer">
                                            <div className="peak-hour-bar-inner" style={{ width: `${barPct}%` }} />
                                        </div>
                                        <span className="peak-hour-pct">{hour.percentage}%</span>
                                    </div>
                                </div>
                            );
                        })}
                        {(!analytics?.peak_hours || analytics.peak_hours.length === 0) && (
                            <p style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>No booking records found to calculate peak hours.</p>
                        )}
                    </div>
                </div>

                {/* Customer Retention logs */}
                <div className="dashboard-panel" style={{ overflow: "hidden" }}>
                    <div className="panel-header">
                        <h2>
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            Customer Retention Logs
                        </h2>
                    </div>
                    <div style={{ maxHeight: "245px", overflowY: "auto" }}>
                        <table className="retention-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Bookings</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics?.customer_retention?.map((cust, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <div className="customer-name">{cust.user_name}</div>
                                            <div className="customer-email">{cust.user_email}</div>
                                        </td>
                                        <td style={{ fontWeight: "700" }}>{cust.bookings_count}</td>
                                        <td>
                                            <span className={`badge-${cust.is_repeat ? "loyal" : "new"}`}>
                                                {cust.is_repeat ? "Loyal Partner" : "New Client"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!analytics?.customer_retention || analytics.customer_retention.length === 0) && (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>No user retention logs tracked yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Payouts Section */}
            <div className="dashboard-panel">
                <div className="panel-header">
                    <h2>
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                        Payout Transfer Audits
                    </h2>
                </div>
                <div className="payouts-table-container">
                    <table className="payouts-table">
                        <thead>
                            <tr>
                                <th>Payout ID</th>
                                <th>Billing Cycle Date</th>
                                <th>Transferred Amount</th>
                                <th>Status</th>
                                <th>Bank UTR Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts?.payout_history?.map((payout, idx) => (
                                <tr key={idx}>
                                    <td className="payout-id">{payout.id}</td>
                                    <td>{payout.date}</td>
                                    <td style={{ fontWeight: "700", color: "#ffffff" }}>₹{payout.amount?.toLocaleString()}</td>
                                    <td>
                                        <span className={`payout-status ${payout.status}`}>
                                            {payout.status}
                                        </span>
                                    </td>
                                    <td className="payout-utr">{payout.utr}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Toast status alert notification */}
            {toast.show && (
                <div className={`status-toast ${toast.type}`}>
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
