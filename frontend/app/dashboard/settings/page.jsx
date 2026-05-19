"use client";

import { useState, useEffect } from "react";
import "../../styles/settings.css";

export default function SettingsPage() {
    const [clubName, setClubName] = useState("");
    const [userName, setUserName] = useState("");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setClubName(localStorage.getItem("clubName") || "");
        setUserName(localStorage.getItem("userName") || "");
    }, []);

    const handleSave = () => {
        localStorage.setItem("clubName", clubName);
        localStorage.setItem("userName", userName);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        window.dispatchEvent(new Event("storage"));
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    return (
        <div className="settings-container">
            <h1>Club Settings</h1>
            <p className="settings-subtitle">
                Manage your club information and account preferences.
            </p>

            <div className="settings-card">
                <h2>Profile Information</h2>

                <div className="form-group-settings">
                    <label>Club Name</label>
                    <input
                        type="text"
                        className="form-input-settings"
                        value={clubName}
                        onChange={(e) => setClubName(e.target.value)}
                        placeholder="Your club name"
                    />
                </div>

                <div className="form-group-settings">
                    <label>Admin Name</label>
                    <input
                        type="text"
                        className="form-input-settings"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Your name"
                    />
                </div>

                <button onClick={handleSave} className="save-btn">
                    {saved ? "✓ Saved!" : "Save Changes"}
                </button>
            </div>

            <div className="settings-danger-card">
                <h2>Danger Zone</h2>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                    Logging out will clear your session.
                </p>
                <button onClick={handleLogout} className="logout-btn">
                    Log Out
                </button>
            </div>
        </div>
    );
}
