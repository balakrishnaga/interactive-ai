"use client";

export default function ThinkingIndicator() {
    return (
        <div className="thinking-container">
            <div className="thinking-dots">
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
            </div>
            <span className="thinking-label">Thinking...</span>
        </div>
    );
}
