"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Thermometer, Cpu } from "lucide-react";
import { useState } from "react";

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const MODELS = [
    { id: "nova-pro-1.0", name: "Nova Pro 1.0", desc: "High reasoning" },
    { id: "cosmos-ultra", name: "Cosmos Ultra", desc: "Creative writing" },
    { id: "nebula-fast", name: "Nebula Fast", desc: "Speed focused" },
];

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const [temperature, setTemperature] = useState(0.7);
    const [model, setModel] = useState("nova-pro-1.0");

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="settings-backdrop"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="settings-panel"
                    >
                        {/* Header */}
                        <div className="settings-header">
                            <h2 className="settings-title">
                                <Settings size={18} />
                                Settings
                            </h2>
                            <button
                                onClick={onClose}
                                className="settings-close"
                                aria-label="Close settings"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="settings-body">
                            {/* Model Selection */}
                            <div className="settings-section">
                                <label className="settings-label">
                                    <Cpu size={14} />
                                    Model
                                </label>
                                {MODELS.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setModel(m.id)}
                                        className={`settings-model-btn ${model === m.id ? "active" : ""}`}
                                    >
                                        <div className="settings-model-name">{m.name}</div>
                                        <div className="settings-model-desc">{m.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Temperature */}
                            <div className="settings-section">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
                                    <label className="settings-label" style={{ margin: 0 }}>
                                        <Thermometer size={14} />
                                        Temperature
                                    </label>
                                    <span className="settings-temp-value">
                                        {temperature.toFixed(1)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="settings-range"
                                />
                                <div className="settings-range-labels">
                                    <span>Precise</span>
                                    <span>Balanced</span>
                                    <span>Creative</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="settings-footer">
                            Interactive AI v2.4.0 • Online
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
