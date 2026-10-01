"use client";

import React from "react";
import Link from "next/link";
import { Check, Compass, GitFork, FolderArchive, MapPin, Activity } from "lucide-react";

interface StepNavigationProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  businessId?: string | null;
}

export function StepNavigation({ currentStep, businessId }: StepNavigationProps) {
  const steps = [
    {
      num: 1,
      title: "Step 1: Details",
      href: "/",
      icon: MapPin,
    },
    {
      num: 2,
      title: "Step 2: Roadmap",
      href: businessId ? `/roadmap?business_id=${businessId}` : "/roadmap",
      icon: Compass,
    },
    {
      num: 3,
      title: "Step 3: Vault",
      href: businessId ? `/vault?business_id=${businessId}` : "/vault",
      icon: FolderArchive,
    },
    {
      num: 4,
      title: "Step 4: Dependencies",
      href: businessId ? `/dependencies?business_id=${businessId}` : "/dependencies",
      icon: GitFork,
    },
    {
      num: 5,
      title: "Steps 5-7: Tracker & Alerts",
      href: businessId ? `/tracker?business_id=${businessId}` : "/tracker",
      icon: Activity,
    },
  ];

  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 sm:p-4 mb-6 transition-all">
      <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
        {steps.map((step) => {
          const isCompleted = step.num < currentStep;
          const isCurrent = step.num === currentStep;

          let badgeBg = "bg-slate-100 text-slate-500 border border-slate-200";
          let textColor = "text-slate-500";
          if (isCompleted) {
            badgeBg = "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20";
            textColor = "text-emerald-700 hover:text-emerald-800 font-medium";
          } else if (isCurrent) {
            badgeBg = "bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-sm shadow-indigo-500/20 ring-2 ring-indigo-200";
            textColor = "text-indigo-900 font-bold";
          }

          const content = (
            <div className={`flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm px-2.5 py-1.5 rounded-lg transition-colors ${textColor} ${isCurrent ? "bg-indigo-50/80" : "hover:bg-slate-50"}`}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${badgeBg}`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.num}
              </span>
              <span>{step.title}</span>
            </div>
          );

          return (
            <React.Fragment key={step.num}>
              {businessId || step.num === 1 ? (
                <Link href={step.href} className="outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg">
                  {content}
                </Link>
              ) : (
                <div className="cursor-not-allowed opacity-60">{content}</div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress track */}
      <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>
    </div>
  );
}
