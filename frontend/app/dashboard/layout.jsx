"use client";

import Sidebar from "../../components/dashboard/Sidebar";
import TopHeader from "../../components/dashboard/TopHeader";
import "../styles/dashboard.css";

export default function DashboardLayout({ children }) {
    return (
        <div className="dashboard-container">
            <Sidebar />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", overflow: "hidden" }}>
                <TopHeader />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
