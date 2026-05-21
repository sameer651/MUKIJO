import Link from "next/link";
import { Shield, Users } from "lucide-react";
import "./styles/landing.css";

const ACTION_BOXES = [
  {
    href: "/login",
    title: "Login as Club Admin",
    description: "Sign in to manage your club, rosters, events, and finances.",
    variant: "admin-login",
  },
  {
    href: "/register",
    title: "Register as Club Admin",
    description: "Create a new club admin account to set up your organization.",
    variant: "admin-register",
  },
  {
    href: "/login-member",
    title: "Login as Member",
    description: "Sign in as a coach, player, parent, or referee.",
    variant: "member-login",
  },
  {
    href: "/register-member",
    title: "Register as Member",
    description: "Join your club as a member with your role and details.",
    variant: "member-register",
  },
];

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
          <h1>Choose how you want to continue</h1>
          <p className="welcome-sub">Select one of the options below to sign in or register</p>
        </div>

        <div className="landing-boxes-grid">
          {ACTION_BOXES.map((box) => {
            const isAdmin = box.variant.startsWith("admin");
            return (
              <Link
                key={box.variant}
                href={box.href}
                className="action-box"
              >
                <div className="action-box__icon">
                  {isAdmin ? <Shield size={22} /> : <Users size={22} />}
                </div>
                <div className="action-box__content">
                  <h2>{box.title}</h2>
                  <p>{box.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="landing-footer">
        <span>Copyrights © 2026 Mukijo Club. All rights reserved.</span>
      </footer>
    </main>
  );
}
