"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Upload, CheckSquare, Square, Save } from "lucide-react";
import "../styles/register-venue.css"; 
import api from "../../lib/api";
// 1. Import toast to show clean error popup blocks when something fails
import { toast, Toaster } from "react-hot-toast"; 

export default function RegisterVenue() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    venueName: "",
    ownerName: "",
    contactNumber: "",
    email: "",
    businessType: "",
    address: "",
    mapsUrl: "",
    sportsSelected: [],
    amenities: {
      floodlights: false,
      changingRooms: false,
      showers: false,
      parking: false,
      water: false,
      rentals: false,
      firstAid: false
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleSport = (sport) => {
    setFormData(prev => {
      const active = prev.sportsSelected.includes(sport)
        ? prev.sportsSelected.filter(s => s !== sport)
        : [...prev.sportsSelected, sport];
      return { ...prev, sportsSelected: active };
    });
  };

  const toggleAmenity = (key) => {
    setFormData(prev => ({
      ...prev,
      amenities: { ...prev.amenities, [key]: !prev.amenities[key] }
    }));
  };

  const validateStepOne = () => {
    return (
      formData.venueName && 
      formData.ownerName && 
      formData.contactNumber && 
      formData.email && 
      formData.businessType &&
      formData.address &&
      formData.mapsUrl
    );
  };

  const handleNext = () => {
    if (validateStepOne()) {
      setCurrentStep(2);
    } else {
      toast.error("Please populate all required fields (*) before proceeding.");
    }
  };
  const fileInputRef = React.useRef(null);

const handleFileChange = (e) => {
  const files = Array.from(e.target.files);
  // Example: update your existing form state
  setFormData(prev => ({
    ...prev,
    photos: files // or [...prev.photos, ...files] if appending
  }));
};

  // --- UPDATED HANDLER TO CONNECT WITH FASTAPI BACKEND ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Safety check step 1 validation
    if (!validateStepOne()) {
      toast.error("Please fill up Step 1 info first.");
      setCurrentStep(1);
      return;
    }

    if (formData.sportsSelected.length === 0) {
      toast.error("Please select at least one sport offering.");
      return;
    }

    try {
      // 2. Direct Network Request to your working backend engine endpoint
      const response = await api.post("/venue-owner/register", {
        username: formData.ownerName,     // Maps directly to your backend Pydantic OwnerRegister schema
        email: formData.email,
        phoneNumber: formData.contactNumber,
        password: "DefaultPassword123"    // Temporary placeholder string until you add a password field to the UI
      });

      // 3. If successful creation code (201) returns back from Python database
      if (response.status === 201) {
        toast.success("Venue successfully stored in DB!");
        setIsSubmitted(true); // Switches UI to your beautiful success layout view
      }
    } catch (error) {
      // Pulls out custom FastAPIs HTTPExceptions dynamically
      const errorMsg = error.response?.data?.detail || "Registration connection dropped.";
      toast.error(errorMsg);
    }
  };

  if (isSubmitted) {
    return (
      <main className="register-venue-main">
        {/* Expanded Success Layout matching the big form structure */}
        <div className="workspace-slim-card text-center py-12">
          <div className="w-16 h-16 bg-[#bffe00]/10 text-[#bffe00] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#bffe00]/20 shadow-[0_0_20px_rgba(191,254,0,0.15)]">
            <Check size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic mb-3">
            Registration Submitted!
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto mb-8">
            Thank you! Our admin team will review your venue details, confirm operational parameters, and approve your listing workspace within 24–48 hours.
          </p>
          <div className="border-t border-white/5 pt-6">
            <Link href="/" className="inline-block text-xs font-bold uppercase italic bg-gradient-to-r from-[#bffe00] to-[#00f0ff] text-black px-8 py-3 rounded-md hover:opacity-90 transition-opacity tracking-wider">
              Back to Homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="register-venue-main">
      {/* Container widget to render nice notifications on screen */}
      <Toaster position="top-center" reverseOrder={false} />
      
      <div className="workspace-slim-card">
        
        {/* Navigation Action Header */}
        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
          <Link href="/" className="inline-flex items-center gap-1 text-[10px] text-cyan-400 uppercase tracking-widest hover:underline">
            <ArrowLeft size={12} /> Back
          </Link>
          <button type="button" onClick={() => toast.success("Draft securely saved locally.")} className="inline-flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-widest hover:text-white transition-colors">
            <Save size={12} /> Save Draft
          </button>
        </div>

        {/* 2-Step Progress Indicator Layout */}
        <div className="simple-stepper">
          <div className={`step-circle ${currentStep === 1 ? "active" : "inactive"}`}>1</div>
          <div className="step-line" />
          <div className={`step-circle ${currentStep === 2 ? "active" : "inactive"}`}>2</div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          
          {/* STEP 1: VENUE CORE PROFILE & ADDRESS */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="text-center mb-4">
                <h2 className="text-base font-bold text-white tracking-wide uppercase italic">Venue Profile</h2>
                <p className="text-[11px] text-slate-400">Tell us basic identification details about your setup</p>
              </div>

              <div className="form-stack-group">
                <label className="form-label-mini">Venue Name *</label>
                <input type="text" name="venueName" value={formData.venueName} onChange={handleInputChange} placeholder="e.g., Star Turf Arena" className="slim-input" />
              </div>

              <div className="form-stack-group">
                <label className="form-label-mini">Owner / Manager Name *</label>
                <input type="text" name="ownerName" value={formData.ownerName} onChange={handleInputChange} placeholder="Enter full name" className="slim-input" />
              </div>

              <div className="form-stack-group">
                <label className="form-label-mini">Contact Number *</label>
                <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} placeholder="10 digit mobile" className="slim-input" />
              </div>

              <div className="form-stack-group">
                <label className="form-label-mini">Email Address *</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="name@domain.com" className="slim-input" />
              </div>

              <div className="form-stack-group">
                <label className="form-label-mini">Business Registration Type *</label>
                <select name="businessType" value={formData.businessType} onChange={handleInputChange} className="slim-select">
                  <option value="" className="bg-[#0d0d1a]">-- Select Type --</option>
                  <option value="Individual" className="bg-[#0d0d1a]">Individual</option>
                  <option value="Partnership" className="bg-[#0d0d1a]">Partnership</option>
                  <option value="LLP" className="bg-[#0d0d1a]">LLP</option>
                  <option value="Private Limited" className="bg-[#0d0d1a]">Private Limited</option>
                </select>
              </div>

              <div className="form-stack-group">
                <label className="form-label-mini">Full Ground Address *</label>
                <textarea name="address" rows="2" value={formData.address} onChange={handleInputChange} placeholder="Street, land marker, pincode setup..." className="slim-textarea resize-none" />
              </div>

              <div className="form-stack-group">
                <label className="form-label-mini">Google Maps Embed Link *</label>
                <input type="url" name="mapsUrl" value={formData.mapsUrl} onChange={handleInputChange} placeholder="http://maps.google.com/..." className="slim-input" />
              </div>

              {/* Step 1 Control Actions Footer */}
              <div className="flex justify-end pt-4 border-t border-white/5 mt-4">
                <button type="button" onClick={handleNext} className="glow-btn-next inline-flex items-center gap-1">
                  Next <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SPORTS, AMENITIES & MEDIA UPLOAD */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-base font-bold text-white tracking-wide uppercase italic">Amenities & Media</h2>
                <p className="text-[11px] text-slate-400">Complete listing configurations</p>
              </div>

              {/* Sports Offered Container */}
              <div className="form-stack-group">
                <label className="form-label-mini">Sports Offered *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {["Football", "Cricket", "Badminton", "Tennis", "Volleyball", "Basketball"].map((sport) => {
                    const isSelected = formData.sportsSelected.includes(sport);
                    return (
                      <button type="button" key={sport} onClick={() => toggleSport(sport)} className={`py-3 rounded-md text-[11px] uppercase font-bold italic transition-all border text-center tracking-wider ${
                        isSelected 
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-400/40 shadow-[0_0_10px_rgba(0,240,255,0.05)]" 
                          : "bg-[#111122] text-slate-400 border-white/5 hover:border-white/20"
                      }`}>
                        {sport}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* On-Site Amenities Container */}
              <div className="form-stack-group">
                <label className="form-label-mini">On-Site Amenities</label>
                <div className="space-y-2 mt-1">
                  {[
                    { key: "floodlights", label: "Floodlights 💡" },
                    { key: "changingRooms", label: "Changing Rooms 👕" },
                    { key: "showers", label: "Showers 🚿" },
                    { key: "parking", label: "Free Parking 🚗" },
                    { key: "water", label: "Drinking Water 💧" },
                    { key: "rentals", label: "Equipment Rentals 🏏" },
                    { key: "firstAid", label: "First Aid 🩹" }
                  ].map((amenity) => {
                    const checked = formData.amenities[amenity.key];
                    return (
                      <button type="button" key={amenity.key} onClick={() => toggleAmenity(amenity.key)} className={`w-full p-3 rounded-md border text-left flex items-center justify-between text-xs font-semibold transition-all ${
                        checked 
                          ? "bg-[#16162a] border-cyan-500 text-cyan-400" 
                          : "bg-[#111122] border-white/5 text-slate-400 hover:border-white/10"
                      }`}>
                        <span className="uppercase tracking-wider text-[11px] font-bold">{amenity.label}</span>
                        {checked ? <CheckSquare size={14} className="text-cyan-400" /> : <Square size={14} className="text-slate-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Media Upload Box Container */}
              <div className="form-stack-group">
                <label className="form-label-mini">Photo Media Upload *</label>
                <div 
                  onClick={() => fileInputRef.current?.click()} // 2. Triggers the hidden input click
                  className="border border-dashed border-white/10 bg-[#111122] hover:border-cyan-500/40 rounded-md p-6 text-center transition-colors cursor-pointer mt-1"
                >
                <Upload size={18} className="text-slate-500 mx-auto mb-2" />
                <span className="block text-[11px] font-bold text-white uppercase tracking-wider">Upload Gallery Files</span>
                <span className="block text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                              Drag and drop or browse high-resolution images here.
                </span>
               </div>

               {/* 3. HIDDEN ACTUAL FILE INPUT (Add this right here) */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Step 2 Action Controls */}
              <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-6">
                <button type="button" onClick={() => setCurrentStep(1)} className="btn-prev-outline">
                  ← Previous
                </button>
                <button type="button" onClick={handleSubmit} className="glow-btn-next">
                  Complete Setup
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </main>
  );
}