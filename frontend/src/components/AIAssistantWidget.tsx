"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Bot,
  Send,
  X,
  Sparkles,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  FolderArchive,
  GitFork,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import {
  sendAgentMessage,
  getAgentSuggestions,
  getBusinessProfile,
  getComplianceScore,
  BusinessProfileResponse,
} from "@/lib/api";

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  suggested_actions?: string[];
  engine?: string;
  timestamp: string;
}

export function AIAssistantWidget() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileResponse | null>(null);
  const [complianceScore, setComplianceScore] = useState<number | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync businessId from search params or localStorage
  useEffect(() => {
    let id = searchParams?.get("business_id");
    if (!id && typeof window !== "undefined") {
      id = localStorage.getItem("niyamsetu_business_id");
    }
    if (id) {
      setBusinessId(id);
    }
  }, [searchParams]);

  // Load business profile and suggestions
  useEffect(() => {
    if (!businessId) return;

    // Fetch profile
    getBusinessProfile(businessId)
      .then((p) => setBusinessProfile(p))
      .catch(() => {});

    // Fetch score
    getComplianceScore(businessId)
      .then((s) => setComplianceScore(s.overall_score))
      .catch(() => {});

    // Fetch dynamic quick suggestions
    getAgentSuggestions(businessId)
      .then((res) => setSuggestions(res.suggestions))
      .catch(() => {
        setSuggestions([
          "What are the mandatory documents for FSSAI?",
          "Why is my clearance blocked in the DAG?",
          "How is my Compliance Score calculated?",
          "What is the statutory turnaround time?",
        ]);
      });
  }, [businessId]);

  // Set initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const name = businessProfile?.enterprise_name || "Enterprise";
      const sector = businessProfile?.business_type || "Business";
      setMessages([
        {
          id: "welcome-1",
          sender: "agent",
          text: `👋 Namaste! I am **NiyamSetu AI**, your statutory regulatory advisor grounded in India's National Single Window System (NSWS), FSSAI, Pollution Control Boards, and Factories Act regulations.\n\nHow can I assist **${name}** (${sector}) today? You can ask me about document requirements, prerequisite clearances, or statutory timelines.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggested_actions: ["Check Missing Documents", "View Dependency Map"],
        },
      ]);
    }
  }, [businessProfile]);

  // Listen for global custom deep-link event "niyamsetu-ask-ai"
  useEffect(() => {
    const handleAskAiEvent = (e: any) => {
      const prompt = e.detail?.prompt;
      if (prompt) {
        setIsOpen(true);
        handleSendMessage(prompt);
      } else {
        setIsOpen(true);
      }
    };

    window.addEventListener("niyamsetu-ask-ai" as any, handleAskAiEvent);
    return () => window.removeEventListener("niyamsetu-ask-ai" as any, handleAskAiEvent);
  }, [businessId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputValue).trim();
    if (!message || isLoading) return;

    if (!businessId) {
      alert("Please register or select a business enterprise in Step 1 first.");
      return;
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await sendAgentMessage(businessId, message);
      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        text: res.reply,
        suggested_actions: res.suggested_actions,
        engine: res.engine,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "agent",
        text: `⚠️ I encountered an issue connecting to the advisory engine: ${err?.message || "Please try again."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("vault") || lower.includes("document")) {
      router.push(`/vault?business_id=${businessId}`);
    } else if (lower.includes("dependency") || lower.includes("dag") || lower.includes("map")) {
      router.push(`/dependencies?business_id=${businessId}`);
    } else if (lower.includes("portal") || lower.includes("track") || lower.includes("status")) {
      router.push(`/tracker?business_id=${businessId}`);
    } else if (lower.includes("roadmap")) {
      router.push(`/roadmap?business_id=${businessId}`);
    } else {
      handleSendMessage(action);
    }
  };

  return (
    <>
      {/* Floating Trigger Pill */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 150);
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl shadow-indigo-950/30 border border-indigo-500/30 hover:scale-105 active:scale-95 transition-all group cursor-pointer"
          aria-label="Open AI Guidance Agent"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 text-white shadow-sm">
            <Bot className="w-4 h-4 stroke-[2.2]" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-white group-hover:text-amber-300 transition-colors">
                Ask NiyamSetu AI
              </span>
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-amber-300 border border-amber-400/30">
                Copilot
              </span>
            </div>
            <span className="text-[10px] text-slate-300 font-medium">
              Regulatory & Statutory Advisor
            </span>
          </div>
        </button>
      )}

      {/* Slide-over Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[440px] h-[600px] max-h-[85vh] rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-500 text-white shadow-sm">
                <Bot className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    NiyamSetu AI Copilot
                  </h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold border border-emerald-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    NSWS Grounded
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  Statutory Regulatory Guidance Engine
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Context Ribbon */}
          {businessProfile && (
            <div className="px-3.5 py-2 bg-indigo-50/90 border-b border-indigo-100 flex items-center justify-between text-[11px] shrink-0">
              <div className="flex items-center gap-1.5 text-indigo-950 truncate max-w-[280px]">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-bold truncate">{businessProfile.enterprise_name}</span>
                <span className="text-indigo-400">•</span>
                <span className="text-indigo-700 truncate">{businessProfile.state}</span>
              </div>
              {complianceScore !== null && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 font-bold border border-indigo-200 text-[10px] shrink-0 shadow-xs">
                  <span>Score:</span>
                  <span className="text-indigo-900">{complianceScore}%</span>
                </div>
              )}
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs shadow-sm"
                      : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                  {/* Suggested Action Chips (only on agent messages) */}
                  {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.suggested_actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(act)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <span>{act}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-3 border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-semibold text-[11px]">Consulting Indian regulatory statutory rules...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Contextual Question Suggestions */}
          {suggestions.length > 0 && (
            <div className="px-3.5 py-2 bg-white border-t border-slate-100 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Suggested Prompts
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s)}
                    disabled={isLoading}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask about clearances, documents, or rules..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-40 cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
