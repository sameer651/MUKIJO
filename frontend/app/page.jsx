import Link from "next/link";
import { Shield, Users, LogIn, UserPlus } from "lucide-react";
import "./styles/landing.css";

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-topbar">
        <strong className="logo">Mukijo</strong>
        <span className="topbar-tag">Advanced Club Management Platform</span>
      </header>

      <section className="landing-shell">
        <div className="landing-header">
          <span className="welcome-tag">Welcome to Mukijo Club</span>
          <h1>Select Your Dedicated Workspace</h1>
          <p className="welcome-sub">Choose your dedicated path to sign in or register below</p>
        </div>

        <div className="landing-split-container">
          {/* Left Column: Admin Portal */}
          <div className="portal-card admin-portal">
            <div className="portal-icon-wrapper">
              <Shield size={36} className="portal-icon" />
            </div>
            <h2>Club Administrator Hub</h2>
            <p className="portal-subtitle">For managers, academy directors, and owners</p>
            <p className="portal-desc">
              Configure custom player onboarding forms, manage club rosters, build coaching courses, schedule fixtures, broadcast announcements, and track campaign finances.
            </p>
            <div className="portal-actions">
              <Link href="/login" className="portal-btn btn-admin-login">
                <LogIn size={18} />
                <span>Login as Club Admin</span>
              </Link>
              <Link href="/register" className="portal-btn btn-admin-register">
                <UserPlus size={18} />
                <span>Register a New Club</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Member Portal */}
          <div className="portal-card member-portal">
            <div className="portal-icon-wrapper">
              <Users size={36} className="portal-icon" />
            </div>
            <h2>Squad Member Portal</h2>
            <p className="portal-subtitle">For coaches, players, parents, and referees</p>
            <p className="portal-desc">
              View upcoming match fixtures and practice itineraries, respond with event RSVPs, manage active child/player profiles, mark match attendance, and submit match scorecards.
            </p>
            <div className="portal-actions">
              <Link href="/login-member" className="portal-btn btn-member-login">
                <LogIn size={18} />
                <span>Login as Member</span>
              </Link>
              <Link href="/register-member" className="portal-btn btn-member-register">
                <UserPlus size={18} />
                <span>Register / Join Club</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Copyrights © 2026 Mukijo Club. All rights reserved.</span>
      </footer>
    </main>
  );
}
