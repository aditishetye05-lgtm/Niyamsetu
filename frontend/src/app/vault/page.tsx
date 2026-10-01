"use client";

import React, { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ComplianceScoreWidget } from "@/components/ComplianceScoreWidget";
import {
  BusinessDocumentsResponse,
  ApprovalDocumentGroup,
  ApprovalDocumentItem,
  ComplianceScoreResponse,
  getBusinessDocuments,
  uploadVaultDocument,
  deleteVaultDocument,
  getComplianceScore,
} from "@/lib/api";
import {
  FolderArchive,
  UploadCloud,
  FileCheck2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  ShieldCheck,
  Building2,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Loader2,
  Check,
} from "lucide-react";

function VaultInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [docData, setDocData] = useState<BusinessDocumentsResponse | null>(null);
  const [scoreData, setScoreData] = useState<ComplianceScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab selection: "all" or specific approval_id
  const [selectedTab, setSelectedTab] = useState<string>("all");

  // Selected document for upload
  const [activeUploadDoc, setActiveUploadDoc] = useState<ApprovalDocumentItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    loadVaultData(id);
  }, [searchParams]);

  const loadVaultData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const [docs, score] = await Promise.all([
        getBusinessDocuments(id),
        getComplianceScore(id),
      ]);

      setDocData(docs);
      setScoreData(score);

      // Default active upload doc to first missing document if available
      const firstMissing = docs.unique_vault_checklist.find((d) => !d.is_uploaded);
      if (firstMissing) {
        setActiveUploadDoc(firstMissing);
      } else if (docs.unique_vault_checklist.length > 0) {
        setActiveUploadDoc(docs.unique_vault_checklist[0]);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load document vault.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDocForUpload = (doc: ApprovalDocumentItem) => {
    setActiveUploadDoc(doc);
    setSelectedFile(null);
    setUploadSuccess(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !activeUploadDoc) return;

    try {
      setUploading(true);
      setError(null);
      setUploadSuccess(null);

      await uploadVaultDocument(
        businessId,
        activeUploadDoc.master_document_id,
        selectedFile || undefined,
        selectedFile ? selectedFile.name : `${activeUploadDoc.code}_document.pdf`
      );

      setUploadSuccess(
        `'${activeUploadDoc.name}' uploaded successfully and reused across linked clearances!`
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh data
      const [updatedDocs, updatedScore] = await Promise.all([
        getBusinessDocuments(businessId),
        getComplianceScore(businessId),
      ]);
      setDocData(updatedDocs);
      setScoreData(updatedScore);

      // Advance to next missing document
      const nextMissing = updatedDocs.unique_vault_checklist.find((d) => !d.is_uploaded);
      if (nextMissing) {
        setActiveUploadDoc(nextMissing);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Document upload failed.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (vaultDocId: string) => {
    if (!businessId) return;
    if (!confirm("Are you sure you want to remove this document from the vault?")) return;

    try {
      setLoading(true);
      await deleteVaultDocument(businessId, vaultDocId);
      const [updatedDocs, updatedScore] = await Promise.all([
        getBusinessDocuments(businessId),
        getComplianceScore(businessId),
      ]);
      setDocData(updatedDocs);
      setScoreData(updatedScore);
    } catch (err) {
      alert("Failed to delete document.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !docData) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 animate-pulse space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="h-40 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 rounded-2xl md:col-span-2"></div>
        </div>
      </div>
    );
  }

  if (!businessId || !docData) {
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
            Please register your business enterprise in Step 1 first to access the Smart Document Vault.
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

  // Active documents to display based on selected tab
  let displayedDocuments: ApprovalDocumentItem[] = [];
  let currentGroupTitle = "All Required Documents (Smart Vault Checklist)";
  let currentGroupDesc =
    "Unique statutory documents needed across all your clearances. Uploading once satisfies all linked approvals.";

  if (selectedTab === "all") {
    displayedDocuments = docData.unique_vault_checklist;
  } else {
    const group = docData.approvals.find((a) => a.approval_id === selectedTab);
    if (group) {
      displayedDocuments = group.documents;
      currentGroupTitle = group.approval_name;
      currentGroupDesc = `Issued by ${group.department}. Requires ${group.total_documents} documents (${group.uploaded_documents} uploaded).`;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

          <span className="flex items-center gap-1.5 font-bold text-amber-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white text-xs">
              3
            </span>
            <span>3. Smart Document Vault</span>
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-600 rounded-full w-full transition-all duration-500"></div>
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-1.5 border border-amber-200">
            <FolderArchive className="w-3.5 h-3.5 text-amber-600" />
            <span>Smart Vault Engine &bull; Cross-Approval Reuse</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Check Required Documents &amp; Vault
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise: <strong className="text-slate-800">{docData.enterprise_name}</strong> &bull; Upload key proofs once and NiyamSetu automatically attaches them to every statutory license.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/roadmap?business_id=${businessId}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <span>← Back to Roadmap</span>
          </Link>
        </div>
      </div>

      {/* Dynamic Compliance Readiness Score Widget */}
      <ComplianceScoreWidget
        scoreData={scoreData}
        businessId={businessId}
        onRefresh={() => loadVaultData(businessId)}
      />

      {/* 3-Column Layout: Left (Approvals Tabs) | Middle (Checklist) | Right (Uploader) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Approval Tabs (3 Cols) */}
        <div className="lg:col-span-3 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
            Clearance Filter
          </div>

          {/* All Unique Documents Tab */}
          <button
            type="button"
            onClick={() => setSelectedTab("all")}
            className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
              selectedTab === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0" />
              <span>All Documents</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                selectedTab === "all"
                  ? "bg-slate-700 text-amber-300"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {docData.total_uploaded_unique}/{docData.total_required_unique}
            </span>
          </button>

          {/* Individual Approval Tabs */}
          {docData.approvals.map((app) => {
            const isSelected = selectedTab === app.approval_id;
            const isComplete = app.uploaded_documents === app.total_documents && app.total_documents > 0;

            return (
              <button
                key={app.approval_id}
                type="button"
                onClick={() => setSelectedTab(app.approval_id)}
                className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all flex flex-col gap-1 cursor-pointer ${
                  isSelected
                    ? "bg-amber-600 text-white border-amber-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold line-clamp-1">{app.approval_name}</span>
                  {isComplete ? (
                    <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-amber-700 text-amber-100"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {app.uploaded_documents}/{app.total_documents}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] line-clamp-1 ${
                    isSelected ? "text-amber-100" : "text-slate-400"
                  }`}
                >
                  {app.department}
                </span>
              </button>
            );
          })}
        </div>

        {/* Middle Column: Document Checklist (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {currentGroupTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{currentGroupDesc}</p>
            </div>

            <div className="space-y-3">
              {displayedDocuments.map((doc) => {
                const isSelected = activeUploadDoc?.master_document_id === doc.master_document_id;
                const isUploaded = doc.is_uploaded;

                return (
                  <div
                    key={doc.master_document_id}
                    onClick={() => handleSelectDocForUpload(doc)}
                    className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {doc.name}
                          </h4>
                          {doc.is_mandatory && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                              Mandatory
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2">
                          {doc.description}
                        </p>

                        {/* Cross-Approval Reuse Indicator */}
                        {doc.reused_in_approvals && doc.reused_in_approvals.length > 1 && (
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              <Sparkles className="h-3 w-3" />
                              Reused across {doc.reused_in_approvals.length} clearances
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Tag & Action */}
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {isUploaded ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Uploaded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            Missing
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-400">
                          {doc.valid_formats.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* If uploaded, show file info and delete button */}
                    {doc.vault_document && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span className="font-mono text-[11px] truncate max-w-[200px]">
                          📄 {doc.vault_document.file_name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (doc.vault_document) handleDeleteDoc(doc.vault_document.id);
                          }}
                          className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Upload Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm sticky top-24">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-amber-600" />
              <span>Smart Document Uploader</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select or drop a file to upload into the encrypted enterprise vault.
            </p>

            {activeUploadDoc ? (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    Target Document
                  </span>
                  <div className="text-sm font-bold text-slate-900">
                    {activeUploadDoc.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Max size: {activeUploadDoc.max_size_mb} MB &bull; Formats: {activeUploadDoc.valid_formats}
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/30"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx"
                  />
                  <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-700">
                    {selectedFile ? (
                      <span className="text-amber-700 font-bold">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    ) : (
                      <span>Click to browse or drag file here</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Or click upload to generate verified sample compliance mock
                  </p>
                </div>

                {uploadSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:from-amber-700 hover:to-orange-700 disabled:opacity-70 transition-all cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Encrypting &amp; Attaching...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="h-4 w-4" />
                      <span>
                        {activeUploadDoc.is_uploaded
                          ? "Replace in Vault"
                          : "Upload & Auto-Attach"}
                      </span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Select a document from the checklist to upload.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VaultPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50/20 via-white to-slate-50">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">
              Loading Smart Document Vault...
            </div>
          }
        >
          <VaultInner />
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
