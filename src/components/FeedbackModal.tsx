"use client";

import React, { useState } from "react";
import { X, MessageSquare, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
}

export default function FeedbackModal({ isOpen, onClose, userId }: FeedbackModalProps) {
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim().length < 5) {
            setStatus("error");
            setErrorMessage("Message is too short (min 5 characters).");
            return;
        }

        setStatus("submitting");
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, userId }),
            });

            const data = await res.json();

            if (!res.ok) {
                setStatus("error");
                setErrorMessage(data.error || "Failed to send feedback.");
                return;
            }

            setStatus("success");
            setTimeout(() => {
                onClose();
                setStatus("idle");
                setMessage("");
            }, 2500);
        } catch (error) {
            setStatus("error");
            setErrorMessage("A network error occurred.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-slate-100">Send Feedback</h2>
                </div>

                {status === "success" ? (
                    <div className="flex flex-col items-center justify-center py-8 text-emerald-400 gap-3">
                        <CheckCircle2 className="w-12 h-12" />
                        <p className="font-medium text-slate-200">Thank you! Message sent.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Found a bug or have a suggestion? Let us know! Your message goes directly to the developer.
                        </p>

                        <textarea
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                if (status === "error") setStatus("idle");
                            }}
                            placeholder="Type your message here..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 min-h-[120px] resize-none"
                            maxLength={1000}
                        />

                        {status === "error" && (
                            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/50 p-2.5 rounded-lg border border-rose-900/50">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === "submitting" || !message.trim()}
                            className="w-full min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            {status === "submitting" ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <span>Send Message</span>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}