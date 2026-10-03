"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { StepNavigation } from "@/components/StepNavigation";
import {
  getTrackingOverview,
  updateApprovalTracking,
  getBusinessAlerts,
  markAlertAsRead,
  checkPortalReadiness,
  TrackedApprovalItem,
  TrackingStage,
  AlertItem,
  AlertsSummary,
  PortalCheckResponse,
} from "@/lib/api";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  FileCheck2,
  AlertCircle,
  X,
  Edit3,
  Check,
  Bell,
  ArrowUpRight,
  ShieldAlert,
  Send,
} from "lucide-react";

// Stage definitions for the 5-stage progression tracker
const STAGES: { key: TrackingStage; label: string; stepNum: number }[] = [
  { key: "submitted", label: "1. Submitted", stepNum: 1 },
  { key: "documents_verified", label: "2. Documents", stepNum: 2 },
  { key: "department_inspection", label: "3. Verification", stepNum: 3 },
  { key: "final_review", label: "4. Review", stepNum: 4 },
  { key: "approved", label: "5. Approval", stepNum: 5 },
];

function getStageIndex(stage: TrackingStage): number {
  const index = STAGES.findIndex((s) => s.key === stage);
  return index === -1 ? 0 : index;
}

function TrackerPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracking Overview Data
  const [enterpriseName, setEnterpriseName] = useState<string>("");
  const [trackedApprovals, setTrackedApprovals] = useState<TrackedApprovalItem[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});

  // Alerts Data
  const [alertsSummary, setAlertsSummary] = useState<AlertsSummary | null>(null);
  const [alertFilter, setAlertFilter] = useState<"all" | "renewal_due" | "pending_action" | "status_update">("all");

  // Portal Check Modal State
  const [activePortalModal, setActivePortalModal] = useState<PortalCheckResponse | null>(null);
  const [checkingPortalId, setCheckingPortalId] = useState<string | null>(null);
  const [portalCheckError, setPortalCheckError] = useState<string | null>(null);

  // Edit Tracking Modal State
  const [editingApproval, setEditingApproval] = useState<TrackedApprovalItem | null>(null);
  const [inputAppId, setInputAppId] = useState("");
  const [inputStage, setInputStage] = useState<TrackingStage>("submitted");
  const [inputNotes, setInputNotes] = useState("");
  const [isSavingTracking, setIsSavingTracking] = useState(false);

  // Read businessId from URL or localStorage
  useEffect(() => {
    let id = searchParams?.get("business_id");
    if (!id && typeof window !== "undefined") {
      id = localStorage.getItem("niyamsetu_business_id");
    }
    if (id) {
      setBusinessId(id);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  // Load all tracking data and alerts
  const loadData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const [trackingRes, alertsRes] = await Promise.all([
        getTrackingOverview(id),
        getBusinessAlerts(id),
      ]);

      setEnterpriseName(trackingRes.enterprise_name);
      setTrackedApprovals(trackingRes.approvals);
      setStageCounts(trackingRes.stage_counts);
      setAlertsSummary(alertsRes);
    } catch (err: any) {
      setError(err?.message || "Failed to load tracking and alerts data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      loadData(businessId);
    }
  }, [businessId]);

  // Open Portal Readiness Gate Modal (Step 5)
  const handleOpenPortalHandoff = async (approvalId: string) => {
    if (!businessId) return;
    try {
      setCheckingPortalId(approvalId);
      setPortalCheckError(null);
      const res = await checkPortalReadiness(businessId, approvalId);
      setActivePortalModal(res);
    } catch (err: any) {
      setPortalCheckError(err?.message || "Failed to check portal readiness checklist.");
    } finally {
      setCheckingPortalId(null);
    }
  };

  // Open Edit Tracking Modal (Step 6)
  const handleOpenEdit = (item: TrackedApprovalItem) => {
    setEditingApproval(item);
    setInputAppId(item.application_id || "");
    setInputStage(item.tracking_stage || "submitted");
    setInputNotes(item.notes || "");
  };

  // Save Tracking Stage / App ID (Step 6)
  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !editingApproval) return;
    try {
      setIsSavingTracking(true);
      const clearanceId = editingApproval.id || editingApproval.approval_id;
      const updated = await updateApprovalTracking(clearanceId, {
        application_reference_number: inputAppId.trim(),
        progression_stage: inputStage,
        application_id: inputAppId.trim(),
        tracking_stage: inputStage,
        notes: inputNotes.trim() || undefined,
        clearance_code: editingApproval.code,
      });

      // Update in state
      setTrackedApprovals((prev) =>
        prev.map((item) =>
          item.id === updated.id ||
          item.approval_id === updated.approval_id ||
          item.code === updated.code
            ? updated
            : item
        )
      );

      // Re-fetch overview in background to update stage counts
      getTrackingOverview(businessId).then((res) => {
        setStageCounts(res.stage_counts);
      });

      setEditingApproval(null);
    } catch (err: any) {
      alert(`Error saving tracking details: ${err?.message}`);
    } finally {
      setIsSavingTracking(false);
    }
  };

  // Mark an alert as read (Step 7)
  const handleMarkAlertRead = async (alertId: string) => {
    if (!businessId) return;
    try {
      await markAlertAsRead(businessId, alertId);
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

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    if (!alertsSummary) return [];
    if (alertFilter === "all") return alertsSummary.alerts;
    return alertsSummary.alerts.filter((a) => a.alert_type === alertFilter);
  }, [alertsSummary, alertFilter]);

  // Imminent renewal banner item
  const imminentRenewal = alertsSummary?.alerts.find(
    (a) => a.alert_type === "renewal_due" && !a.is_read
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-indigo-50/20 text-slate-800">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Navigation Bar (Steps 1 to 5-7) */}
        <StepNavigation currentStep={5} businessId={businessId} />

        {/* Missing Business State */}
        {!businessId && !loading && (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center max-w-xl mx-auto shadow-sm mt-8">
            <Building2 className="w-14 h-14 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Business Selected</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Please enter your business enterprise profile in Step 1 first to track statutory approvals, portal submissions, and renewal reminders.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 text-white font-semibold text-sm shadow-md hover:from-amber-700 hover:to-indigo-700 transition-all"
            >
              <span>← Go to Step 1: Business Details</span>
            </Link>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Synchronizing application tracking & alerts...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 mb-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base">Error Loading Tracker</h3>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={() => businessId && loadData(businessId)}
                className="mt-3 text-xs font-semibold px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {businessId && !loading && (
          <>
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Steps 5, 6 & 7: Official Portal Handoff, Status Tracker & Alerts</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Compliance Tracker & Smart Notifications
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Active monitoring for <span className="font-semibold text-slate-900">{enterpriseName || "Your Enterprise"}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => businessId && loadData(businessId)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Refresh Status</span>
                </button>
                <Link
                  href={`/dependencies?business_id=${businessId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
                >
                  <span>← Step 4: Dependency Map</span>
                </Link>
              </div>
            </div>

            {/* Step 7: Top Alert Banner for Imminent Renewals / Critical Action */}
            {imminentRenewal && (
              <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500/10 via-red-500/10 to-orange-500/10 border border-amber-300/80 p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
                      <AlertTriangle className="h-5 w-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                          Renewal Alert
                        </span>
                        {imminentRenewal.due_date && (
                          <span className="text-xs font-semibold text-red-700">
                            Due: {imminentRenewal.due_date}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                        ⚠️ {imminentRenewal.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">{imminentRenewal.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleMarkAlertRead(imminentRenewal.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Summary Cards (Step 7: Alerts Summary) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <Clock className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">
                    {alertsSummary?.renewal_due_count || 0}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Upcoming Renewals
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">
                    {alertsSummary?.pending_action_count || 0}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Pending Actions
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <Info className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">
                    {alertsSummary?.status_update_count || 0}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status Updates
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 6: Application Status Tracker & 5-Stage Stepper View */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      6
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Step 6: Official Application Status Tracker
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your official government reference number & monitor real-time 5-stage approval progression.
                  </p>
                </div>

                {/* Stage Badges summary */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                    Total: {trackedApprovals.length}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                    Verified: {stageCounts["documents_verified"] || 0}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                    Inspection: {stageCounts["department_inspection"] || 0}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Approved: {stageCounts["approved"] || 0}
                  </span>
                </div>
              </div>

              {/* Clearance Cards with 5-Stage Stepper */}
              <div className="space-y-6">
                {trackedApprovals.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No clearances mapped yet. Please complete Step 2 (Approval Roadmap) first.
                  </div>
                ) : (
                  trackedApprovals.map((app) => {
                    const currentStageIdx = getStageIndex(app.tracking_stage);
                    const isFullyApproved = app.tracking_stage === "approved";

                    return (
                      <div
                        key={app.id}
                        className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 sm:p-6 transition-all hover:shadow-md hover:border-indigo-200"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200/70">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md">
                                {app.code}
                              </span>
                              <span className="text-xs font-medium text-slate-500">
                                {app.department}
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">
                              {app.name}
                            </h3>
                          </div>

                          {/* App ID & Actions */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                              <span className="text-xs text-slate-500 font-medium">Govt. Ref ID:</span>
                              <span className="text-xs font-mono font-bold text-indigo-700">
                                {app.application_id || "Not Entered Yet"}
                              </span>
                            </div>

                            <button
                              onClick={() => handleOpenEdit(app)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{app.application_id ? "Update Stage" : "Enter App ID"}</span>
                            </button>

                            {/* Step 5 Handoff Gate Button */}
                            <button
                              onClick={() => handleOpenPortalHandoff(app.approval_id)}
                              disabled={checkingPortalId === app.approval_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm disabled:opacity-60"
                            >
                              {checkingPortalId === app.approval_id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                              ) : (
                                <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                              )}
                              <span>Official Portal</span>
                            </button>

                            {/* Deep Link Ask AI Trigger */}
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("niyamsetu-ask-ai", {
                                    detail: { prompt: `What is the verification procedure, inspection norms, and expected timeline for ${app.name}?` },
                                  })
                                );
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 transition-colors shadow-sm cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Ask AI</span>
                            </button>
                          </div>
                        </div>

                        {/* 5-Stage Stepper Component */}
                        <div className="pt-6">
                          <div className="relative">
                            {/* Connecting Line */}
                            <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 -z-0">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 via-indigo-600 to-emerald-600 transition-all duration-500"
                                style={{
                                  width: `${(currentStageIdx / (STAGES.length - 1)) * 100}%`,
                                }}
                              />
                            </div>

                            {/* Stages Grid */}
                            <div className="relative z-10 flex items-start justify-between">
                              {STAGES.map((s, idx) => {
                                const isCompleted = idx < currentStageIdx;
                                const isCurrent = idx === currentStageIdx;
                                const isPending = idx > currentStageIdx;

                                return (
                                  <div
                                    key={s.key}
                                    className="flex flex-col items-center text-center max-w-[80px] sm:max-w-[110px]"
                                  >
                                    <div
                                      className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                        isCompleted
                                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                                          : isCurrent
                                          ? "bg-indigo-600 text-white ring-4 ring-indigo-200 ring-offset-2 animate-pulse"
                                          : "bg-white text-slate-400 border-2 border-slate-300"
                                      }`}
                                    >
                                      {isCompleted ? (
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                      ) : (
                                        s.stepNum
                                      )}
                                    </div>
                                    <span
                                      className={`mt-2 text-[11px] sm:text-xs font-medium leading-tight ${
                                        isCurrent
                                          ? "text-indigo-900 font-bold"
                                          : isCompleted
                                          ? "text-emerald-800"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {s.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Notes if available */}
                          {app.notes && (
                            <div className="mt-5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
                              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-semibold">Latest Tracking Note: </span>
                                <span>{app.notes}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* STEP 7: Reminders & Notifications Center */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                      7
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Step 7: Reminders & Statutory Notifications Center
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Automated expiry notices, pending statutory upload alerts, and department verification updates.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {(
                    [
                      { key: "all", label: "All Alerts" },
                      { key: "renewal_due", label: "Renewals" },
                      { key: "pending_action", label: "Actions" },
                      { key: "status_update", label: "Updates" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setAlertFilter(t.key)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        alertFilter === t.key
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alerts List */}
              <div className="divide-y divide-slate-100">
                {filteredAlerts.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No alerts found for this filter.
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const isUnread = !alert.is_read;
                    return (
                      <div
                        key={alert.id}
                        className={`py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          isUnread ? "bg-amber-50/30 px-4 rounded-2xl my-1" : "hover:bg-slate-50/50 px-2"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 mt-0.5">
                            {alert.alert_type === "renewal_due" && (
                              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shadow-sm">
                                <Clock className="w-5 h-5 stroke-[2.2]" />
                              </div>
                            )}
                            {alert.alert_type === "pending_action" && (
                              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
                                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                              </div>
                            )}
                            {alert.alert_type === "status_update" && (
                              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-sm">
                                <Info className="w-5 h-5 stroke-[2.2]" />
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                                {alert.title}
                              </h4>
                              {isUnread && (
                                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Unread
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                              {alert.message}
                            </p>
                            {alert.due_date && (
                              <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold mt-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Target Completion / Expiry: {alert.due_date}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 sm:self-center self-end">
                          {isUnread && (
                            <button
                              onClick={() => handleMarkAlertRead(alert.id)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
                            >
                              Mark as Read
                            </button>
                          )}
                          {alert.alert_type === "pending_action" && (
                            <Link
                              href={`/vault?business_id=${businessId}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
                            >
                              <span>Open Vault</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* STEP 5: Official Portal Handoff Modal (Readiness Gate & Disclaimer) */}
        {activePortalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-8 overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                    <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                      Step 5: Official Portal Handoff
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {activePortalModal.approval_name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setActivePortalModal(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Checklist Gate */}
              <div className="mt-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pre-flight Statutory Readiness Checklist
                </h4>

                <div className="space-y-2.5">
                  {/* Check 1: Eligibility */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2.5">
                      {activePortalModal.check_eligibility ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800">
                        1. Eligibility Criteria Satisfied
                      </span>
                    </div>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        activePortalModal.check_eligibility
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {activePortalModal.check_eligibility ? "Verified" : "Pending"}
                    </span>
                  </div>

                  {/* Check 2: Documents */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2.5">
                      {activePortalModal.check_documents ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800">
                        2. Mandatory Vault Documents Uploaded
                      </span>
                    </div>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        activePortalModal.check_documents
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {activePortalModal.check_documents ? "Ready" : "Incomplete"}
                    </span>
                  </div>

                  {/* Check 3: Prerequisites */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2.5">
                      {activePortalModal.check_prerequisites ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800">
                        3. Prerequisite Clearances Cleared
                      </span>
                    </div>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        activePortalModal.check_prerequisites
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {activePortalModal.check_prerequisites ? "Satisfied" : "Blocked"}
                    </span>
                  </div>
                </div>

                {/* Missing alerts if any */}
                {activePortalModal.missing_requirements.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mt-2">
                    <span className="font-bold">Missing Requirements:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-800">
                      {activePortalModal.missing_requirements.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Statutory Disclaimer Box */}
              <div className="mt-5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 text-xs text-amber-950 leading-relaxed">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Statutory Disclaimer: </span>
                    <span>{activePortalModal.statutory_disclaimer}</span>
                  </div>
                </div>
              </div>

              {/* Big CTA */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActivePortalModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>

                <a
                  href={activePortalModal.official_portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 hover:from-amber-700 hover:to-indigo-700 transition-all"
                >
                  <span>Proceed to Official Portal</span>
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Edit Tracking Modal */}
        {editingApproval && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-8 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    Update Application Tracking
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {editingApproval.name}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingApproval(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTracking} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Government Application Reference ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH2026-FSSAI-8921"
                    value={inputAppId}
                    onChange={(e) => setInputAppId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the acknowledgment or reference number provided by the government portal.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Current Tracking Progression Stage
                  </label>
                  <select
                    value={inputStage}
                    onChange={(e) => setInputStage(e.target.value as TrackingStage)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  >
                    <option value="submitted">1. Submitted (Application & Fee Paid)</option>
                    <option value="documents_verified">2. Documents Verified</option>
                    <option value="department_inspection">3. Department Inspection / Site Verification</option>
                    <option value="final_review">4. Final Competent Authority Review</option>
                    <option value="approved">5. Approved & Clearance Certificate Issued</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Notes & Action Items (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g., Inspector scheduled site visit for next Tuesday at 11 AM..."
                    value={inputNotes}
                    onChange={(e) => setInputNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingApproval(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTracking || !inputAppId.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                  >
                    {isSavingTracking && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Tracking Details</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 NiyamSetu &bull; National Regulatory Compliance &amp; Approval Engine &bull; Digital India Initiative</p>
          <div className="flex items-center gap-6">
            <span>Enterprise Regulatory Gateway</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function TrackerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-600">Loading NiyamSetu Tracker...</span>
          </div>
        </div>
      }
    >
      <TrackerPageContent />
    </Suspense>
  );
}
