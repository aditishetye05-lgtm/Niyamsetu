"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Compass,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  ExternalLink,
  X,
  ChevronRight,
} from "lucide-react";
import { getBusinessAlerts, markAlertAsRead, AlertItem, AlertsSummary } from "@/lib/api";

function HeaderContent() {
  const searchParams = useSearchParams();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [alertsSummary, setAlertsSummary] = useState<AlertsSummary | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync businessId from URL search param or localStorage
  useEffect(() => {
    let id = searchParams?.get("business_id");
    if (!id && typeof window !== "undefined") {
      id = localStorage.getItem("niyamsetu_business_id");
    }
    if (id) {
      setBusinessId(id);
    }
  }, [searchParams]);

  // Fetch alerts when businessId is known
  const loadAlerts = async (id: string) => {
    try {
      setLoading(true);
      const data = await getBusinessAlerts(id);
      setAlertsSummary(data);
    } catch {
      // ignore error silently if business has no alerts yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      loadAlerts(businessId);
    }
  }, [businessId]);

  // Click outside to close notification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!businessId) return;
    try {
      await markAlertAsRead(businessId, alertId);
      // Update local state
      setAlertsSummary((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          total_unread: Math.max(0, prev.total_unread - 1),
          alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)),
        };
      });
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  const unreadCount = alertsSummary?.total_unread || 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-indigo-600 shadow-md shadow-orange-500/20 text-white transition-transform group-hover:scale-105">
              <Compass className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors">
                  Niyam<span className="text-amber-600">Setu</span>
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60 uppercase tracking-wide">
                  SIH 2024
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Your Business Approval & Compliance Navigator
              </span>
            </div>
          </Link>
        </div>

        {/* Right Badges & Notification Center */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Govt. Regulatory Engine</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/70">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>FastAPI Active</span>
          </div>

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Card */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl border border-slate-200/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold">Reminders & Alerts</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-xs font-medium">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {!alertsSummary || alertsSummary.alerts.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      {businessId ? (
                        <>No alerts yet. Your compliance status is on track!</>
                      ) : (
                        <>Please initialize or select a business enterprise to view alerts.</>
                      )}
                    </div>
                  ) : (
                    alertsSummary.alerts.map((alert) => {
                      const isUnread = !alert.is_read;
                      return (
                        <div
                          key={alert.id}
                          className={`p-3.5 transition-colors flex gap-3 ${
                            isUnread ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-slate-50 opacity-80"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {alert.alert_type === "renewal_due" && (
                              <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                              </div>
                            )}
                            {alert.alert_type === "pending_action" && (
                              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            )}
                            {alert.alert_type === "status_update" && (
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <Info className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                                {alert.title}
                              </h4>
                              {isUnread && (
                                <button
                                  onClick={(e) => handleMarkRead(alert.id, e)}
                                  className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold shrink-0 underline ml-1"
                                >
                                  Read
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                              {alert.message}
                            </p>
                            {alert.due_date && (
                              <div className="text-[10px] text-red-600 font-medium mt-1">
                                Due: {alert.due_date}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {businessId && (
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                    <Link
                      href={`/tracker?business_id=${businessId}`}
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors w-full py-1"
                    >
                      <span>Open Full Tracker & Notification Center</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function Header() {
  return (
    <React.Suspense fallback={
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 h-16" />
    }>
      <HeaderContent />
    </React.Suspense>
  );
}
