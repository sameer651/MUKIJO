"use client";

import Link from "next/link";

export default function InfoCard() {
    return (
        <aside className="info-card">
            <h3>Organize activities into groups</h3>

            <p>
                Create groups for both adults or children. In child groups,
                you can add guardians who may answer on behalf of the children.
            </p>

            <Link href="/dashboard/creategroup" className="create-group-btn" style={{ textDecoration: 'none', marginBottom: '12px' }}>
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Create new group
            </Link>

            <Link href="/dashboard/importgroups" className="import-group-btn" style={{ textDecoration: 'none' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Import groups
            </Link>
        </aside>
    );
}
