"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import "../styles/venue-login.css"; 
// 1. Import your central Axios helper instance
import api from "../../lib/api"; 
// 2. Import toast to show beautifully styled notifications when responses return
import { toast, Toaster } from "react-hot-toast";

export default function VenueOwnerLogin() {
  // Navigation View Control: 'login' | 'register' | 'success' | 'dashboard'
  const [viewState, setViewState] = useState("login");

  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register Form States
  const [regData, setRegData] = useState({
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: ""
  });

  const handleRegInputChange = (e) => {
    const { name, value } = e.target;
    setRegData(prev => ({ ...prev, [name]: value }));
  };

  // --- UPDATED LOGIN SUBMIT HANDLER ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in your credentials.");
      return;
    }

    try {
      // Send credentials over to your FastAPI login route
      const response = await api.post("/venue-owner/login", {
        email: loginEmail,
        password: loginPassword,
      });

      // Look for the signed JWT access token in the response payload
      if (response.data.access_token) {
        // Save the authentication string into your secure browser memory space
        localStorage.setItem("venue_token", response.data.access_token);
        
        toast.success("Welcome back to your workspace dashboard!");
        setViewState("dashboard");
      }
    } catch (error) {
      const errMsg = error.response?.data?.detail || "Invalid email or password mismatch.";
      toast.error(errMsg);
    }
  };

  // --- UPDATED REGISTRATION SUBMIT HANDLER ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regData.username || !regData.email || !regData.phoneNumber || !regData.password || !regData.confirmPassword) {
      toast.error("Please fill up all input boxes.");
      return;
    }
    if (regData.password !== regData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      // Fire payload to your FastAPI register endpoint
      const response = await api.post("/venue-owner/register", {
        username: regData.username,
        email: regData.email,
        phoneNumber: regData.phoneNumber,
        password: regData.password,
      });

      if (response.status === 201) {
        toast.success("Account created successfully!");
        setViewState("success");
      }
    } catch (error) {
      const errMsg = error.response?.data?.detail || "Registration failed. Email or Username might be taken.";
      toast.error(errMsg);
    }
  };

  // VIEW 4: VENUE OWNER DASHBOARD (LANDING PAGE)
  if (viewState === "dashboard") {
    return (
      <main className="venue-login-bg">
        <div className="login-grid-overlay" />
        <div className="workspace-slim-card text-center py-12">
          <h1 className="text-2xl font-black text-[#bffe00] uppercase italic mb-2">Welcome Owner</h1>
          <p className="text-slate-400 text-xs mb-6">Venue Dashboard Control Node Hub</p>
          <div className="bg-[#111122] p-4 rounded-lg border border-white/5 text-left text-xs space-y-2 mb-6">
            <div className="text-slate-400">Authenticated Session: <span className="text-cyan-400 font-mono">{loginEmail}</span></div>
            <div className="text-slate-400">Status: <span className="text-lime-400 font-bold">Active</span></div>
          </div>
          <button onClick={() => { localStorage.removeItem("venue_token"); setViewState("login"); setLoginEmail(""); setLoginPassword(""); }} className="btn-prev-outline w-full">
            Log Out Session
          </button>
        </div>
      </main>
    );
  }

  // VIEW 3: REGISTRATION SUCCESS VIEW CARD
  if (viewState === "success") {
    return (
      <main className="venue-login-bg">
        <div className="login-grid-overlay" />
        <div className="login-card-container text-center py-10">
          <div className="w-14 h-14 bg-[#bffe00]/10 text-[#bffe00] rounded-full flex items-center justify-center mx-auto mb-5 border border-[#bffe00]/20 shadow-[0_0_15px_rgba(191,254,0,0.1)]">
            <Check size={28} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white uppercase italic mb-2">Successfully Registered!</h2>
          <p className="text-slate-400 text-xs leading-relaxed mb-6 max-w-xs mx-auto">
            Your partner access account credentials have been processed successfully. You can now access your management zone.
          </p>
          <div className="border-t border-white/5 pt-5">
            <button onClick={() => setViewState("login")} className="login-vibrant-submit-btn w-full">
              <span>GO TO LOGIN PAGE</span>
              <ArrowRight size={14} className="stroke-[3]" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="venue-login-bg">
      {/* 3. Add toaster element inside your background container layout stack */}
      <Toaster position="top-center" reverseOrder={false} />
      <div className="login-grid-overlay" />

      {/* VIEW 1: LOGIN BOX SCREEN */}
      {viewState === "login" && (
        <div className="login-card-container">
          <div className="text-center mb-1">
            <h1 className="brand-logo-text">MUKIJO</h1>
            <h2 className="login-title-sub">Venue Owner Login</h2>
            <p className="login-description-text">Sign in with your approved partner credentials</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 mt-6">
            <div className="input-stack-box">
              <label className="login-field-label">Email address</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                className="login-custom-input"
                required
              />
            </div>

            <div className="input-stack-box pb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="login-field-label mb-0">Password</label>
                <button type="button" className="forgot-pass-link">Forgot password?</button>
              </div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="login-custom-input"
                required
              />
            </div>

            <button type="submit" className="login-vibrant-submit-btn">
              <span>ENTER OWNER DASHBOARD</span>
              <ArrowRight size={14} className="stroke-[3]" />
            </button>

            <div className="login-divider-row">
              <span>or</span>
            </div>

            <div className="text-center space-y-3 pt-1">
              <p className="registration-prompt-text">
                Not a partner yet?{" "}
                <button type="button" onClick={() => setViewState("register")} className="register-highlight-link bg-transparent border-none p-0 cursor-pointer">
                  Register here
                </button>
              </p>
              <div>
                <Link href="/" className="back-home-utility-link">← Back to Home</Link>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 2: NEW REGISTER USER ACCOUNT FIELDS SCREEN */}
      {viewState === "register" && (
        <div className="login-card-container">
          <div className="text-center mb-2">
            <h1 className="brand-logo-text">MUKIJO</h1>
            <h2 className="login-title-sub">Partner Registration</h2>
            <p className="login-description-text">Create your administrative venue access profile</p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 mt-5">
            <div className="input-stack-box">
              <label className="login-field-label">User Name</label>
              <input
                type="text"
                name="username"
                value={regData.username}
                onChange={handleRegInputChange}
                placeholder="e.g., admin_star_turf"
                className="login-custom-input"
                required
              />
            </div>

            <div className="input-stack-box">
              <label className="login-field-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={regData.email}
                onChange={handleRegInputChange}
                placeholder="owner@domain.com"
                className="login-custom-input"
                required
              />
            </div>

            <div className="input-stack-box">
              <label className="login-field-label">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={regData.phoneNumber}
                onChange={handleRegInputChange}
                placeholder="10-digit mobile number"
                className="login-custom-input"
                required
              />
            </div>

            <div className="input-stack-box">
              <label className="login-field-label">Password</label>
              <input
                type="password"
                name="password"
                value={regData.password}
                onChange={handleRegInputChange}
                placeholder="••••••••"
                className="login-custom-input"
                required
              />
            </div>

            <div className="input-stack-box pb-2">
              <label className="login-field-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={regData.confirmPassword}
                onChange={handleRegInputChange}
                placeholder="••••••••"
                className="login-custom-input"
                required
              />
            </div>

            <button type="submit" className="login-vibrant-submit-btn">
              <span>REGISTER ACCOUNT</span>
              <ArrowRight size={14} className="stroke-[3]" />
            </button>

            <div className="text-center pt-3 border-t border-white/5 mt-4">
              <p className="registration-prompt-text">
                Already have an account?{" "}
                <button type="button" onClick={() => setViewState("login")} className="register-highlight-link bg-transparent border-none p-0 cursor-pointer">
                  Login instead
                </button>
              </p>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}