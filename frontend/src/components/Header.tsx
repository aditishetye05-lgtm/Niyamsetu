"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Compass, Sparkles, Building2 } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
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

        {/* Center / Right Badges */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Govt. Regulatory Engine</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/70">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>FastAPI Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
