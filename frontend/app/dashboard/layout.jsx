"use client";

import Sidebar from "../../components/dashboard/Sidebar";
import TopHeader from "../../components/dashboard/TopHeader";
import "../styles/dashboard.css";

export default function DashboardLayout({ children }) {
    return (
        <>
            <TopHeader />
            <div className="dashboard-container">
                <Sidebar />
                <div className="dashboard-content">
                    <main className="main-content">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
