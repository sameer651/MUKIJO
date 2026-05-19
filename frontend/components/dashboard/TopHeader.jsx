"use client";

import { useEffect, useState } from "react";

export default function TopHeader() {
    const [name, setName] = useState("Guest");

    useEffect(() => {
        const storedName = localStorage.getItem("userName");
        if (storedName) {
            setName(storedName);
        }
    }, []);

    return (
        <header className="top-header">
            <h1>Mukijo</h1>

            <div className="user-box">
                <div className="user-avatar">{name.charAt(0).toUpperCase()}</div>
                <span className="user-name">{name}</span>
                <div className="bell">
                    <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </div>
            </div>
        </header>
    );
}

