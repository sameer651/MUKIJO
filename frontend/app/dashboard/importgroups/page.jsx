"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import "../../styles/dashboard.css";

export default function ImportGroupsPage() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const router = useRouter();

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        
        const ws = XLSX.utils.json_to_sheet([
            {
                group_name: "Weekend Warriors",
                activity: "Basketball",
                age_group: "Adults",
                sub_group: "Beginners",
                description: "Casual weekend games",
                first_name: "John",
                last_name: "Doe",
                email: "john@example.com",
                phone: "1234567890",
                role: "Member"
            },
            {
                group_name: "Weekend Warriors",
                activity: "Basketball",
                age_group: "Adults",
                sub_group: "Beginners",
                description: "Casual weekend games",
                first_name: "Jane",
                last_name: "Smith",
                email: "jane@example.com",
                phone: "0987654321",
                role: "Captain"
            }
        ]);
        XLSX.utils.book_append_sheet(wb, ws, "Groups And Members");

        XLSX.writeFile(wb, "Import_Template.xlsx");
    };

    const handleImport = async () => {
        if (!file) {
            alert("Please select a file first");
            return;
        }

        const userId = localStorage.getItem("userId");
        if (!userId) {
            alert("Please log in first");
            return;
        }

        setLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("owner_id", userId);

        try {
            const response = await fetch(`http://127.0.0.1:8001/groups/import`, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setResult({ success: true, message: data.message });
                window.dispatchEvent(new Event("groupsUpdated")); // Refresh sidebar
                
                // Redirect after short delay
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            } else {
                const errorData = await response.json();
                setResult({ success: false, message: errorData.detail || "Import failed" });
            }
        } catch (error) {
            console.error("Error importing:", error);
            setResult({ success: false, message: "Network error occurred during import" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="import-container">
            <div className="import-card">
                <h2>Import Groups</h2>
                <p>Upload an Excel file to bulk create groups.</p>

                <div className="template-section">
                    <h4>1. Download Template</h4>
                    <p>Use our template to ensure your data is formatted correctly.</p>
                    <button onClick={downloadTemplate} className="download-btn">
                        Download Excel Template
                    </button>
                </div>

                <div className="upload-section">
                    <h4>2. Upload File</h4>
                    <div className="file-input-wrapper">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={handleFileChange}
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="file-label">
                            {file ? file.name : "Choose Excel file"}
                        </label>
                    </div>
                </div>

                {result && (
                    <div className={`result-message ${result.success ? 'success' : 'error'}`}>
                        {result.message}
                    </div>
                )}

                <div className="actions">
                    <button 
                        className="cancel-btn"
                        onClick={() => router.push("/dashboard")}
                    >
                        Cancel
                    </button>
                    <button 
                        className="import-btn"
                        onClick={handleImport}
                        disabled={!file || loading}
                    >
                        {loading ? "Importing..." : "Start Import"}
                    </button>
                </div>
            </div>
        </div>
    );
}
