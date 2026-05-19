import Link from "next/link";
import { LogIn, UserPlus, Users, UserCheck } from "lucide-react";
import "./styles/landing.css";

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-topbar">
        <strong>Mukijo</strong>
      </header>

      <section className="landing-shell">
        <div className="landing-header">
          <span>Mukijo Club</span>
          <h1>Choose how you want to continue</h1>
        </div>

        <div className="landing-actions">
          <Link className="landing-box" href="/login">
            <span className="landing-icon">
              <LogIn size={26} />
            </span>
            <strong>Login as Club Admin</strong>
          </Link>

          <Link className="landing-box" href="/login-member">
            <span className="landing-icon">
              <LogIn size={26} />
            </span>
            <strong>Login as Member</strong>
          </Link>

          <Link className="landing-box" href="/register">
            <span className="landing-icon">
              <UserPlus size={26} />
            </span>
            <strong>Register as Club Admin</strong>
          </Link>

          <Link className="landing-box" href="/register-member">
            <span className="landing-icon">
              <UserPlus size={26} />
            </span>
            <strong>Register as Member</strong>
          </Link>
        </div>
      </section>

      <footer className="landing-footer">Copyrights @mukjo</footer>
    </main>
  );
}
