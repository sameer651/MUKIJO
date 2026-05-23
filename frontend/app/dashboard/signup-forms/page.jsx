"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Users, ArrowLeft, Plus, Trash2, Eye, Check, X, ShieldAlert, Sparkles } from "lucide-react";
import "../../styles/signup-forms.css";

export default function SignupFormsDashboard() {
    const [activeTab, setActiveTab] = useState("forms"); // "forms" or "submissions"
    const [forms, setForms] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sessionError, setSessionError] = useState("");

    // Form Editor State
    const [selectedForm, setSelectedForm] = useState(null);
    const [editorForm, setEditorForm] = useState({
        title: "",
        description: "",
        role: "",
        fields: []
    });

    // Modals
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [approvingSubmission, setApprovingSubmission] = useState(null);
    const [approveGroupId, setApproveGroupId] = useState("");

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

    const fetchData = useCallback(async () => {
        setLoading(true);
        setSessionError("");
        try {
            const clubsRes = await fetch("http://127.0.0.1:8001/clubs");
            if (clubsRes.ok) {
                const clubsData = await clubsRes.json();
                const currentClub = clubsData.find((club) => String(club.id) === String(userId));
                if (!currentClub) {
                    setForms([]);
                    setSubmissions([]);
                    setGroups([]);
                    setSessionError("Your club admin session is not valid. Please log in again as the club admin, then open the onboarding queue.");
                    return;
                }
            }

            // Fetch Forms
            const formsRes = await fetch(`http://127.0.0.1:8001/signup-forms?owner_id=${userId}`);
            if (formsRes.ok) {
                const formsData = await formsRes.json();
                setForms(formsData);
            }

            // Fetch Submissions
            const subsRes = await fetch(`http://127.0.0.1:8001/signup-submissions?owner_id=${userId}`);
            if (subsRes.ok) {
                const subsData = await subsRes.json();
                setSubmissions(subsData);
            }

            // Fetch Groups for approval dropdown
            const groupsRes = await fetch(`http://127.0.0.1:8001/groups?owner_id=${userId}`);
            if (groupsRes.ok) {
                const groupsData = await groupsRes.json();
                setGroups(groupsData);
                if (groupsData.length > 0) {
                    setApproveGroupId(groupsData[0].id.toString());
                }
            }
        } catch (error) {
            console.error("Error fetching signup dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchData();
        }
    }, [userId, fetchData]);

    function handleStartEdit(form) {
        let parsedFields = [];
        try {
            parsedFields = typeof form.fields === "string" ? JSON.parse(form.fields) : form.fields;
        } catch (e) {
            console.error("Error parsing fields", e);
            parsedFields = [];
        }

        setSelectedForm(form);
        setEditorForm({
            title: form.title || "",
            description: form.description || "",
            role: form.role || "",
            fields: parsedFields
        });
    }

    function handleFieldChange(index, key, value) {
        const updatedFields = [...editorForm.fields];
        updatedFields[index] = {
            ...updatedFields[index],
            [key]: value
        };
        // Update field name if label changes
        if (key === "label") {
            updatedFields[index].name = value.toLowerCase().replace(/[^a-z0-9]/g, "_");
        }
        setEditorForm({ ...editorForm, fields: updatedFields });
    }

    function handleAddField() {
        const newIndex = editorForm.fields.length + 1;
        const newField = {
            name: `custom_field_${newIndex}`,
            label: `Custom Field ${newIndex}`,
            type: "text",
            required: false,
            placeholder: "Enter details"
        };
        setEditorForm({
            ...editorForm,
            fields: [...editorForm.fields, newField]
        });
    }

    function handleRemoveField(index) {
        const updatedFields = editorForm.fields.filter((_, i) => i !== index);
        setEditorForm({ ...editorForm, fields: updatedFields });
    }

    async function handleSaveForm() {
        try {
            const body = {
                owner_id: parseInt(userId),
                role: editorForm.role,
                title: editorForm.title,
                description: editorForm.description,
                fields: JSON.stringify(editorForm.fields)
            };

            const response = await fetch("http://127.0.0.1:8001/signup-forms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                alert("Signup form customized successfully!");
                setSelectedForm(null);
                fetchData();
            } else {
                alert("Failed to save signup form configuration.");
            }
        } catch (error) {
            console.error("Error saving signup form:", error);
            alert("Connection error while saving signup form.");
        }
    }

    async function handleDeleteSubmission(id) {
        if (!confirm("Are you sure you want to reject and delete this application?")) return;

        try {
            const response = await fetch(`http://127.0.0.1:8001/signup-submissions/${id}?owner_id=${userId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                setSubmissions(submissions.filter(s => s.id !== id));
                alert("Application deleted/rejected successfully.");
            } else {
                alert("Failed to reject application.");
            }
        } catch (error) {
            console.error("Error rejecting submission:", error);
        }
    }

    async function handleConfirmApprove() {
        try {
            const groupParam = approveGroupId ? `&group_id=${approveGroupId}` : "";
            const response = await fetch(`http://127.0.0.1:8001/signup-submissions/${approvingSubmission.id}/approve?owner_id=${userId}${groupParam}`, {
                method: "POST"
            });

            if (response.ok) {
                alert("Applicant accepted. The member can now log in with the registered email and password.");
                setApprovingSubmission(null);
                fetchData();
            } else {
                const errorData = await response.json();
                alert(`Approval failed: ${errorData.detail || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error approving submission:", error);
            alert("Connection error during approval.");
        }
    }

    function renderFieldEditor() {
        return (
            <div className="split-editor">
                {/* Left Side: Fields Configurator */}
                <div className="editor-left">
                    <div className="editor-title-row">
                        <button className="back-btn" onClick={() => setSelectedForm(null)}>
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h2>Customize Form</h2>
                            <span style={{ fontSize: "12px", color: "#3b82f6", fontWeight: 700, textTransform: "uppercase" }}>
                                {editorForm.role} Role
                            </span>
                        </div>
                    </div>

                    <div className="editor-form-group">
                        <label>Form Title</label>
                        <input
                            type="text"
                            className="editor-input"
                            value={editorForm.title}
                            onChange={(e) => setEditorForm({ ...editorForm, title: e.target.value })}
                            placeholder="e.g., Players Application Form"
                        />
                    </div>

                    <div className="editor-form-group">
                        <label>Description / Instructions</label>
                        <textarea
                            className="editor-input"
                            style={{ height: "70px", resize: "none" }}
                            value={editorForm.description}
                            onChange={(e) => setEditorForm({ ...editorForm, description: e.target.value })}
                            placeholder="Add brief details for applicants..."
                        />
                    </div>

                    <div className="fields-section">
                        <div className="fields-section-header">
                            <h3>Form Fields</h3>
                            <button className="add-field-btn" onClick={handleAddField}>
                                <Plus size={14} /> Add Field
                            </button>
                        </div>

                        <div className="fields-list">
                            {editorForm.fields.map((field, index) => (
                                <div key={index} className="field-config-row">
                                    <input
                                        type="text"
                                        className="editor-input"
                                        style={{ padding: "6px 10px" }}
                                        value={field.label}
                                        onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                                        placeholder="Field Label"
                                    />
                                    <select
                                        className="editor-input"
                                        style={{ padding: "5px 10px" }}
                                        value={field.type}
                                        onChange={(e) => handleFieldChange(index, "type", e.target.value)}
                                    >
                                        <option value="text">Short Text</option>
                                        <option value="number">Number</option>
                                        <option value="email">Email</option>
                                        <option value="tel">Phone</option>
                                        <option value="date">Date</option>
                                        <option value="select">Dropdown</option>
                                    </select>
                                    <input
                                        type="text"
                                        className="editor-input"
                                        style={{ padding: "6px 10px" }}
                                        value={field.placeholder || ""}
                                        onChange={(e) => handleFieldChange(index, "placeholder", e.target.value)}
                                        placeholder="Placeholder"
                                    />
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => handleFieldChange(index, "required", e.target.checked)}
                                            id={`req-${index}`}
                                        />
                                        <label htmlFor={`req-${index}`} style={{ margin: 0, fontSize: "11px", fontWeight: "normal", color: "#64748b" }}>
                                            Req
                                        </label>
                                    </div>
                                    <button className="field-delete-btn" onClick={() => handleRemoveField(index)}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="save-actions-row">
                        <button className="cancel-btn" onClick={() => setSelectedForm(null)}>
                            Cancel
                        </button>
                        <button className="save-btn" onClick={handleSaveForm}>
                            Save Configuration
                        </button>
                    </div>
                </div>

                {/* Right Side: Interactive Live Form Preview */}
                <div className="editor-right">
                    <span className="preview-badge">
                        <Sparkles size={11} style={{ marginRight: "4px" }} /> Interactive Preview
                    </span>

                    <div className="preview-form">
                        <h2>{editorForm.title || "Applicant Signup Form"}</h2>
                        <p>{editorForm.description || "Apply to register. Fill in the customized details below."}</p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            {editorForm.fields.map((field, idx) => (
                                <div key={idx} className="preview-field">
                                    <label>
                                        {field.label || "Untitled Field"} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                                    </label>
                                    {field.type === "select" ? (
                                        <select className="preview-input" disabled>
                                            <option>{field.placeholder || "Select option..."}</option>
                                            {(field.options || ["Option 1", "Option 2"]).map((opt, i) => (
                                                <option key={i} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type}
                                            className="preview-input"
                                            placeholder={field.placeholder || ""}
                                            disabled
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className="preview-submit-btn" disabled>
                            Submit Application
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    function renderFormsBuilder() {
        return (
            <div>
                <div className="cards-grid">
                    {forms.map((form, idx) => {
                        const isCoach = form.role.toLowerCase() === "coach";
                        const displayTitle = isCoach ? "Coaches Form" : `${form.role}s Form`;
                        const displaySubtitle = `${form.role} Registration`;
                        
                        return (
                            <div key={idx} className="form-role-card" onClick={() => handleStartEdit(form)}>
                                <div className="card-icon-wrapper">
                                    <FileText size={20} />
                                </div>
                                <h3>{displayTitle}</h3>
                                <p>{displaySubtitle}</p>
                                <div className="card-meta">
                                    <span className={`badge ${form.is_customized ? "badge-customized" : "badge-default"}`}>
                                        {form.is_customized ? "Customized" : "Default Template"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderSubmissions() {
        return (
            <div className="applications-container">
                <div className="applications-filter-row">
                    <h2>Onboarding Queue</h2>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                        {submissions.length} Pending Application{submissions.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {submissions.length === 0 ? (
                    <div className="no-apps-state">
                        <FileText size={48} />
                        <h3>No candidate applications yet</h3>
                        <p>When coaches, parents, players, or referees sign up through the public registration portal, their applications will show up here.</p>
                    </div>
                ) : (
                    <div className="app-table-wrapper">
                        <table className="app-table">
                            <thead>
                                <tr>
                                    <th>Applicant Name</th>
                                    <th>Role</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Submitted Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((sub) => {
                                    let parsedData = {};
                                    try {
                                        parsedData = typeof sub.submitted_data === "string" ? JSON.parse(sub.submitted_data) : sub.submitted_data;
                                    } catch (e) {
                                        console.error("Error parsing submitted data", e);
                                    }

                                    const firstName = parsedData.first_name || parsedData.firstName || "Applicant";
                                    const lastName = parsedData.last_name || parsedData.lastName || "";
                                    const email = parsedData.email || "No email";
                                    const name = `${firstName} ${lastName}`.trim();
                                    const dateStr = sub.created_at ? new Date(sub.created_at).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric"
                                    }) : "Unknown";

                                    const roleClass = `role-${sub.role.toLowerCase()}`;

                                    return (
                                        <tr key={sub.id}>
                                            <td style={{ fontWeight: 600, color: "#0f172a" }}>{name}</td>
                                            <td>
                                                <span className={`app-role-badge ${roleClass}`}>
                                                    {sub.role}
                                                </span>
                                            </td>
                                            <td>{email}</td>
                                            <td>
                                                <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: "6px", background: "#fff7ed", color: "#9a3412", fontSize: "12px", fontWeight: 700 }}>
                                                    Waiting approval
                                                </span>
                                            </td>
                                            <td>{dateStr}</td>
                                            <td>
                                                <button
                                                    className="app-action-btn btn-view"
                                                    onClick={() => setSelectedSubmission(sub)}
                                                >
                                                    <Eye size={12} style={{ marginRight: "4px" }} /> View
                                                </button>
                                                <button
                                                    className="app-action-btn btn-approve"
                                                    onClick={() => {
                                                        setApprovingSubmission(sub);
                                                    }}
                                                >
                                                    <Check size={12} style={{ marginRight: "4px" }} /> Accept
                                                </button>
                                                <button
                                                    className="app-action-btn btn-reject"
                                                    onClick={() => handleDeleteSubmission(sub.id)}
                                                >
                                                    <X size={12} style={{ marginRight: "4px" }} /> Reject
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    function renderDetailsModal() {
        if (!selectedSubmission) return null;

        let parsedData = {};
        try {
            parsedData = typeof selectedSubmission.submitted_data === "string" ? JSON.parse(selectedSubmission.submitted_data) : selectedSubmission.submitted_data;
        } catch (e) {
            console.error("Error parsing details", e);
        }

        return (
            <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h3 style={{ margin: 0 }}>Candidate Profile Details</h3>
                        <button className="back-btn" onClick={() => setSelectedSubmission(null)}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="applicant-details-grid">
                        <div className="details-row">
                            <span className="details-label">Applicant Role</span>
                            <span className="details-value" style={{ fontWeight: 700, color: "#3b82f6" }}>{selectedSubmission.role}</span>
                        </div>
                        {Object.entries(parsedData).map(([key, val]) => {
                            // Beautify keys
                            const label = key
                                .replace(/_/g, " ")
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase());
                            const displayValue = key.toLowerCase().includes("password") ? "Hidden" : (val?.toString() || "N/A");
                            
                            return (
                                <div className="details-row" key={key}>
                                    <span className="details-label">{label}</span>
                                    <span className="details-value">{displayValue}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="modal-actions">
                        <button className="cancel-btn" onClick={() => setSelectedSubmission(null)}>
                            Close Profile
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    function renderApproveModal() {
        if (!approvingSubmission) return null;

        let parsedData = {};
        try {
            parsedData = typeof approvingSubmission.submitted_data === "string" ? JSON.parse(approvingSubmission.submitted_data) : approvingSubmission.submitted_data;
        } catch (e) {
            console.error("Error parsing approve submission data", e);
        }

        const name = `${parsedData.first_name || parsedData.firstName || "Applicant"} ${parsedData.last_name || parsedData.lastName || ""}`.trim();

        return (
            <div className="modal-overlay" onClick={() => setApprovingSubmission(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h3 style={{ margin: 0 }}>Accept Applicant</h3>
                        <button className="back-btn" onClick={() => setApprovingSubmission(null)}>
                            <X size={16} />
                        </button>
                    </div>

                    <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                        Accept <strong style={{ color: "#0f172a" }}>{name}</strong> ({approvingSubmission.role}) into the club. After you accept, they can log in with the email and password used during registration.
                    </p>

                    <div className="editor-form-group">
                        <label>Select Team / Group</label>
                        {groups.length === 0 ? (
                            <div style={{ background: "#f0fdf4", color: "#166534", padding: "12px", borderRadius: "8px", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
                                <ShieldAlert size={16} />
                                <span>No groups found. The app will create an Approved Members group automatically.</span>
                            </div>
                        ) : (
                            <select
                                className="editor-input"
                                value={approveGroupId}
                                onChange={(e) => setApproveGroupId(e.target.value)}
                            >
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.group_name} ({group.activity})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="modal-actions" style={{ marginTop: "24px" }}>
                        <button className="cancel-btn" onClick={() => setApprovingSubmission(null)}>
                            Cancel
                        </button>
                        <button
                            className="save-btn"
                            style={{ background: "#10b981", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)" }}
                            onClick={handleConfirmApprove}
                        >
                            Accept Candidate
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="signup-forms-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <div style={{ textAlign: "center", color: "#64748b" }}>
                    <div style={{ width: "40px", height: "40px", border: "4px solid #cbd5e1", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
                    <p style={{ fontWeight: 600 }}>Loading custom signup config stream...</p>
                </div>
                <style jsx>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (sessionError) {
        return (
            <div className="signup-forms-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <div style={{ maxWidth: "520px", background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", padding: "22px", borderRadius: "8px", textAlign: "center" }}>
                    <ShieldAlert size={28} style={{ marginBottom: "10px" }} />
                    <h2 style={{ margin: "0 0 8px", color: "#7c2d12", fontSize: "20px" }}>Admin Login Needed</h2>
                    <p style={{ margin: "0 0 18px", fontSize: "14px", lineHeight: 1.5 }}>{sessionError}</p>
                    <button
                        className="save-btn"
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = "/login";
                        }}
                    >
                        Go to Admin Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="signup-forms-container">
            {selectedForm ? (
                renderFieldEditor()
            ) : (
                <>
                    <div style={{ marginBottom: "24px" }}>
                        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Club Signups and Forms</h1>
                        <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0" }}>Configure customized onboarding forms for player squads, parent lists, coaches, and match referees.</p>
                    </div>

                    <div className="tabs-container">
                        <button
                            className={`tab-btn ${activeTab === "forms" ? "active" : ""}`}
                            onClick={() => setActiveTab("forms")}
                        >
                            <FileText size={16} /> Forms Designer
                        </button>
                        <button
                            className={`tab-btn ${activeTab === "submissions" ? "active" : ""}`}
                            onClick={() => setActiveTab("submissions")}
                        >
                            <Users size={16} /> Onboarding Queue ({submissions.length})
                        </button>
                    </div>

                    {activeTab === "forms" ? renderFormsBuilder() : renderSubmissions()}
                </>
            )}

            {renderDetailsModal()}
            {renderApproveModal()}
        </div>
    );
}
