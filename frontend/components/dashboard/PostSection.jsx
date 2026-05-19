"use client";

export default function PostSection() {
    return (
        <section className="event-section">
            <div className="event-top">
                <span>Recent Posts</span>
                <button className="create-post-btn">Create Post</button>
            </div>

            <div className="empty-box">
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <h2>No posts yet</h2>
                <p>Share updates, photos, or announcements with your group.</p>
            </div>
        </section>
    );
}
