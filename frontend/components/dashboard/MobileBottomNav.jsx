"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, HandCoins, LayoutDashboard, Users } from "lucide-react";

const navItems = [
    { href: "/dashboard/overview", label: "Home", icon: LayoutDashboard, match: (path) => path === "/dashboard/overview" },
    { href: "/dashboard/members", label: "Members", icon: Users, match: (path) => path.startsWith("/dashboard/members") },
    { href: "/dashboard/courses", label: "Courses", icon: BookOpen, match: (path) => path.startsWith("/dashboard/courses") },
    { href: "/dashboard/events", label: "Events", icon: CalendarDays, match: (path) => path.startsWith("/dashboard/events") },
    { href: "/dashboard/fundraising", label: "Funds", icon: HandCoins, match: (path) => path.startsWith("/dashboard/fundraising") },
];

export default function MobileBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="mobile-bottom-nav" aria-label="Main mobile navigation">
            {navItems.map(({ href, label, icon: Icon, match }) => {
                const isActive = match(pathname);
                return (
                    <Link key={href} href={href} className={`mobile-bottom-item ${isActive ? "active" : ""}`}>
                        <Icon size={20} strokeWidth={2.2} />
                        <span>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
