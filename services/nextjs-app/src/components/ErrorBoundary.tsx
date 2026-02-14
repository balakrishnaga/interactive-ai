"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="chat-universe">
                    <div className="glass-panel text-center p-5" style={{ maxWidth: '600px' }}>
                        <div className="display-1 mb-4 animate-float">
                            ⚠️
                        </div>
                        <h1 className="chat-title mb-3" style={{ fontSize: '2rem' }}>
                            Cosmic Disturbance Detected
                        </h1>
                        <p className="text-muted mb-4" style={{ color: 'var(--star-dim)' }}>
                            The application encountered an unexpected anomaly. Our navigation systems are resetting.
                        </p>

                        {/* Error Details (for dev only) */}
                        {this.state.error && (
                            <div
                                className="text-start p-3 mb-4 rounded border border-danger border-opacity-25"
                                style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.85rem',
                                    color: '#ff5555'
                                }}
                            >
                                {this.state.error.toString()}
                            </div>
                        )}

                        <button
                            className="send-button px-5 py-2 w-auto"
                            onClick={() => window.location.href = '/'}
                        >
                            Return to Base
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
