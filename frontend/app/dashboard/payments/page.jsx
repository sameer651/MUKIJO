"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";
import "../../styles/payments-page.css";

function formatMoney(value) {
    return `\u20B9${Number(value || 0).toLocaleString("en-IN")}`;
}

function displayStatus(status) {
    return status === "paid" ? "Paid" : "Unpaid";
}

export default function PaymentsPage() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

    useEffect(() => {
        const fetchPayments = async () => {
            setLoading(true);
            setError("");

            try {
                const [paymentsResponse, membersResponse] = await Promise.all([
                    api.get("/payments/member-status", {
                        params: { owner_id: userId || 1 },
                    }),
                    api.get("/members", {
                        params: { owner_id: userId || 1 },
                    }),
                ]);
                const membersById = new Map((membersResponse.data || []).map((member) => [String(member.id), member]));
                const paymentsWithMemberGroups = (paymentsResponse.data || []).map((payment) => {
                    const member = membersById.get(String(payment.member_id));
                    return {
                        ...payment,
                        member_group_name: payment.member_group_name || member?.group_name || payment.group_name || "N/A",
                    };
                });

                setPayments(paymentsWithMemberGroups);
            } catch (err) {
                console.error("Error loading member payment data:", err);
                setError("Could not load member payment records.");
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, [userId]);

    const filteredPayments = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return payments;

        return payments.filter((payment) => {
            const searchableText = [
                payment.full_name,
                payment.email,
                payment.role,
                payment.sport,
                payment.member_group_name,
                payment.payment_for,
                payment.status,
            ].join(" ").toLowerCase();

            return searchableText.includes(query);
        });
    }, [payments, searchQuery]);

    return (
        <div className="payments-container">
            <div className="payments-header">
                <div>
                    <h1>Payments</h1>
                    <p>All club group members with full name, email, role, sport, payment, amount, and paid status.</p>
                </div>
            </div>

            <div className="payments-table-toolbar">
                <div>
                    <span>{filteredPayments.length} records</span>
                </div>
                <div className="search-wrapper">
                    <span className="search-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        aria-label="Search payments"
                    />
                </div>
            </div>

            {error && <div className="payments-error">{error}</div>}

            {loading ? (
                <div className="loading-wrapper">
                    <div className="spinner" />
                    <p className="loading-text">Loading member payments...</p>
                </div>
            ) : filteredPayments.length > 0 ? (
                <div className="table-responsive">
                    <table className="payments-table">
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Sports</th>
                                <th>Group</th>
                                <th>Payment For</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.map((payment, index) => (
                                <tr key={`${payment.member_id}-${payment.payment_id || "none"}-${index}`}>
                                    <td>
                                        <span className="member-name">{payment.full_name || "-"}</span>
                                    </td>
                                    <td>
                                        <span className="member-email">{payment.email || "-"}</span>
                                    </td>
                                    <td>
                                        <span className="role-badge">{payment.role || "Member"}</span>
                                    </td>
                                    <td>
                                        <div className="sport-cell">
                                            <span className="sport-badge">{payment.sport || "N/A"}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="group-badge">{payment.member_group_name || "N/A"}</span>
                                    </td>
                                    <td>
                                        <span className="payment-title">{payment.payment_for || "No Assigned Payments"}</span>
                                    </td>
                                    <td>
                                        <span className="amount-text">{formatMoney(payment.amount)}</span>
                                    </td>
                                    <td>
                                        <span className={`status-pill status-${payment.status === "paid" ? "paid" : "unpaid"}`}>
                                            {displayStatus(payment.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state">
                    <h3>No Records Found</h3>
                    <p>Try another search or add members and payments to the club.</p>
                </div>
            )}
        </div>
    );
}
