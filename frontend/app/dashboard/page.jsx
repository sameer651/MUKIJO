"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Tabs from "../../components/dashboard/Tabs";
import EventSection from "../../components/dashboard/EventSection";
import PostSection from "../../components/dashboard/PostSection";
import PaymentSection from "../../components/dashboard/PaymentSection";
import PollSection from "../../components/dashboard/PollSection";
import InfoCard from "../../components/dashboard/InfoCard";

export default function DashboardPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("Events");
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const storedIsMember = localStorage.getItem("isMember") === "true";
        if (storedIsMember) {
            router.replace("/dashboard/overview");
        } else {
            setChecking(false);
        }
    }, [router]);

    const renderContent = () => {
        switch (activeTab) {
            case "Events":
                return <EventSection />;
            case "Posts":
                return <PostSection />;
            case "Payments":
                return <PaymentSection />;
            case "Polls":
                return <PollSection />;
            default:
                return <EventSection />;
        }
    };

    if (checking) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <div style={{ textAlign: "center", color: "#64748b" }}>
                    <div style={{ width: "40px", height: "40px", border: "4px solid #cbd5e1", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
                    <p style={{ fontWeight: 600 }}>Verifying credentials & role view...</p>
                </div>
                <style jsx>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="content-layout">
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                {renderContent()}
            </div>
            <InfoCard />
        </div>
    );
}
