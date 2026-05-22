"use client";

import { useState } from "react";
import Sidebar from "../../components/dashboard/Sidebar";
import TopHeader from "../../components/dashboard/TopHeader";
import MobileBottomNav from "../../components/dashboard/MobileBottomNav";
import "../styles/dashboard.css";

export default function DashboardLayout({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <>
            <TopHeader
                isMobileMenuOpen={isMobileMenuOpen}
                onMenuToggle={() => setIsMobileMenuOpen((open) => !open)}
            />
            <div className="dashboard-container">
                <button
                    type="button"
                    className={`mobile-menu-scrim ${isMobileMenuOpen ? "visible" : ""}`}
                    onClick={closeMobileMenu}
                    aria-label="Close navigation"
                />
                <Sidebar isOpen={isMobileMenuOpen} onNavigate={closeMobileMenu} />
                <div className="dashboard-content">
                    <main className="main-content">
                        {children}
                    </main>
                </div>
            </div>
            <MobileBottomNav />
        </>
    );
}
