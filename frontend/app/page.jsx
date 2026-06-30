import Link from "next/link";
// Added Building2 icon from lucide-react for the venues
import { Shield, Users, ArrowRight, Zap, Trophy, Calendar, CreditCard, BarChart3, Building2 } from "lucide-react";
import "./styles/landing.css";

const ACTION_BOXES = [
  {
    href: "/login",
    title: "Login as Club Admin",
    description: "Manage your club, members, events, and finances with full control.",
    variant: "admin-login",
    Icon: Shield,
  },
  {
    href: "/register",
    title: "Register as Club Admin",
    description: "Create your club admin account and set up your organization in minutes.",
    variant: "admin-register",
    Icon: Shield,
  },
  {
    href: "/login-member",
    title: "Login as Member",
    description: "Sign in as a coach, player, parent, or referee to access your dashboard.",
    variant: "member-login",
    Icon: Users,
  },
  {
    href: "/register-member",
    title: "Register as Member",
    description: "Join your club as a member and unlock your personalized member space.",
    variant: "member-register",
    Icon: Users,
  },
  {
    href: "/login-venue",
    title: "Login as Venue Owner",
    description: "Access your venue dashboard to track schedules, pricing, and reservations.",
    variant: "venue-login",
    Icon: Building2,
  },
  {
    href: "/register-venue",
    title: "Register a Venue",
    description: "List your sports facility, court, or turf and start managing bookings effortlessly.",
    variant: "venue-register",
    Icon: Building2,
  },
];

const FEATURES = [
  { icon: <Trophy size={13} />, label: "Group Management" },
  { icon: <Calendar size={13} />, label: "Event Scheduling" },
  { icon: <CreditCard size={13} />, label: "Payment Tracking" },
  { icon: <BarChart3 size={13} />, label: "Analytics" },
  { icon: <Zap size={13} />, label: "Real-time Updates" },
];

const STATS = [
  { number: "5+", label: "Roles Supported" },
  { number: "∞", label: "Members Scale" },
  { number: "24/7", label: "Access" },
];

export default function Home() {
  return (
    <main className="landing-page">
      {/* ── Top Navigation ── */}
      <header className="landing-topbar">
        <strong className="logo">Mukijo</strong>
        <div className="topbar-right">
          <span className="topbar-tag">Advanced Club Management</span>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        {/* Floating orbs */}
        <div className="orb orb-1" aria-hidden="true" />
        <div className="orb orb-2" aria-hidden="true" />
        <div className="orb orb-3" aria-hidden="true" />

        {/* Badge */}
        <div className="hero-badge">
          Club Management Platform
        </div>

        {/* Headline */}
        <h1 className="hero-headline">
          <span className="line-1">Your Club,</span>
          <span className="line-2">Supercharged.</span>
        </h1>

        {/* Subheadline */}
        <p className="hero-sub">
          Mukijo brings together admins, coaches, players, parents, and referees
          into one powerful platform — beautiful by design, powerful by nature.
        </p>

        {/* Feature pills */}
        <div className="hero-features">
          {FEATURES.map((f) => (
            <div key={f.label} className="feat-pill">
              {f.icon}
              {f.label}
            </div>
          ))}
        </div>

        {/* Action Cards */}
        <div className="landing-boxes-grid">
          {ACTION_BOXES.map((box) => (
            <Link
              key={box.variant}
              href={box.href}
              className="action-box"
              data-variant={box.variant}
            >
              <div className="action-box__icon">
                <box.Icon size={24} />
              </div>
              <div className="action-box__content">
                <h2>{box.title}</h2>
                <p>{box.description}</p>
              </div>
              <div className="action-box__arrow">
                <ArrowRight size={13} />
              </div>
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="hero-stats">
          {STATS.map((s) => (
            <div key={s.label} className="stat-item">
              <span className="stat-number">{s.number}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>©</span>
        <span>2026 Mukijo Club.</span>
        All rights reserved.
      </footer>
    </main>
  );
}