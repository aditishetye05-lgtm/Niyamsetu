"use client";

import React from "react";
import Link from "next/link";
import { ComplianceScoreResponse } from "@/lib/api";
import {
  ShieldCheck,
  FileCheck,
  TrendingUp,
  GitFork,
  Clock,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

interface Props {
  scoreData: ComplianceScoreResponse | null;
  businessId: string;
  onRefresh?: () => void;
}

export function ComplianceScoreWidget({ scoreData, businessId }: Props) {
  if (!scoreData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-28 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  const { overall_score, rating_label, breakdown, summary_message } = scoreData;

  // Determine color theme based on score
  const isHigh = overall_score >= 80;
  const isMed = overall_score >= 50 && overall_score < 80;

  const colorTheme = isHigh
    ? {
        stroke: "#10b981", // emerald-500
        text: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      }
    : isMed
    ? {
        stroke: "#f59e0b", // amber-500
        text: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        badge: "bg-amber-100 text-amber-800 border-amber-300",
      }
    : {
        stroke: "#f43f5e", // rose-500
        text: "text-rose-700",
        bg: "bg-rose-50",
        border: "border-rose-200",
        badge: "bg-rose-100 text-rose-800 border-rose-300",
      };

  // SVG Radial Gauge calculation (radius = 42, circumference ~ 263.89)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overall_score / 100) * circumference;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/40 relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left: Circular Gauge & Score */}
        <div className="flex items-center gap-5 w-full lg:w-auto shrink-0">
          <div className="relative flex items-center justify-center h-28 w-28 shrink-0">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Animated Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={colorTheme.stroke}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {overall_score}%
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Readiness
              </span>
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${colorTheme.badge}`}
              >
                {rating_label}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Compliance Health
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Statutory Readiness Score
            </h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              {summary_message}
            </p>
          </div>
        </div>

        {/* Middle: 4 Component Breakdown Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:flex-1">
          {/* 1. Documents Readiness (40%) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 flex items-center gap-1">
                <FileCheck className="h-3.5 w-3.5 text-amber-600" />
                Docs (40%)
              </span>
              <span className="font-bold text-slate-900">
                {breakdown.documents_readiness}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${breakdown.documents_readiness}%` }}
              ></div>
            </div>
          </div>

          {/* 2. Approvals Progress (30%) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                Approvals (30%)
              </span>
              <span className="font-bold text-slate-900">
                {breakdown.approvals_progress}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${breakdown.approvals_progress}%` }}
              ></div>
            </div>
          </div>

          {/* 3. Dependencies Score (20%) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 flex items-center gap-1">
                <GitFork className="h-3.5 w-3.5 text-purple-600" />
                Prereqs (20%)
              </span>
              <span className="font-bold text-slate-900">
                {breakdown.dependencies_score}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${breakdown.dependencies_score}%` }}
              ></div>
            </div>
          </div>

          {/* 4. Renewals & Validity (10%) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                Renewals (10%)
              </span>
              <span className="font-bold text-slate-900">
                {breakdown.renewals_validity_score}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${breakdown.renewals_validity_score}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Link to Document Vault */}
        <div className="shrink-0 w-full sm:w-auto">
          <Link
            href={`/vault?business_id=${businessId}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:from-amber-700 hover:to-orange-700 transition-all cursor-pointer"
          >
            <span>Open Document Vault</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
