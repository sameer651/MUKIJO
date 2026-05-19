"use client";

export default function Tabs({ activeTab, setActiveTab }) {
    const tabs = ["Events", "Posts", "Payments", "Polls"];
    
    return (
        <div className="tabs">
            {tabs.map((tab) => (
                <button 
                    key={tab}
                    className={`tab ${activeTab === tab ? "active-tab" : ""}`}
                    onClick={() => setActiveTab(tab)}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
}
