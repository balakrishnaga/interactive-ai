"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message } from "@/lib/llm/types";
import { ObservabilityTrace } from "@/lib/observability";
import MessageContent from "./MessageContent";
import ThinkingIndicator from "./ThinkingIndicator";
import styles from "@/app/insight_engine/insight_engine.module.css";
import {
    Send,
    Plus,
    Paperclip,
    FileText,
    Loader2,
    Trash2
} from "lucide-react";

interface Props {
    topK: number;
    enableRerank: boolean;
    onObservabilityChange?: (trace: ObservabilityTrace | null) => void;
}

export default function InsightChatPanel({ topK, enableRerank, onObservabilityChange }: Props) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [documents, setDocuments] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
        }
    }, [input]);

    useEffect(() => {
        fetchDocuments();
    }, []);

    async function fetchDocuments() {
        try {
            const res = await fetch('/api/documents');
            const data = await res.json();
            if (res.ok) {
                setDocuments(data.documents || []);
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
                await fetchDocuments();
                const systemMessage: Message = {
                    role: "bot",
                    content: `Document indexed successfully. Insight Engine is now initialized with ${file.name}. You can ask questions about its content.`
                };
                setMessages((prev) => [...prev, systemMessage]);
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            alert(`Failed to upload PDF: ${message}`);
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
        } catch (error) {
            console.error("Delete error:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            alert(`Error deleting document: ${message}`);
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
                body: JSON.stringify({
                    messages: updatedMessages,
                    top_k: topK,
                    rerank: enableRerank
                }),
            });

            const data = await res.json();
            const botMessage: Message = {
                role: "bot",
                content: data.response,
                sources: data.sources,
                observability: data.observability
            };
            setMessages((prev) => [...prev, botMessage]);

            if (onObservabilityChange) {
                onObservabilityChange(data.observability ?? null);
            }
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
        setMessages([]);
        setInput("");
    };

    const uploadBoxClass = `${styles.uploadBox} ${isUploading ? styles.uploadBoxDisabled : ''}`.trim();

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                    <FileText size={18} />
                    Insight Engine
                </h3>
                <button
                    onClick={handleNewChat}
                    className={styles.headerBtn}
                    title="New chat"
                >
                    <Plus size={16} />
                    <span style={{ marginLeft: '4px' }}>New chat</span>
                </button>
            </div>

            <div className={styles.cardBody}>
                <div className={styles.messagesContainer}>
                    {messages.length === 0 ? (
                        <div className={styles.landingContainer}>
                            <div className={styles.landingLogo}>✦</div>
                            <h4 className={styles.landingTitle}>Initialize Insight Engine</h4>
                            <p className={styles.landingSubtitle}>
                                Upload PDFs to search, analyze, and query your documents with professional-grade precision.
                            </p>

                            <div
                                className={uploadBoxClass}
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                            >
                                {isUploading ? (
                                    <div className={styles.uploadStatus}>
                                        <Loader2 size={32} className="animate-spin" />
                                        <span style={{ fontSize: '0.875rem' }}>Indexing document...</span>
                                    </div>
                                ) : (
                                    <div className={styles.uploadStatus}>
                                        <Paperclip size={32} color="#0078d4" />
                                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Upload PDF to start</span>
                                        <span style={{ fontSize: '0.75rem', color: '#605e5c' }}>Max 10MB</span>
                                    </div>
                                )}
                            </div>

                            {!isUploading && (
                                <button
                                    className={styles.headerBtn}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ marginTop: '16px', width: '100%', maxWidth: '200px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center' }}
                                >
                                    Start Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="messages-inner">
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`${styles.messageRow} ${m.role === 'bot' ? styles.botMessage : styles.userMessage}`}
                                >
                                    <div className={m.role === 'bot' ? styles.botAvatar : styles.userAvatar}>
                                        {m.role === 'bot' ? '✦' : 'U'}
                                    </div>
                                    <div className={styles.messageContent}>
                                        {m.role === "bot" ? (
                                            <>
                                                <MessageContent content={m.content} />
                                                {m.sources && m.sources.length > 0 && (
                                                    <div className={styles.sourcesContainer}>
                                                        {m.sources.map((source, idx) => (
                                                            <span
                                                                key={idx}
                                                                className={styles.sourceChip}
                                                            >
                                                                <FileText size={10} />
                                                                {source.filename} (p. {source.pageIndex})
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className={styles.userMessageText}>{m.content}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className={styles.messageRow}>
                                    <div className={styles.botAvatar}>
                                        ✦
                                    </div>
                                    <ThinkingIndicator />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                <div className={styles.documentsSection}>
                    <div className={styles.documentsSectionHeader}>
                        <span className={styles.sectionLabel}>KNOWLEDGE BASE</span>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={styles.smallBtn}
                        >
                            {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            <span>Add Document</span>
                        </button>
                    </div>
                    <div className={styles.documentList}>
                        {documents.length > 0 ? (
                            documents.map((doc) => (
                                <div key={doc} className={styles.documentItem}>
                                    <div className={styles.documentInfo}>
                                        <FileText size={14} />
                                        <span title={doc}>{doc}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteDocument(doc)}
                                        disabled={isDeleting === doc}
                                        className={styles.deleteDocBtn}
                                    >
                                        {isDeleting === doc ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyDocs}>
                                No documents indexed.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.chatInputBar}>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf"
                    onChange={handleFileUpload}
                />
                <button
                    className="action-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#605e5c', marginRight: '8px' }}
                    title="Upload PDF"
                >
                    {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                </button>
                <textarea
                    ref={textareaRef}
                    className={styles.bottomInput}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Insight Engine ..."
                    disabled={isLoading || isUploading}
                    rows={1}
                    style={{ resize: 'none' }}
                />
                <button
                    className="send-btn"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading || isUploading}
                    style={{
                        background: input.trim() && !isLoading && !isUploading ? '#0078d4' : '#edebe9',
                        color: input.trim() && !isLoading && !isUploading ? 'white' : '#a19f9d',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px',
                        marginLeft: '8px',
                        cursor: input.trim() && !isLoading && !isUploading ? 'pointer' : 'not-allowed'
                    }}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
