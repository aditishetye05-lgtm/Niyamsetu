"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { DAGNode } from "@/lib/api";
import {
  CheckCircle2,
  Lock,
  Clock,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  FileCheck,
} from "lucide-react";

export interface CustomNodeData extends DAGNode {
  onNodeClick?: (node: DAGNode) => void;
}

export const DAGCustomNode = memo(({ data }: { data: CustomNodeData }) => {
  const node = data;

  const isReady = node.execution_state === "CAN_APPLY_NOW";
  const isCompleted = node.execution_state === "COMPLETED";
  const isInProgress = node.execution_state === "IN_PROGRESS";
  const isBlocked = node.execution_state === "BLOCKED";

  // Card theme classes
  const cardTheme = isCompleted
    ? "border-emerald-300 bg-emerald-50/60 shadow-sm"
    : isReady
    ? "border-emerald-500 bg-white ring-4 ring-emerald-500/15 shadow-lg shadow-emerald-500/10"
    : isInProgress
    ? "border-blue-400 bg-blue-50/40 shadow-sm"
    : "border-slate-300 bg-slate-50/80 opacity-90";

  return (
    <div
      onClick={() => node.onNodeClick?.(node)}
      className={`w-72 rounded-2xl border-2 p-4 text-left transition-all hover:scale-102 cursor-pointer ${cardTheme}`}
    >
      {/* Target handle on left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-white !bg-slate-500"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
          {node.code}
        </span>

        {/* State Badge */}
        {isReady && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping"></span>
            Ready to Apply
          </span>
        )}
        {isCompleted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        )}
        {isInProgress && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200">
            <Clock className="h-3 w-3 animate-spin" />
            In Progress
          </span>
        )}
        {isBlocked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
            <Lock className="h-3 w-3 text-amber-700" />
            Blocked
          </span>
        )}
      </div>

      {/* Clearance Title & Department */}
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
          {node.label}
        </h4>
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 line-clamp-1">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>{node.department}</span>
        </div>
      </div>

      {/* Blocked or Ready Notice */}
      {isBlocked && node.blocking_reasons && node.blocking_reasons.length > 0 && (
        <div className="mt-2.5 rounded-lg bg-amber-50/80 p-2 text-[10px] text-amber-800 border border-amber-200/80 flex items-start gap-1.5">
          <AlertCircle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{node.blocking_reasons[0]}</span>
        </div>
      )}

      {/* Document readiness indicator */}
      <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 flex items-center gap-1">
          <FileCheck className="h-3 w-3 text-slate-400" />
          <span>Docs Ready:</span>
        </span>
        <span
          className={`font-bold ${
            node.documents_ready_percentage === 100
              ? "text-emerald-700"
              : node.documents_ready_percentage > 0
              ? "text-amber-700"
              : "text-slate-500"
          }`}
        >
          {node.documents_ready_percentage}%
        </span>
      </div>

      {/* Ready Action Callout */}
      {isReady && (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors">
            <span>Proceed with Filing</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      )}

      {/* Source handle on right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-white !bg-slate-700"
      />
    </div>
  );
});

DAGCustomNode.displayName = "DAGCustomNode";
