"use client";

import { useEffect, useState, useRef } from "react";
import { 
    MessageSquare, 
    Users, 
    Bell, 
    Search, 
    Plus, 
    Send, 
    Bold, 
    Italic, 
    Underline, 
    Paperclip, 
    Smile, 
    FileText, 
    Image as ImageIcon, 
    Download, 
    Hash, 
    X, 
    Sparkles, 
    BookOpen
} from "lucide-react";
import "../../styles/messages.css";

const CHANNELS = ["general", "announcements", "training", "matchday"];

export default function MessagesPage() {
    // Navigation & Workspace Selection
    const [activeView, setActiveView] = useState("teams"); // "activity" | "chat" | "teams"
    const [activeTab, setActiveTab] = useState("posts"); // "posts" | "files" | "notes"
    
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [activeChannel, setActiveChannel] = useState("general");
    
    const [activeDM, setActiveDM] = useState(null);
    const [recentDMs, setRecentDMs] = useState([]);
    
    // Core Data Streams
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [unreadCounts, setUnreadCounts] = useState({});
    const [loading, setLoading] = useState(false);
    
    // Autocomplete Contact/Partner lookup
    const [partners, setPartners] = useState([]);
    const [contactSearch, setContactSearch] = useState("");
    const [showContactDropdown, setShowContactDropdown] = useState(false);
    const [isSearchingNewChat, setIsSearchingNewChat] = useState(false);
    
    // Composer File Attachment
    const [attachedFile, setAttachedFile] = useState(null);
    const fileInputRef = useRef(null);
    
    // Notes tab state
    const [notesText, setNotesText] = useState("");
    
    // Activity / Notification state
    const [activities, setActivities] = useState([
        { id: 1, title: "Welcome to Collaboration", desc: "Start chatting with your team members in various channels.", time: "Just now", type: "system" }
    ]);
    
    const chatHistoryRef = useRef(null);
    const pollingRef = useRef(null);

    // Current logged-in user context
    const [currentUser, setCurrentUser] = useState({
        id: 0,
        name: "Anonymous",
        type: "member",
        memberId: 0,
        groupId: 0
    });

    // Helper: Parse message content JSON attachment helper
    const parseMessageContent = (content) => {
        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === "object") {
                return {
                    text: parsed.text || "",
                    attachment: parsed.attachment || null
                };
            }
        } catch {
            // Treat as plain text
        }
        return { text: content, attachment: null };
    };

    // Helper: Fetch channels/groups
    const fetchChannels = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        try {
            const response = await fetch(`http://127.0.0.1:8001/groups?owner_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                
                const isMember = localStorage.getItem("isMember") === "true";
                const memberGroupId = parseInt(localStorage.getItem("groupId") || "0");
                
                let filteredGroups = data;
                if (isMember && memberGroupId > 0) {
                    filteredGroups = data.filter(g => g.id === memberGroupId);
                }

                setGroups(filteredGroups);
                if (filteredGroups.length > 0 && !activeGroup && !activeDM) {
                    setActiveGroup(filteredGroups[0]);
                    setActiveChannel("general");
                }
            }
        } catch (error) {
            console.error("Error fetching groups/channels:", error);
        }
    };

    // Helper: Fetch all potential partners in the club
    const fetchPartners = async (clubId) => {
        if (!clubId) return;
        try {
            const response = await fetch(`http://127.0.0.1:8001/messages/partners?club_id=${clubId}`);
            if (response.ok) {
                const data = await response.json();
                setPartners(data);
            }
        } catch (error) {
            console.error("Error fetching partners:", error);
        }
    };

    // Helper: Fetch messages for active window
    const fetchMessages = async (updateHistory = true) => {
        if (activeGroup) {
            try {
                const response = await fetch(
                    `http://127.0.0.1:8001/messages/group/${activeGroup.id}?channel=${activeChannel}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (updateHistory) setMessages(data);
                    return data;
                }
            } catch (error) {
                console.error("Error fetching group channel messages:", error);
            }
        } else if (activeDM) {
            try {
                const response = await fetch(
                    `http://127.0.0.1:8001/messages/dm/${activeDM.id}?recipient_type=${activeDM.type}&sender_id=${currentUser.id}&sender_type=${currentUser.type}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (updateHistory) setMessages(data);
                    return data;
                }
            } catch (error) {
                console.error("Error fetching DM messages:", error);
            }
        }
        return [];
    };

    // Helper: Calculate unread counts globally and dispatch event
    const updateGlobalBadge = (currentUnreads) => {
        const totalUnreads = Object.values(currentUnreads).reduce((sum, val) => sum + val, 0);
        localStorage.setItem("total_unread_messages", totalUnreads.toString());
        window.dispatchEvent(new Event("unreadMessagesUpdated"));
    };

    // Helper: Scan all loaded messages for images/files in current conversation
    const getExtractedFiles = () => {
        const list = [];
        messages.forEach(msg => {
            const parsed = parseMessageContent(msg.content);
            if (parsed.attachment) {
                list.push({
                    id: msg.id,
                    name: `attachment_img_${msg.id}.jpg`,
                    url: parsed.attachment,
                    sender: msg.sender_name,
                    date: new Date(msg.created_at).toLocaleDateString()
                });
            }
        });
        return list;
    };

    // Helper: Handle Contact Selection for new DM
    const handleSelectContact = (partner) => {
        // Add to recent DMs list
        const updatedRecent = [partner, ...recentDMs.filter(p => !(p.id === partner.id && p.type === partner.type))];
        setRecentDMs(updatedRecent);
        localStorage.setItem(
            `recent_dms_user_${currentUser.id}_${currentUser.type}`,
            JSON.stringify(updatedRecent)
        );

        // Set active DM
        setActiveDM(partner);
        setActiveGroup(null);
        setActiveChannel(null);
        
        // Reset search
        setContactSearch("");
        setShowContactDropdown(false);
        setIsSearchingNewChat(false);
    };

    // Scroll chat history to bottom
    const scrollToBottom = () => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    };

    // 1. Initial configuration load hook
    useEffect(() => {
        const isMember = localStorage.getItem("isMember") === "true";
        const userId = parseInt(localStorage.getItem("userId") || "0");
        const userName = localStorage.getItem("userName") || "User";
        const memberId = parseInt(localStorage.getItem("memberId") || "0");
        const groupId = parseInt(localStorage.getItem("groupId") || "0");

        const userObj = {
            id: isMember ? memberId : userId,
            name: userName,
            type: isMember ? "member" : "admin",
            memberId: memberId,
            groupId: groupId
        };
        setCurrentUser(userObj);
        
        // Fetch all possible chat partners
        fetchPartners(userId);
        
        // Load recent DMs
        const storedDMs = localStorage.getItem(`recent_dms_user_${userObj.id}_${userObj.type}`);
        if (storedDMs) {
            try {
                setRecentDMs(JSON.parse(storedDMs));
            } catch (e) {
                console.error("Error parsing recent DMs", e);
            }
        }
    }, []);

    // 2. Fetch initial channels list
    useEffect(() => {
        fetchChannels();
    }, []);

    // 3. Reload messages on active channel/DM change
    useEffect(() => {
        setLoading(true);
        setMessages([]);
        fetchMessages(true).then(() => {
            setLoading(false);
            setTimeout(scrollToBottom, 60);

            // Mark active chat messages as read
            const chatKey = activeGroup 
                ? `group_${activeGroup.id}_channel_${activeChannel}`
                : `dm_${activeDM?.id}`;
            
            localStorage.setItem(`messages_last_seen_${currentUser.id}_${chatKey}`, Date.now().toString());
            
            setUnreadCounts(prev => {
                const updated = { ...prev, [chatKey]: 0 };
                updateGlobalBadge(updated);
                return updated;
            });
        });

        // Load notes for current active channel/DM
        if (activeGroup) {
            const key = `teams_notes_group_${activeGroup.id}_${activeChannel}`;
            setNotesText(localStorage.getItem(key) || `Shared notes section for the #${activeChannel} channel of team ${activeGroup.group_name}.`);
        } else if (activeDM) {
            const key = `teams_notes_dm_${activeDM.id}`;
            setNotesText(localStorage.getItem(key) || `Shared notes and reference repository for direct messaging with ${activeDM.name}.`);
        }
    }, [activeGroup, activeChannel, activeDM]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Send Message Handler
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachedFile)) return;

        let contentPayload = newMessage.trim();
        // If file attachment exists, store in content as a parsed JSON packet
        if (attachedFile) {
            contentPayload = JSON.stringify({
                text: newMessage.trim(),
                attachment: attachedFile
            });
        }

        const messagePayload = {
            sender_id: currentUser.id,
            sender_type: currentUser.type,
            sender_name: currentUser.name,
            content: contentPayload,
            group_id: activeGroup ? activeGroup.id : null,
            channel: activeGroup ? activeChannel : null,
            recipient_id: activeDM ? activeDM.id : null,
            recipient_type: activeDM ? activeDM.type : null
        };

        try {
            const response = await fetch("http://127.0.0.1:8001/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(messagePayload)
            });

            if (response.ok) {
                const savedMsg = await response.json();
                setMessages(prev => [...prev, savedMsg]);
                setNewMessage("");
                setAttachedFile(null);
                setTimeout(scrollToBottom, 60);
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    // Handle Notes Editor Textarea Updates
    const handleNotesChange = (e) => {
        const val = e.target.value;
        setNotesText(val);
        if (activeGroup) {
            const key = `teams_notes_group_${activeGroup.id}_${activeChannel}`;
            localStorage.setItem(key, val);
        } else if (activeDM) {
            const key = `teams_notes_dm_${activeDM.id}`;
            localStorage.setItem(key, val);
        }
    };

    // Auto-formatting rich helper
    const insertFormat = (tagStart, tagEnd) => {
        const input = document.getElementById("composer-textbox");
        if (!input) return;
        
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        
        const selectedText = text.substring(start, end);
        const replacement = tagStart + (selectedText || "text") + tagEnd;
        
        setNewMessage(text.substring(0, start) + replacement + text.substring(end));
        
        // Re-focus and set selection
        setTimeout(() => {
            input.focus();
            const offset = tagStart.length;
            input.setSelectionRange(start + offset, start + offset + (selectedText || "text").length);
        }, 50);
    };

    // Handle file selection and read as base64 JPG
    const triggerFileSelect = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachedFile(reader.result);
        };
        reader.readAsDataURL(file);
        e.target.value = ""; // Reset
    };

    // Continuous Polling sync
    useEffect(() => {
        const poll = async () => {
            if (!currentUser.id) return;
            try {
                // Poll active chat messages dynamically
                const polledMsgs = await fetchMessages(false);
                if (polledMsgs.length > 0) {
                    // Update state if new messages arrived
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const merged = [...prev];
                        let updated = false;
                        polledMsgs.forEach(m => {
                            if (!existingIds.has(m.id)) {
                                merged.push(m);
                                updated = true;
                                
                                // Push to activity notifications
                                const messageContent = parseMessageContent(m.content).text;
                                setActivities(prevAct => [
                                    { 
                                        id: Date.now() + Math.random(), 
                                        title: `New message from ${m.sender_name}`, 
                                        desc: messageContent.substring(0, 50), 
                                        time: "Just now", 
                                        type: "message" 
                                    },
                                    ...prevAct
                                ]);
                            }
                        });
                        if (updated) {
                            setTimeout(scrollToBottom, 60);
                            return merged.sort((a, b) => a.id - b.id);
                        }
                        return prev;
                    });
                }
            } catch (err) {
                console.error("Sync polling err", err);
            }
        };

        poll();
        pollingRef.current = setInterval(poll, 3000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [activeGroup, activeChannel, activeDM, currentUser]);

    const extractedFilesList = getExtractedFiles();

    // Autocomplete Lookup contacts filtering
    const filteredPartners = partners.filter(p => {
        if (p.id === currentUser.id && p.type === currentUser.type) return false; // exclude self
        return p.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
               p.email.toLowerCase().includes(contactSearch.toLowerCase());
    });

    return (
        <div className="messages-container">
            <div className="teams-layout">
                {/* 1. Slim Navigation App Bar */}
                <aside className="teams-app-bar">
                    <button 
                        className={`app-bar-item ${activeView === "activity" ? "active" : ""}`}
                        onClick={() => setActiveView("activity")}
                        title="Activity Feed"
                    >
                        <Bell size={20} />
                        <span className="app-bar-label">Activity</span>
                    </button>

                    <button 
                        className={`app-bar-item ${activeView === "chat" ? "active" : ""}`}
                        onClick={() => setActiveView("chat")}
                        title="Direct Chats"
                    >
                        <MessageSquare size={20} />
                        <span className="app-bar-label">Chat</span>
                    </button>

                    <button 
                        className={`app-bar-item ${activeView === "teams" ? "active" : ""}`}
                        onClick={() => setActiveView("teams")}
                        title="Teams Workspace"
                    >
                        <Users size={20} />
                        <span className="app-bar-label">Teams</span>
                    </button>
                </aside>

                {/* 2. Primary Navigation Sidebar */}
                <section className="teams-sidebar">
                    {activeView === "activity" && (
                        <>
                            <div className="sidebar-header-section">
                                <span className="sidebar-title">Activity Logs</span>
                            </div>
                            <div className="sidebar-list-scroll">
                                <span className="sidebar-section-label">Feed Notifications</span>
                                <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {activities.map(act => (
                                        <div key={act.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "12px", borderRadius: "8px", fontSize: "12.5px" }}>
                                            <div style={{ fontWeight: 700, color: "var(--brand-primary, #bffe00)", marginBottom: "3px" }}>{act.title}</div>
                                            <div style={{ color: "#cbd5e1", lineHeight: 1.4 }}>{act.desc}</div>
                                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "6px", textAlign: "right" }}>{act.time}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {activeView === "chat" && (
                        <>
                            <div className="sidebar-header-section">
                                <div className="sidebar-title-row">
                                    <span className="sidebar-title">Direct Chats</span>
                                    <button 
                                        className="new-chat-btn" 
                                        onClick={() => setIsSearchingNewChat(!isSearchingNewChat)}
                                        title="New Chat Session"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {(isSearchingNewChat || contactSearch) && (
                                    <div className="sidebar-search-box">
                                        <Search size={14} className="sidebar-search-icon" />
                                        <input 
                                            type="text" 
                                            className="sidebar-search-input"
                                            placeholder="Type name or email..."
                                            value={contactSearch}
                                            onChange={(e) => {
                                                setContactSearch(e.target.value);
                                                setShowContactDropdown(true);
                                            }}
                                            onFocus={() => setShowContactDropdown(true)}
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Contact Dropdown lookup popup */}
                            {showContactDropdown && contactSearch && (
                                <div className="contact-dropdown-panel">
                                    {filteredPartners.length > 0 ? (
                                        filteredPartners.map(partner => (
                                            <div 
                                                key={`${partner.type}_${partner.id}`}
                                                className="contact-search-item"
                                                onClick={() => handleSelectContact(partner)}
                                            >
                                                <div className="dm-partner-avatar">
                                                    {partner.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="contact-search-name">{partner.name}</div>
                                                    <div className="contact-search-email">{partner.email}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: "12px", color: "#64748b", fontSize: "12px", textAlign: "center" }}>
                                            No matching contacts found.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="sidebar-list-scroll">
                                <span className="sidebar-section-label">Recent Messages</span>
                                {recentDMs.map(dm => {
                                    const isActive = activeDM?.id === dm.id && activeDM?.type === dm.type;
                                    const chatKey = `dm_${dm.id}`;
                                    const unread = unreadCounts[chatKey] || 0;
                                    return (
                                        <div 
                                            key={`recent_${dm.type}_${dm.id}`}
                                            className={`dm-sidebar-item ${isActive ? "active" : ""}`}
                                            onClick={() => {
                                                setActiveDM(dm);
                                                setActiveGroup(null);
                                                setActiveChannel(null);
                                            }}
                                        >
                                            <div className="dm-partner-avatar">
                                                {dm.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="dm-info">
                                                <span className="dm-name">{dm.name}</span>
                                                <span className="dm-role">{dm.type}</span>
                                            </div>
                                            {unread > 0 && <span className="unread-pill">{unread}</span>}
                                        </div>
                                    );
                                })}
                                {recentDMs.length === 0 && (
                                    <div style={{ padding: "20px", color: "#64748b", fontSize: "12.5px", textAlign: "center" }}>
                                        { "No active chats. Click '+' above to start a DM chat." }
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeView === "teams" && (
                        <>
                            <div className="sidebar-header-section">
                                <span className="sidebar-title">Club Squads</span>
                            </div>
                            <div className="sidebar-list-scroll">
                                <span className="sidebar-section-label">Your Channels</span>
                                {groups.map((group) => (
                                    <div key={group.id} className="team-item-accordion">
                                        <div className="team-header-row">
                                            <Users size={15} style={{ color: "var(--brand-primary, #bffe00)" }} />
                                            <span>{group.group_name}</span>
                                        </div>
                                        <div className="team-channels-list">
                                            {CHANNELS.map(ch => {
                                                const isActive = activeGroup?.id === group.id && activeChannel === ch && !activeDM;
                                                const chatKey = `group_${group.id}_channel_${ch}`;
                                                const unread = unreadCounts[chatKey] || 0;
                                                return (
                                                    <div 
                                                        key={`${group.id}_${ch}`}
                                                        className={`channel-sidebar-item ${isActive ? "active" : ""}`}
                                                        onClick={() => {
                                                            setActiveGroup(group);
                                                            setActiveChannel(ch);
                                                            setActiveDM(null);
                                                        }}
                                                    >
                                                        <div className="channel-meta">
                                                            <Hash size={13} className="channel-hashtag" />
                                                            <span style={{ fontSize: "13px" }}>{ch}</span>
                                                        </div>
                                                        {unread > 0 && <span className="unread-pill">{unread}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {groups.length === 0 && (
                                    <div style={{ padding: "20px", color: "#64748b", fontSize: "12.5px", textAlign: "center" }}>
                                        No teams found. Onboard or create one first.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </section>

                {/* 3. Main Chat Panel Area */}
                <main className="teams-chat-pane">
                    {(activeGroup || activeDM) ? (
                        <>
                            {/* Chat Header Area */}
                            <header className="chat-pane-header">
                                <div className="chat-header-main-row">
                                    <div className="chat-header-identity">
                                        {activeGroup ? (
                                            <div>
                                                <div className="chat-header-title">
                                                    <Hash size={18} style={{ color: "var(--brand-primary, #bffe00)" }} />
                                                    <span>{activeChannel}</span>
                                                </div>
                                                <div className="chat-header-subtitle">
                                                    Team: {activeGroup.group_name} | {activeGroup.activity}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="chat-header-title">
                                                    <div className="dm-partner-avatar" style={{ width: "24px", height: "24px", fontSize: "10px" }}>
                                                        {activeDM.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>{activeDM.name}</span>
                                                </div>
                                                <div className="chat-header-subtitle">
                                                    Direct Messages | Role: {activeDM.type} | {activeDM.email}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="chat-tabs-bar">
                                    <button 
                                        className={`chat-tab-item ${activeTab === "posts" ? "active" : ""}`}
                                        onClick={() => setActiveTab("posts")}
                                    >
                                        Posts
                                    </button>
                                    <button 
                                        className={`chat-tab-item ${activeTab === "files" ? "active" : ""}`}
                                        onClick={() => setActiveTab("files")}
                                    >
                                        Files ({extractedFilesList.length})
                                    </button>
                                    <button 
                                        className={`chat-tab-item ${activeTab === "notes" ? "active" : ""}`}
                                        onClick={() => setActiveTab("notes")}
                                    >
                                        Notes
                                    </button>
                                </div>
                            </header>

                            {/* Chat Tab Panel Contents */}
                            <div className="chat-content-pane">
                                <div className="tab-content-wrapper">
                                    {activeTab === "posts" && (
                                        <div className="posts-tab-pane">
                                            {/* Scrollable Chat Feed Messages */}
                                            <div className="teams-chat-history" ref={chatHistoryRef}>
                                                {loading ? (
                                                    <div style={{ textAlign: "center", color: "#64748b", margin: "auto" }}>
                                                        <div style={{ width: "32px", height: "32px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "var(--brand-primary, #bffe00)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
                                                        <p style={{ fontSize: "13px" }}>Retrieving workspace packets...</p>
                                                    </div>
                                                ) : (
                                                    messages.map(msg => {
                                                        const isSelf = msg.sender_id === currentUser.id && msg.sender_type === currentUser.type;
                                                        const timeFormatted = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                        const parsed = parseMessageContent(msg.content);
                                                        
                                                        return (
                                                            <div 
                                                                key={msg.id}
                                                                className={`teams-msg-wrapper ${isSelf ? "self" : "other"}`}
                                                            >
                                                                <div className="msg-avatar">
                                                                    {msg.sender_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="msg-bubble-container">
                                                                    <div className="msg-meta-row">
                                                                        <span className="msg-sender-name">{msg.sender_name}</span>
                                                                        <span className={`msg-sender-tag ${msg.sender_type}`}>{msg.sender_type}</span>
                                                                        <span className="msg-sent-time">{timeFormatted}</span>
                                                                    </div>
                                                                    <div className="msg-bubble-body">
                                                                        <div style={{ whiteSpace: "pre-wrap" }}>{parsed.text}</div>
                                                                        {parsed.attachment && (
                                                                            <img 
                                                                                src={parsed.attachment} 
                                                                                alt="Uploaded attachment" 
                                                                                className="msg-attachment-img"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                                {messages.length === 0 && !loading && (
                                                    <div className="pane-empty-state">
                                                        <Sparkles size={48} style={{ color: "rgba(255,255,255,0.05)" }} />
                                                        <h3>Start the collaboration stream</h3>
                                                        <p>Welcome to this chat space. Send updates, upload reports, or share links.</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Composer Rich Input Action Bar */}
                                            <form className="teams-composer" onSubmit={handleSendMessage}>
                                                <div className="composer-toolbar">
                                                    <button 
                                                        type="button" 
                                                        className="toolbar-action-btn"
                                                        onClick={() => insertFormat("**", "**")}
                                                        title="Bold Text"
                                                    >
                                                        <Bold size={14} />
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="toolbar-action-btn"
                                                        onClick={() => insertFormat("*", "*")}
                                                        title="Italic Text"
                                                    >
                                                        <Italic size={14} />
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="toolbar-action-btn"
                                                        onClick={() => insertFormat("<u>", "</u>")}
                                                        title="Underline Text"
                                                    >
                                                        <Underline size={14} />
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="toolbar-action-btn"
                                                        onClick={() => {
                                                            setNewMessage(prev => prev + " 😊");
                                                            document.getElementById("composer-textbox")?.focus();
                                                        }}
                                                        title="Insert Smile Face Emoji"
                                                    >
                                                        <Smile size={14} />
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="toolbar-action-btn"
                                                        onClick={triggerFileSelect}
                                                        title="Attach File Image"
                                                    >
                                                        <Paperclip size={14} />
                                                    </button>
                                                    
                                                    {/* File Input */}
                                                    <input 
                                                        type="file"
                                                        ref={fileInputRef}
                                                        style={{ display: "none" }}
                                                        accept="image/jpeg,image/png"
                                                        onChange={handleFileChange}
                                                    />
                                                </div>

                                                <div className="composer-input-row">
                                                    <div className="composer-textarea-wrapper">
                                                        <textarea 
                                                            id="composer-textbox"
                                                            className="composer-textarea"
                                                            placeholder="Format with buttons or type update..."
                                                            value={newMessage}
                                                            onChange={(e) => setNewMessage(e.target.value)}
                                                            rows={1}
                                                        />
                                                        {attachedFile && (
                                                            <div className="composer-attachment-pill">
                                                                <ImageIcon size={12} />
                                                                <span>Image Loaded (JPG/PNG)</span>
                                                                <button 
                                                                    type="button" 
                                                                    className="composer-attachment-remove"
                                                                    onClick={() => setAttachedFile(null)}
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button type="submit" className="composer-send-btn">
                                                        <Send size={16} />
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {activeTab === "files" && (
                                        <div className="files-tab-pane">
                                            <div className="files-grid">
                                                {extractedFilesList.map(file => (
                                                    <div key={file.id} className="file-card-box">
                                                        <a 
                                                            href={file.url} 
                                                            download={file.name} 
                                                            className="file-download-action-btn"
                                                            title="Download File"
                                                        >
                                                            <Download size={14} />
                                                        </a>
                                                        <div className="file-card-preview">
                                                            <img 
                                                                src={file.url} 
                                                                alt={file.name} 
                                                                className="file-img-thumb"
                                                            />
                                                        </div>
                                                        <div className="file-meta-info">
                                                            <span className="file-title-name">{file.name}</span>
                                                            <span className="file-sender-credit">By: {file.sender} | {file.date}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {extractedFilesList.length === 0 && (
                                                <div className="pane-empty-state">
                                                    <FileText size={48} style={{ color: "rgba(255,255,255,0.05)" }} />
                                                    <h3>No files shared yet</h3>
                                                    <p>Attachments uploaded via the composer bar in this channel will show up here.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === "notes" && (
                                        <div className="notes-tab-pane">
                                            <div className="notes-editor-card">
                                                <div className="notes-editor-header">
                                                    <BookOpen size={14} style={{ marginRight: "6px", display: "inline-block", verticalAlign: "middle" }} />
                                                    <span style={{ verticalAlign: "middle" }}>Active Shared Pad (Auto-saves locally)</span>
                                                </div>
                                                <textarea 
                                                    className="notes-editor-textarea"
                                                    value={notesText}
                                                    onChange={handleNotesChange}
                                                    placeholder="Start typing team agendas, strategies or rosters here..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="pane-empty-state">
                            <MessageSquare size={64} style={{ color: "rgba(255, 255, 255, 0.05)" }} />
                            <h3>Teams Messaging Workspace</h3>
                            <p>Select a group channel under Teams or start a direct message with club colleagues.</p>
                        </div>
                    )}
                </main>
            </div>
            
            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
