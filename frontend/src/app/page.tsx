import React from "react";
import { Header } from "@/components/Header";
import { BusinessForm } from "@/components/BusinessForm";
import {
  ShieldCheck,
  Zap,
  MapPin,
  FileText,
  Building,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50/40 via-white to-slate-50">
      <Header />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-4 border border-emerald-200">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Govt-Aligned Compliance Engine &bull; Digital India Initiative
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950">
              Accelerate Your Enterprise Approvals with{" "}
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent">
                NiyamSetu
              </span>
            </h1>
            <p className="mt-3.5 text-base sm:text-lg text-slate-600 leading-relaxed">
              Navigate statutory clearances, environmental permissions, licenses, and single-window state registrations seamlessly.
            </p>
          </div>

          {/* Business Onboarding Step 1 Card */}
          <BusinessForm />

          {/* Value Props / Information Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm hover:shadow-md transition-shadow backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Automated Clearance Mapping
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Instantly map necessary clearances like FSSAI, Pollution Control, Fire NOC, and Factories Act based on your business type and state.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm hover:shadow-md transition-shadow backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                State &amp; Central Synchronized
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Covers state-specific single window portals (MAITRI, Investor Facilitation Portal, etc.) along with National Single Window System (NSWS).
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm hover:shadow-md transition-shadow backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Incentive &amp; Subsidy Advisory
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Identify MSME category benefits, capital subsidies, and stamp duty exemptions applicable to your investment bracket.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
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
