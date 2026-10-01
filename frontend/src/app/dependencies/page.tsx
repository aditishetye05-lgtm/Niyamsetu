"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Header } from "@/components/Header";
import { DAGCustomNode } from "@/components/DAGCustomNode";
import {
  DAGResponse,
  DAGNode,
  getDependencyMap,
} from "@/lib/api";
import {
  GitFork,
  CheckCircle2,
  Lock,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building2,
  FolderArchive,
  ArrowRight,
  Sparkles,
  Layers,
  X,
  FileCheck2,
  Info,
} from "lucide-react";

// Dagre graph auto-layout function
const nodeWidth = 320;
const nodeHeight = 200;

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "LR") {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 90, nodesep: 40 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function DependenciesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [dagData, setDagData] = useState<DAGResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected node for Side Drawer
  const [selectedNode, setSelectedNode] = useState<DAGNode | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes = useMemo(() => ({ clearanceNode: DAGCustomNode as React.ComponentType<any> }), []);

  const handleNodeClick = useCallback((node: DAGNode) => {
    setSelectedNode(node);
  }, []);

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

    loadDAG(id);
  }, [searchParams]);

  const loadDAG = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDependencyMap(id);
      setDagData(data);

      // Convert backend nodes to React Flow nodes
      const rawNodes: Node[] = data.nodes.map((n) => ({
        id: n.id,
        type: "clearanceNode",
        position: { x: 0, y: 0 },
        data: {
          ...n,
          onNodeClick: handleNodeClick,
        },
      }));

      // Convert backend edges to React Flow edges with styling
      const rawEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: !e.is_satisfied,
        style: {
          stroke: e.is_satisfied ? "#10b981" : "#f59e0b",
          strokeWidth: 2.5,
          strokeDasharray: e.is_satisfied ? undefined : "5 5",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: e.is_satisfied ? "#10b981" : "#f59e0b",
        },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        rawNodes,
        rawEdges,
        "LR"
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      // Default select first "CAN_APPLY_NOW" node if available
      const readyNode = data.nodes.find((n) => n.execution_state === "CAN_APPLY_NOW");
      if (readyNode) {
        setSelectedNode(readyNode);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load approval dependency map.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dagData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 animate-pulse space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
        <div className="h-[600px] bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (!businessId || !dagData) {
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
            Please register your business enterprise in Step 1 first to generate your approval dependency map.
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

  const { summary } = dagData;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 flex flex-col">
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

            <Link
              href={`/roadmap?business_id=${businessId}`}
              className="flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                ✓
              </span>
              <span>2. Approval Roadmap</span>
            </Link>

            <Link
              href={`/vault?business_id=${businessId}`}
              className="flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                ✓
              </span>
              <span>3. Document Vault</span>
            </Link>

            <span className="flex items-center gap-1.5 font-bold text-indigo-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">
                4
              </span>
              <span>4. Dependency Map</span>
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 rounded-full w-full transition-all duration-500"></div>
          </div>
        </div>

        {/* Top Header & Metrics Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold mb-1.5 border border-indigo-200">
              <GitFork className="w-3.5 h-3.5 text-indigo-600" />
              <span>Directed Acyclic Graph (DAG) Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Approval Dependency Map
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Enterprise: <strong className="text-slate-800">{dagData.enterprise_name}</strong> &bull; Visualizes parallel vs. sequential statutory clearance dependencies.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-center">
              <div className="text-lg font-black text-emerald-700">
                {summary.ready_to_apply_count}
              </div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Ready to Apply
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-1.5 text-center">
              <div className="text-lg font-black text-amber-700">
                {summary.blocked_count}
              </div>
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Blocked
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 px-3.5 py-1.5 text-center">
              <div className="text-lg font-black text-blue-700">
                {summary.in_progress_count}
              </div>
              <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                In Progress
              </div>
            </div>

            <div className="rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-1.5 text-center">
              <div className="text-lg font-black text-slate-700">
                {summary.completed_count}
              </div>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Completed
              </div>
            </div>
          </div>
        </div>

        {/* Legend Bar matching slide specifications */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Legend:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-600"></span>
              <span className="font-medium text-slate-700">
                You can apply now (Independent / Prerequisites Met)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-400 border border-amber-500"></span>
              <span className="font-medium text-slate-700">
                Depends on preceding approval (Blocked)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-blue-400 border border-blue-500"></span>
              <span className="font-medium text-slate-700">
                Under Review / Submitted
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-700 border border-emerald-800"></span>
              <span className="font-medium text-slate-700">
                Completed / Approved
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/vault?business_id=${businessId}`}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              <FolderArchive className="h-3.5 w-3.5" />
              <span>Document Vault</span>
            </Link>
          </div>
        </div>

        {/* Main Canvas & Side Drawer */}
        <div className="relative flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-[640px] flex">
          {/* React Flow Canvas */}
          <div className="flex-1 h-full w-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              maxZoom={1.5}
            >
              <Background color="#cbd5e1" gap={20} size={1} />
              <Controls position="bottom-left" />
              <MiniMap
                position="bottom-right"
                nodeStrokeColor="#0f172a"
                nodeColor={(n) => {
                  const nodeData = n.data as unknown as DAGNode;
                  if (nodeData.execution_state === "CAN_APPLY_NOW") return "#10b981";
                  if (nodeData.execution_state === "COMPLETED") return "#059669";
                  if (nodeData.execution_state === "IN_PROGRESS") return "#3b82f6";
                  return "#f59e0b";
                }}
                className="!rounded-xl !border-slate-200 shadow-md"
              />
            </ReactFlow>
          </div>

          {/* Right Side Drawer for Selected Node Details */}
          {selectedNode && (
            <div className="w-80 md:w-96 border-l border-slate-200 bg-white p-6 overflow-y-auto flex flex-col justify-between shrink-0 shadow-xl z-20 animate-in slide-in-from-right duration-200">
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                      {selectedNode.code}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                      {selectedNode.label}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Status Badge & Readiness */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Clearance Status:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full ${
                        selectedNode.execution_state === "CAN_APPLY_NOW"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : selectedNode.execution_state === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedNode.execution_state === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {selectedNode.execution_state === "CAN_APPLY_NOW"
                        ? "Ready to Apply"
                        : selectedNode.execution_state === "COMPLETED"
                        ? "Approved"
                        : selectedNode.execution_state === "IN_PROGRESS"
                        ? "In Progress"
                        : "Blocked (Prerequisites Pending)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Department:</span>
                    <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
                      {selectedNode.department}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Est. Processing:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedNode.processing_days} Days
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Document Readiness:</span>
                    <span className="font-bold text-amber-700">
                      {selectedNode.documents_ready_percentage}%
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Regulatory Mandate
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedNode.description}
                  </p>
                </div>

                {/* Prerequisites Evaluation */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Prerequisite Clearances
                  </h4>
                  {selectedNode.prerequisites && selectedNode.prerequisites.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedNode.prerequisites.map((pCode) => (
                        <div
                          key={pCode}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <span className="font-mono font-semibold text-slate-700">{pCode}</span>
                          {selectedNode.blocking_reasons?.some((r) => r.includes(pCode)) ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                              Pending
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Met
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>Independent clearance &bull; No prior prerequisite required</span>
                    </div>
                  )}
                </div>

                {/* Blocking reasons notice if blocked */}
                {selectedNode.blocking_reasons && selectedNode.blocking_reasons.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" />
                      Blocking Conditions:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {selectedNode.blocking_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom Drawer Actions */}
              <div className="pt-6 border-t border-slate-200 space-y-2.5">
                <Link
                  href={`/vault?business_id=${businessId}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-amber-700 transition-colors"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>Prepare Documents in Vault</span>
                </Link>

                {selectedNode.portal_url && (
                  <a
                    href={selectedNode.portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span>Visit Official Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            href={`/roadmap?business_id=${businessId}`}
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1"
          >
            <span>← Back to Approval Roadmap (Step 2)</span>
          </Link>

          <Link
            href={`/vault?business_id=${businessId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-amber-700 hover:to-orange-700 transition-all cursor-pointer"
          >
            <span>Open Document Vault (Step 3)</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 NiyamSetu &bull; Smart India Hackathon 2024</p>
          <div className="flex items-center gap-6">
            <span>Powered by Next.js 14 &bull; FastAPI &bull; React Flow &bull; Supabase PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function DependenciesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">
              Loading Approval Dependency Map...
            </div>
          }
        >
          <DependenciesInner />
        </Suspense>
      </main>
    </div>
  );
}
