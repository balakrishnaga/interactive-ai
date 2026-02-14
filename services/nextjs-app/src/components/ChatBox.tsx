"use client";
import { useState, useRef, useEffect } from "react";
import { Message } from "@/lib/llm/types";
import MessageContent from "./MessageContent";
import ThinkingIndicator from "./ThinkingIndicator";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Settings, Plus, Sparkles, Code, BookOpen, Lightbulb, Paperclip, FileText, Loader2, Trash2 } from "lucide-react";

const SUGGESTIONS = [{}];

export default function ChatBox() {
    const [input, setInput] = useState("");
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [insightMessages, setInsightMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mode, setMode] = useState<"chat" | "insight">("chat");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [hasUploadedFile, setHasUploadedFile] = useState(false);
    const [documents, setDocuments] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const messages = mode === 'chat' ? chatMessages : insightMessages;
    const setMessages = mode === 'chat' ? setChatMessages : setInsightMessages;

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages, insightMessages, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
        }
    }, [input]);

    // Fetch documents on load
    useEffect(() => {
        fetchDocuments();
    }, []);

    async function fetchDocuments() {
        try {
            const res = await fetch('/api/documents');
            const data = await res.json();
            if (res.ok) {
                setDocuments(data.documents);
                setHasUploadedFile(data.documents.length > 0);
            }
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert("Only PDF files are supported");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setHasUploadedFile(true);
                fetchDocuments(); // Refresh list
                // System message to confirm upload
                const systemMessage: Message = {
                    role: "bot",
                    content: `Document indexed successfully. Insight Engine is now initialized with ${file.name}. You can ask questions about its content.`
                };
                setInsightMessages((prev) => [...prev, systemMessage]);
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            alert(`Failed to upload PDF: ${error.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleDeleteDocument(filename: string) {
        if (!confirm(`Are you sure you want to remove "${filename}"? This will delete all its data from the database.`)) {
            return;
        }

        setIsDeleting(filename);
        try {
            const res = await fetch('/api/documents/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });

            if (res.ok) {
                await fetchDocuments();
            } else {
                const data = await res.json();
                alert(`Failed to delete: ${data.error}`);
            }
        } catch (error: any) {
            console.error("Delete error:", error);
            alert(`Error deleting document: ${error.message}`);
        } finally {
            setIsDeleting(null);
        }
    }

    async function sendMessage(messageText?: string) {
        const text = messageText || input;
        if (!text.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: text.trim() };
        const updatedMessages = [...messages, userMessage];

        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            const data = await res.json();
            const botMessage: Message = {
                role: "bot",
                content: data.response,
                sources: data.sources
            };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage: Message = {
                role: "bot",
                content: "Something went wrong. Please try again."
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleNewChat = () => {
        setChatMessages([]);
        setInsightMessages([]);
        setHasUploadedFile(false);
        setInput("");
    };

    return (
        <>
            <div className="chat-layout">
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf"
                    onChange={handleFileUpload}
                />

                {/* Top Bar */}
                <header className="chat-topbar">
                    <div className="topbar-left">
                        <nav className="topbar-nav">
                            <button
                                className={`nav-link ${mode === 'chat' ? 'active' : ''}`}
                                onClick={() => setMode('chat')}
                            >
                                <Sparkles size={16} />
                                Chat
                            </button>
                            <button
                                className={`nav-link ${mode === 'insight' ? 'active' : ''}`}
                                onClick={() => setMode('insight')}
                            >
                                <FileText size={16} />
                                Insight Engine
                            </button>
                        </nav>
                    </div>

                    <div className="topbar-actions">
                        <button
                            className="new-chat-btn"
                            onClick={handleNewChat}
                            title="New chat"
                            aria-label="New chat"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </header>

                <div className="chat-main-container">
                    <div className="chat-center-content">
                        {/* Messages Area */}
                        <div className="messages-container">
                            <div className="messages-inner">
                                {messages.length === 0 ? (
                                    mode === "insight" ? (
                                        <div className="rag-landing">
                                            <motion.div
                                                className="rag-landing-content"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                <div className="rag-logo">✦</div>
                                                <h4 className="rag-title">Insight Engine</h4>
                                                <p className="rag-subtitle">
                                                    Empower your Interactive AI with specialized knowledge. Upload PDFs to search, analyze, and query your documents with professional-grade precision.
                                                </p>

                                                <div className="upload-container">
                                                    <div
                                                        className={`upload-box ${isUploading ? 'uploading' : ''}`}
                                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                                    >
                                                        {isUploading ? (
                                                            <div className="upload-status">
                                                                <Loader2 size={32} className="animate-spin mb-3" />
                                                                <span>Indexing document...</span>
                                                            </div>
                                                        ) : (
                                                            <div className="upload-prompt">
                                                                <Paperclip size={32} className="mb-3" />
                                                                <span className="upload-text">Initialize Insight Engine</span>
                                                                <span className="upload-subtext">PDF Documents • Max 10MB</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!isUploading && (
                                                        <button
                                                            className="analyze-btn"
                                                            onClick={() => fileInputRef.current?.click()}
                                                        >
                                                            Start Search
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </div>
                                    ) : (
                                        <div className="chat-landing">
                                            <motion.div
                                                className="chat-landing-content"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                <div className="chat-logo">✦</div>
                                                <h4 className="chat-title">How can I help you today?</h4>
                                                <p className="chat-subtitle">
                                                    Experience the next generation of AI chat. Fast, intuitive, and designed for your workflows.
                                                </p>
                                            </motion.div>
                                        </div>
                                    )
                                ) : (
                                    <AnimatePresence initial={false}>
                                        {messages.map((m, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, ease: "easeOut" }}
                                                className={`message-row ${m.role}`}
                                            >
                                                {m.role === "bot" ? (
                                                    <div className="bot-avatar">✦</div>
                                                ) : (
                                                    <div className="user-avatar">U</div>
                                                )}
                                                <div className={`message-content ${m.role === "user" ? "user-message" : ""}`}>
                                                    {m.role === "bot" ? (
                                                        <>
                                                            <MessageContent content={m.content} />
                                                            {m.sources && m.sources.length > 0 && (
                                                                <div className="sources-container">
                                                                    {m.sources.map((source, idx) => (
                                                                        <span key={idx} className="source-chip">
                                                                            <FileText size={12} style={{ marginRight: '4px' }} />
                                                                            {source.filename} (p. {source.pageIndex})
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        m.content
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                        {isLoading && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="message-row bot"
                                            >
                                                <div className="bot-avatar">✦</div>
                                                <ThinkingIndicator />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input Area */}
                        {(mode === "chat" || hasUploadedFile) && (
                            <div className="input-area">
                                <div className="input-area-inner">
                                    <div className="input-wrapper">
                                        <button
                                            className="action-btn"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            title="Upload PDF"
                                            aria-label="Upload PDF"
                                        >
                                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                                        </button>

                                        <textarea
                                            ref={textareaRef}
                                            className="chat-input"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Message Interactive AI ..."
                                            disabled={isLoading || isUploading}
                                            rows={1}
                                        />

                                        <button
                                            className={`send-btn ${!input.trim() || isLoading || isUploading ? "disabled" : ""}`}
                                            onClick={() => sendMessage()}
                                            disabled={!input.trim() || isLoading || isUploading}
                                            aria-label="Send message"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                    <div className="input-footer">
                                        Interactive AI can make mistakes. Consider checking important information.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar - Insight Engine Only */}
                    {mode === 'insight' && (
                        <aside className="insight-sidebar">
                            <div className="sidebar-header">
                                <FileText size={18} />
                                Knowledge Base
                            </div>

                            {documents.length > 0 ? (
                                <div className="document-list">
                                    {documents.map((doc) => (
                                        <div key={doc} className="document-item">
                                            <div className="document-info">
                                                <FileText size={14} className="text-secondary" />
                                                <span title={doc}>{doc}</span>
                                            </div>
                                            <button
                                                className="delete-doc-btn"
                                                onClick={() => handleDeleteDocument(doc)}
                                                disabled={isDeleting === doc}
                                                title="Remove from DB"
                                            >
                                                {isDeleting === doc ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="sidebar-empty">
                                    <Paperclip size={24} />
                                    <span>No documents uploaded yet.</span>
                                </div>
                            )}

                            {hasUploadedFile && (
                                <button
                                    className="nav-link"
                                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Plus size={16} />
                                    Add Document
                                </button>
                            )}
                        </aside>
                    )}
                </div>
            </div>
        </>
    );
}