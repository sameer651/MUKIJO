"use client";

export default function PollSection() {
    return (
        <section className="event-section">
            <div className="event-top">
                <span>Active Polls</span>
                <button className="create-post-btn">New Poll</button>
            </div>

            <div className="empty-box">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <h2>No active polls</h2>
                <p>Create a poll to get feedback or make decisions with your group.</p>
            </div>
        </section>
    );
}
