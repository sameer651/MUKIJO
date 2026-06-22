"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../../../styles/partner-portal.css";

const AVAILABLE_SPORTS = ["football", "badminton", "cricket", "tennis", "pickleball"];
const AVAILABLE_AMENITIES = ["Parking", "Washroom", "Drinking Water", "Changing Rooms", "Floodlights", "Cafe"];

export default function RegisterVenuePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Venue form state
    const [venueData, setVenueData] = useState({
        name: "",
        location: "",
        sports_supported: [],
        amenities: [],
        cover_image: null,
        venue_images: []
    });

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
    };

    // Helper to validate if a file is JPEG/JPG
    const validateJpg = (file) => {
        const fileType = file.type;
        const fileName = file.name.toLowerCase();
        return fileType === "image/jpeg" || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg");
    };

    // Handle cover photo upload
    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!validateJpg(file)) {
            showToast("Only JPG/JPEG files are allowed for the cover photo.", "error");
            e.target.value = ""; // clear input
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setVenueData(prev => ({ ...prev, cover_image: reader.result }));
            showToast("Cover photo uploaded successfully.");
        };
        reader.readAsDataURL(file);
    };

    // Handle multiple venue photos upload
    const handleVenuePhotosChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const validFiles = [];
        for (let file of files) {
            if (!validateJpg(file)) {
                showToast(`Skipped "${file.name}": Only JPG/JPEG format is allowed.`, "error");
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            e.target.value = "";
            return;
        }

        let processedCount = 0;
        const newImages = [];

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                newImages.push(reader.result);
                processedCount++;
                if (processedCount === validFiles.length) {
                    setVenueData(prev => ({
                        ...prev,
                        venue_images: [...prev.venue_images, ...newImages]
                    }));
                    showToast(`Successfully added ${validFiles.length} photos.`);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = ""; // reset file input
    };

    // Remove cover photo
    const handleRemoveCover = () => {
        setVenueData(prev => ({ ...prev, cover_image: null }));
        showToast("Cover photo removed.");
    };

    // Remove specific venue photo
    const handleRemoveVenuePhoto = (indexToRemove) => {
        setVenueData(prev => ({
            ...prev,
            venue_images: prev.venue_images.filter((_, idx) => idx !== indexToRemove)
        }));
        showToast("Venue photo removed.");
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        const ownerId = localStorage.getItem("userId") || 9;

        if (!venueData.name || !venueData.location) {
            showToast("Venue name and location address are required.", "error");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                owner_id: parseInt(ownerId),
                name: venueData.name,
                location: venueData.location,
                latitude: null,
                longitude: null,
                sports_supported: JSON.stringify(venueData.sports_supported),
                amenities: JSON.stringify(venueData.amenities),
                rating: 5.0,
                cover_image: venueData.cover_image,
                venue_images: JSON.stringify(venueData.venue_images)
            };

            const response = await fetch("http://127.0.0.1:8001/venues", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast("Venue successfully registered!");
                setTimeout(() => {
                    router.push("/dashboard/venue-partner");
                }, 1000);
            } else {
                const errData = await response.json();
                showToast(errData.detail || "Failed to register venue.", "error");
            }
        } catch (error) {
            console.error("Error submitting venue:", error);
            showToast("Network error occurred.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="partner-portal-container register-page-container" style={{ color: "#ffffff" }}>
            <header className="portal-header" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <div>
                    <h1 style={{ color: "#ffffff", background: "none", WebkitTextFillColor: "initial", fontSize: "28px" }}>
                        Register New Venue
                    </h1>
                    <p style={{ color: "#cbd5e1" }}>Add a new arena or turf to your partner account catalog.</p>
                </div>
                <button 
                    type="button"
                    className="unblock-btn" 
                    onClick={() => router.push("/dashboard/venue-partner")}
                    style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.2)", height: "40px", padding: "0 16px" }}
                >
                    Back to Dashboard
                </button>
            </header>

            <form onSubmit={handleSubmit} className="register-page-form" style={{ maxWidth: "800px", margin: "0 auto" }}>
                
                <div className="form-section-card" style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.1)", padding: "28px", borderRadius: "12px", marginBottom: "24px" }}>
                    {/* Subsection 1: Basic Information */}
                    <h3 style={{ color: "#ffffff", fontSize: "16px", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                        General Details
                    </h3>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "#cbd5e1" }}>
                            Venue Name *
                        </label>
                        <input 
                            type="text" 
                            required
                            className="form-input"
                            placeholder="e.g. Skyline Sports Turf"
                            value={venueData.name}
                            onChange={(e) => setVenueData({ ...venueData, name: e.target.value })}
                            style={{ width: "100%", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#ffffff", padding: "10px", borderRadius: "6px" }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "#cbd5e1" }}>
                            Location Address *
                        </label>
                        <input 
                            type="text" 
                            required
                            className="form-input"
                            placeholder="e.g. Plot 43, Hitec City, Hyderabad"
                            value={venueData.location}
                            onChange={(e) => setVenueData({ ...venueData, location: e.target.value })}
                            style={{ width: "100%", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#ffffff", padding: "10px", borderRadius: "6px" }}
                        />
                    </div>

                    {/* Subsection 2: Image Uploads */}
                    <h3 style={{ color: "#ffffff", fontSize: "16px", marginTop: "32px", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                        Upload Media (JPG Format Only)
                    </h3>
                    
                    {/* Cover Photo */}
                    <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "#cbd5e1" }}>
                            Cover Image (JPG Only)
                        </label>
                        <input 
                            type="file" 
                            accept=".jpg,.jpeg"
                            onChange={handleCoverChange}
                            style={{ display: "block", color: "#ffffff", fontSize: "13px" }}
                        />
                        {venueData.cover_image && (
                            <div className="image-preview-wrapper" style={{ marginTop: "12px", position: "relative", width: "100%", maxHeight: "200px", borderRadius: "8px", overflow: "hidden" }}>
                                <img 
                                    src={venueData.cover_image} 
                                    alt="Cover Preview" 
                                    style={{ width: "100%", height: "200px", objectFit: "cover" }}
                                />
                                <button 
                                    type="button" 
                                    className="remove-img-btn" 
                                    onClick={handleRemoveCover}
                                    style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(239, 68, 68, 0.8)", border: "none", color: "#ffffff", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                                >
                                    Remove Cover
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Venue Photos */}
                    <div className="form-group" style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "#cbd5e1" }}>
                            Additional Venue Photos (JPG Only)
                        </label>
                        <input 
                            type="file" 
                            accept=".jpg,.jpeg"
                            multiple
                            onChange={handleVenuePhotosChange}
                            style={{ display: "block", color: "#ffffff", fontSize: "13px" }}
                        />
                        
                        {venueData.venue_images.length > 0 && (
                            <div className="photos-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px", marginTop: "16px" }}>
                                {venueData.venue_images.map((img, idx) => (
                                    <div key={idx} className="venue-photo-card" style={{ position: "relative", width: "120px", height: "120px", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                                        <img 
                                            src={img} 
                                            alt={`Preview ${idx}`} 
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveVenuePhoto(idx)}
                                            style={{ position: "absolute", bottom: "4px", right: "4px", background: "rgba(239, 68, 68, 0.8)", border: "none", color: "#ffffff", borderRadius: "50%", width: "22px", height: "22px", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}
                                            title="Remove Photo"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Subsection 3: Sports and Amenities */}
                    <h3 style={{ color: "#ffffff", fontSize: "16px", marginTop: "32px", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                        Sports & Amenities
                    </h3>

                    {/* Sports supported */}
                    <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "#cbd5e1" }}>
                            Supported Sports
                        </label>
                        <div className="checkbox-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                            {AVAILABLE_SPORTS.map(sport => {
                                const checked = venueData.sports_supported.includes(sport);
                                return (
                                    <label key={sport} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#ffffff" }}>
                                        <input 
                                            type="checkbox" 
                                            checked={checked}
                                            onChange={() => {
                                                const list = checked
                                                    ? venueData.sports_supported.filter(s => s !== sport)
                                                    : [...venueData.sports_supported, sport];
                                                setVenueData({ ...venueData, sports_supported: list });
                                            }}
                                            style={{ cursor: "pointer" }}
                                        />
                                        <span>{sport.charAt(0).toUpperCase() + sport.slice(1)}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Amenities Offered */}
                    <div className="form-group">
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "#cbd5e1" }}>
                            Amenities Offered
                        </label>
                        <div className="checkbox-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                            {AVAILABLE_AMENITIES.map(amenity => {
                                const checked = venueData.amenities.includes(amenity);
                                return (
                                    <label key={amenity} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#ffffff" }}>
                                        <input 
                                            type="checkbox" 
                                            checked={checked}
                                            onChange={() => {
                                                const list = checked
                                                    ? venueData.amenities.filter(a => a !== amenity)
                                                    : [...venueData.amenities, amenity];
                                                setVenueData({ ...venueData, amenities: list });
                                            }}
                                            style={{ cursor: "pointer" }}
                                        />
                                        <span>{amenity}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Form Buttons */}
                    <div style={{ display: "flex", gap: "16px", marginTop: "32px" }}>
                        <button 
                            type="button" 
                            className="unblock-btn" 
                            onClick={() => router.push("/dashboard/venue-partner")}
                            style={{ flex: 1, color: "#ffffff", borderColor: "rgba(255,255,255,0.2)", padding: "14px", borderRadius: "8px", fontWeight: "700" }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="confirm-booking-btn" 
                            disabled={loading}
                            style={{ flex: 2, padding: "14px", borderRadius: "8px", fontWeight: "700" }}
                        >
                            {loading ? "Registering Venue..." : "Register & Onboard Venue"}
                        </button>
                    </div>
                </div>
            </form>

            {/* Toast status alert notification */}
            {toast.show && (
                <div className={`status-toast ${toast.type}`}>
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
