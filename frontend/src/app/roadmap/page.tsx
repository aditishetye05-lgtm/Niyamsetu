"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ComplianceScoreWidget } from "@/components/ComplianceScoreWidget";
import {
  RoadmapResponse,
  BusinessApprovalItem,
  ComplianceScoreResponse,
  getBusinessRoadmap,
  discoverBusinessRoadmap,
  updateApprovalStatus,
  getComplianceScore,
} from "@/lib/api";
import { formatINR, formatIndianCurrencyWords } from "@/lib/utils";
import {
  Compass,
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  Filter,
  ArrowRight,
  GitFork,
  Sparkles,
  ChevronRight,
  RefreshCw,
  BadgeAlert,
  HelpCircle,
  FolderArchive,
  FileCheck,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  not_applied: {
    label: "Not Applied",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
  },
  documents_ready: {
    label: "Documents Ready",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  submitted: {
    label: "Submitted",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  under_review: {
    label: "Under Review",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  approved: {
    label: "Approved",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
};

function RoadmapInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [scoreData, setScoreData] = useState<ComplianceScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mandatory" | "in_progress" | "approved">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let id = searchParams.get("business_id");
    if (!id && typeof window !== "undefined") {
      id = localStorage.getItem("niyamsetu_business_id");
    }
    setBusinessId(id);

    if (!id) {
      setLoading(false);
      return;
    }

    loadRoadmapAndScore(id);
  }, [searchParams]);

  const loadRoadmapAndScore = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Try fetching or evaluating roadmap
      let data: RoadmapResponse;
      try {
        data = await getBusinessRoadmap(id);
      } catch {
        data = await discoverBusinessRoadmap(id);
      }
      setRoadmap(data);

      // Fetch compliance score
      try {
        const score = await getComplianceScore(id);
        setScoreData(score);
      } catch {
        // ignore score fetch error if backend warming up
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load approval roadmap.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (approvalId: string, newStatus: string) => {
    if (!businessId || !roadmap) return;
    try {
      setUpdatingId(approvalId);
      await updateApprovalStatus(businessId, approvalId, newStatus);
      setRoadmap((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          approvals: prev.approvals.map((item) =>
            item.id === approvalId ? { ...item, status: newStatus } : item
          ),
        };
      });

      // Refresh compliance score after status change
      const updatedScore = await getComplianceScore(businessId);
      setScoreData(updatedScore);
    } catch (err) {
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredApprovals = (roadmap?.approvals || []).filter((item) => {
    if (filter === "mandatory") return item.is_mandatory;
    if (filter === "in_progress")
      return item.status === "documents_ready" || item.status === "submitted" || item.status === "under_review";
    if (filter === "approved") return item.status === "approved";
    return true;
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Loading Skeleton */}
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
          <div className="h-44 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="grid grid-cols-1 gap-4">
            <div className="h-28 bg-slate-200 rounded-xl"></div>
            <div className="h-28 bg-slate-200 rounded-xl"></div>
            <div className="h-28 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!businessId || !roadmap) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mx-auto mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            No Business Profile Selected
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Please register your business enterprise in Step 1 first to generate your custom statutory compliance roadmap.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-amber-700 transition-colors"
            >
              <span>← Go to Step 1: Business Details</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { summary } = roadmap;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Stepper Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-500 mb-3 px-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
              ✓
            </span>
            <span>1. Business Details</span>
          </Link>
          <span className="flex items-center gap-1.5 font-bold text-amber-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white text-xs">
              2
            </span>
            <span>2. Approval Roadmap</span>
          </span>
          <Link
            href={`/vault?business_id=${businessId}`}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors hidden sm:flex"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-xs">
              3
            </span>
            <span>3. Document Vault &amp; Score</span>
          </Link>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-full w-2/3 transition-all duration-500"></div>
        </div>
      </div>

      {/* Top Enterprise Summary Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl shadow-slate-900/10 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none">
          <ShieldCheck className="w-56 h-56" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                {roadmap.business_type}
              </span>
              <span className="rounded-full bg-slate-700/80 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-600">
                {roadmap.state}
              </span>
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                {summary.msme_category}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {roadmap.enterprise_name}
            </h1>

            <p className="text-sm text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Capital: <strong>{formatINR(roadmap.investment_inr)}</strong>{" "}
                <span className="text-xs text-slate-400">
                  ({formatIndianCurrencyWords(roadmap.investment_inr)})
                </span>
              </span>
              <span>&bull;</span>
              <span>
                Employees: <strong>{roadmap.employee_count} Persons</strong>
              </span>
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 sm:p-4 text-center border border-white/10">
              <div className="text-2xl sm:text-3xl font-black text-amber-400">
                {summary.total_approvals}
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-300 mt-0.5">
                Total Approvals
              </div>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 sm:p-4 text-center border border-white/10">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {summary.mandatory_approvals}
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-300 mt-0.5">
                Mandatory
              </div>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 sm:p-4 text-center border border-white/10">
              <div className="text-2xl sm:text-3xl font-black text-orange-400">
                ~{summary.estimated_total_days}d
              </div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-300 mt-0.5">
                Max Timeline
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 3: Dynamic Compliance Readiness Score Widget */}
      <ComplianceScoreWidget
        scoreData={scoreData}
        businessId={businessId}
        onRefresh={() => loadRoadmapAndScore(businessId)}
      />

      {/* Main Section Header with Filter Tabs & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Your Required Approvals &amp; Clearances</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {filteredApprovals.length}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Personalized statutory clearance pipeline generated by NiyamSetu Discovery Engine.
          </p>
        </div>

        {/* Action Buttons: Vault & Dependency Map */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/vault?business_id=${businessId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:from-amber-700 hover:to-orange-700 transition-all cursor-pointer"
          >
            <FolderArchive className="h-4 w-4" />
            <span>Check Required Documents &amp; Vault →</span>
          </Link>

          <button
            type="button"
            onClick={() =>
              alert(
                `Feature 4 / Next Step: Interactive Directed Acyclic Dependency Graph for '${roadmap.enterprise_name}' is currently being linked!`
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border border-slate-300 transition-all cursor-pointer"
          >
            <GitFork className="h-4 w-4" />
            <span>Dependency Map</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Approvals ({roadmap.approvals.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("mandatory")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "mandatory"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Mandatory Only ({summary.mandatory_approvals})
        </button>
        <button
          type="button"
          onClick={() => setFilter("in_progress")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "in_progress"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          In Progress (
          {
            roadmap.approvals.filter(
              (a) =>
                a.status === "documents_ready" ||
                a.status === "submitted" ||
                a.status === "under_review"
            ).length
          }
          )
        </button>
        <button
          type="button"
          onClick={() => setFilter("approved")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === "approved"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Approved ({roadmap.approvals.filter((a) => a.status === "approved").length})
        </button>
      </div>

      {/* Approvals Card List */}
      <div className="space-y-4">
        {filteredApprovals.map((item, index) => {
          const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_applied;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Left Side: Number, Name, Department, Description */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-sm border border-amber-200/70 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    {index + 1}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {item.name}
                      </h3>
                      <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.code}
                      </span>
                      {item.is_mandatory && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          Mandatory
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>{item.department}</span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                      {item.description}
                    </p>

                    {/* Prerequisites & Details Pills */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Est. Duration: {item.processing_days} Days</span>
                      </span>

                      {item.prerequisites && (
                        <span className="inline-flex items-center gap-1 font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200">
                          <GitFork className="h-3.5 w-3.5" />
                          <span>
                            Prerequisites: {item.prerequisites.split(",").join(", ")}
                          </span>
                        </span>
                      )}

                      {item.official_portal_url && (
                        <a
                          href={item.official_portal_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-amber-700 hover:text-amber-800 hover:underline"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Status Selector */}
                <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-start gap-2 pt-2 md:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block mb-1">
                      Current Status
                    </span>
                    <select
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    >
                      <option value="not_applied">Not Applied</option>
                      <option value="documents_ready">Documents Ready</option>
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <Link
          href="/"
          className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1"
        >
          <span>← Back to Business Details (Step 1)</span>
        </Link>

        <Link
          href={`/vault?business_id=${businessId}`}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:from-amber-700 hover:to-orange-700 transition-all cursor-pointer"
        >
          <span>Proceed to Document Vault &amp; Score (Step 3)</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50/30 via-white to-slate-50">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">
              Loading Regulatory Roadmap...
            </div>
          }
        >
          <RoadmapInner />
        </Suspense>
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 NiyamSetu &bull; Smart India Hackathon 2024</p>
          <div className="flex items-center gap-6">
            <span>Powered by Next.js 14 &bull; FastAPI &bull; Supabase PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
