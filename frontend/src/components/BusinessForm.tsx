"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Briefcase,
  IndianRupee,
  Users,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  FileCheck2,
  RefreshCw,
  Copy,
  ExternalLink,
} from "lucide-react";
import { createBusinessProfile, BusinessProfileResponse } from "@/lib/api";
import { formatINR, formatIndianCurrencyWords } from "@/lib/utils";

const BUSINESS_TYPES = [
  { id: "Food Processing Unit", label: "Food Processing Unit", desc: "FSSAI, Pollution Control (SPCB), Factory License" },
  { id: "Chemical Manufacturing", label: "Chemical Manufacturing", desc: "Petroleum & Explosives Safety, CPCB/SPCB, Fire NOC" },
  { id: "Software/IT", label: "Software / IT & Services", desc: "STPI / SEZ, Shops & Establishment, Data Compliance" },
  { id: "General Retail", label: "General Retail & Trade", desc: "Trade License, GST, Legal Metrology, Labour Registrations" },
  { id: "Pharmaceuticals", label: "Pharmaceuticals & Healthcare", desc: "Drug Controller (CDSCO), Bio-Waste, SPCB Clearance" },
  { id: "Renewable Energy", label: "Renewable & Solar Energy", desc: "DISCOM Connectivity, CEIG, Environmental Clearance" },
];

const INDIAN_STATES = [
  "Maharashtra",
  "Gujarat",
  "Karnataka",
  "Delhi",
  "Tamil Nadu",
  "Uttar Pradesh",
  "Telangana",
  "Andhra Pradesh",
  "Rajasthan",
  "West Bengal",
  "Kerala",
  "Punjab",
  "Haryana",
  "Madhya Pradesh",
  "Odisha",
  "Assam",
  "Goa",
  "Uttarakhand",
];

const INVESTMENT_PRESETS = [
  { label: "₹10 Lakh", value: 1000000 },
  { label: "₹25 Lakh", value: 2500000 },
  { label: "₹50 Lakh", value: 5000000 },
  { label: "₹1 Crore", value: 10000000 },
  { label: "₹5 Crore", value: 50000000 },
];

const EMPLOYEE_PRESETS = [5, 15, 30, 75, 150];

export function BusinessForm() {
  const [enterpriseName, setEnterpriseName] = useState("");
  const [businessType, setBusinessType] = useState("Food Processing Unit");
  const [state, setState] = useState("Maharashtra");
  const [investmentInr, setInvestmentInr] = useState<string>("5000000");
  const [employeeCount, setEmployeeCount] = useState<string>("20");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProfile, setCreatedProfile] = useState<BusinessProfileResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Check if a business was previously registered in localStorage
  useEffect(() => {
    try {
      const savedId = localStorage.getItem("niyamsetu_business_id");
      const savedData = localStorage.getItem("niyamsetu_business_profile");
      if (savedId && savedData) {
        setCreatedProfile(JSON.parse(savedData));
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  const parsedInvestment = parseFloat(investmentInr) || 0;
  const parsedEmployees = parseInt(employeeCount, 10) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!enterpriseName.trim()) {
      setError("Please provide an Enterprise / Company name.");
      return;
    }
    if (parsedInvestment <= 0) {
      setError("Investment must be a positive number.");
      return;
    }
    if (parsedEmployees < 1) {
      setError("Employee count must be at least 1.");
      return;
    }

    try {
      setLoading(true);
      const res = await createBusinessProfile({
        enterprise_name: enterpriseName.trim(),
        business_type: businessType,
        state: state,
        investment_inr: parsedInvestment,
        employee_count: parsedEmployees,
      });

      // Persist in localStorage
      localStorage.setItem("niyamsetu_business_id", res.id);
      localStorage.setItem("niyamsetu_business_profile", JSON.stringify(res));

      setCreatedProfile(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while saving the profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!createdProfile) return;
    navigator.clipboard.writeText(createdProfile.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    localStorage.removeItem("niyamsetu_business_id");
    localStorage.removeItem("niyamsetu_business_profile");
    setCreatedProfile(null);
    setEnterpriseName("");
    setInvestmentInr("5000000");
    setEmployeeCount("20");
    setError(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Step Progress Tracker */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-500 mb-3 px-1">
          <span className="flex items-center gap-1.5 font-semibold text-amber-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white text-xs">
              1
            </span>
            Enter Business Details
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-xs">
              2
            </span>
            Regulatory Mapping
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 hidden sm:flex">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-xs">
              3
            </span>
            Actionable Roadmap
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full w-1/3 transition-all duration-500"></div>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 sm:px-8 py-6 text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-8 opacity-10 text-white pointer-events-none">
            <Building2 className="w-44 h-44" />
          </div>

          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Step 1 of 3
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                1. Enter Business Details
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Your Business Approval &amp; Compliance Navigator &bull; Tell us about your enterprise to generate personalized statutory approvals
              </p>
            </div>
          </div>
        </div>

        {/* Success State View */}
        {createdProfile ? (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-emerald-900">
                    Business Profile Successfully Saved!
                  </h3>
                  <p className="mt-1 text-sm text-emerald-700">
                    Enterprise registered in database with regulatory ID:
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <code className="rounded-lg bg-emerald-100/90 px-3 py-1.5 font-mono text-xs sm:text-sm font-semibold text-emerald-900 border border-emerald-300">
                      {createdProfile.id}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? "Copied!" : "Copy ID"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Summary Grid */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Profile Summary
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 text-xs block">Enterprise Name</span>
                  <span className="font-semibold text-slate-900 text-base">
                    {createdProfile.enterprise_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Business Type</span>
                  <span className="font-semibold text-slate-900">
                    {createdProfile.business_type}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Operating State</span>
                  <span className="font-semibold text-slate-900">
                    {createdProfile.state}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Capital Investment</span>
                  <span className="font-semibold text-slate-900">
                    {formatINR(createdProfile.investment_inr)}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      ({formatIndianCurrencyWords(createdProfile.investment_inr)})
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Employees</span>
                  <span className="font-semibold text-slate-900">
                    {createdProfile.employee_count} Persons
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">MSME Classification (Auto)</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {createdProfile.investment_inr <= 10000000
                      ? "Micro Enterprise"
                      : createdProfile.investment_inr <= 100000000
                      ? "Small Enterprise"
                      : "Medium Enterprise"}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => alert(`Roadmap for Business ID: ${createdProfile.id} is being generated for Step 2 & 3!`)}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all cursor-pointer"
              >
                <span>Generate Compliance Roadmap</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Register Another</span>
              </button>
            </div>
          </div>
        ) : (
          /* Input Form View */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <strong className="font-semibold">Unable to save profile:</strong> {error}
                </div>
              </div>
            )}

            {/* Field 1: Enterprise Name */}
            <div>
              <label
                htmlFor="enterprise_name"
                className="block text-sm font-semibold text-slate-900 mb-1.5"
              >
                Enterprise / Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <input
                  id="enterprise_name"
                  type="text"
                  required
                  placeholder="e.g. Sahyadri Bio Foods Pvt Ltd"
                  value={enterpriseName}
                  onChange={(e) => setEnterpriseName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Official entity name as registered or proposed for registration.
              </p>
            </div>

            {/* Field 2 & 3: Business Type & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Business Type */}
              <div>
                <label
                  htmlFor="business_type"
                  className="block text-sm font-semibold text-slate-900 mb-1.5"
                >
                  Business Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <select
                    id="business_type"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-8 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                    <span className="text-xs">▼</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Determines statutory clearances (e.g. SPCB, FSSAI, PESO).
                </p>
              </div>

              {/* State */}
              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-semibold text-slate-900 mb-1.5"
                >
                  State / Location <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-8 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                    <span className="text-xs">▼</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Determines state single-window portal and local clearances.
                </p>
              </div>
            </div>

            {/* Field 4: Investment in INR */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="investment_inr"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Investment in INR (₹) <span className="text-rose-500">*</span>
                </label>
                {parsedInvestment > 0 && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {formatIndianCurrencyWords(parsedInvestment)}
                  </span>
                )}
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 font-semibold text-base">
                  ₹
                </div>
                <input
                  id="investment_inr"
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  placeholder="5000000"
                  value={investmentInr}
                  onChange={(e) => setInvestmentInr(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              {/* Quick Preset Chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Quick Select:</span>
                {INVESTMENT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setInvestmentInr(String(preset.value))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                      parsedInvestment === preset.value
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 5: Number of Employees */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="employee_count"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Number of Employees <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-500">
                  {parsedEmployees >= 20 ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                      PF &amp; ESI Statutory Applicable
                    </span>
                  ) : (
                    <span className="text-slate-500">Exempt from mandatory PF/ESI</span>
                  )}
                </span>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Users className="h-5 w-5" />
                </div>
                <input
                  id="employee_count"
                  type="number"
                  min="1"
                  max="100000"
                  required
                  placeholder="20"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              {/* Quick Employee Chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Quick Select:</span>
                {EMPLOYEE_PRESETS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setEmployeeCount(String(count))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                      parsedEmployees === count
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {count} employees
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/25 hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving Profile to Database...</span>
                  </>
                ) : (
                  <>
                    <span>Get Started</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Card Footer Note */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 sm:px-8 py-3.5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-amber-600" />
            <span>Complies with Central (National Single Window System) &amp; State Industrial Policies</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">Next.js 14 &bull; FastAPI &bull; PostgreSQL</span>
        </div>
      </div>
    </div>
  );
}
