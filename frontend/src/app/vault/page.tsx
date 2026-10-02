"use client";

import React, { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { StepNavigation } from "@/components/StepNavigation";
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
  Eye,
  FileUp,
  Lock,
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

  // Selected document for upload widget
  const [activeUploadDoc, setActiveUploadDoc] = useState<ApprovalDocumentItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
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

  // Direct card upload handler triggered by the inline card button
  const handleDirectCardUpload = async (doc: ApprovalDocumentItem, file: File) => {
    if (!businessId) return;
    try {
      setUploadingDocId(doc.master_document_id);
      setError(null);
      setUploadSuccess(null);

      await uploadVaultDocument(
        businessId,
        doc.master_document_id,
        file,
        file.name
      );

      setUploadSuccess(`'${doc.name}' uploaded successfully & encrypted into the vault!`);

      // Refresh data
      const [updatedDocs, updatedScore] = await Promise.all([
        getBusinessDocuments(businessId),
        getComplianceScore(businessId),
      ]);
      setDocData(updatedDocs);
      setScoreData(updatedScore);

      // Update active doc if applicable
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
      setUploadingDocId(null);
    }
  };

  // Sticky widget upload submit
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="h-32 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-96 bg-slate-200 rounded-2xl"></div>
          <div className="lg:col-span-8 h-96 bg-slate-200 rounded-2xl"></div>
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
  let uploadedCount = docData.total_uploaded_unique;
  let totalCount = docData.total_required_unique;

  if (selectedTab === "all") {
    displayedDocuments = docData.unique_vault_checklist;
    uploadedCount = docData.total_uploaded_unique;
    totalCount = docData.total_required_unique;
  } else {
    const group = docData.approvals.find((a) => a.approval_id === selectedTab);
    if (group) {
      displayedDocuments = group.documents;
      currentGroupTitle = group.approval_name;
      currentGroupDesc = `Issued by ${group.department}. Requires ${group.total_documents} documents (${group.uploaded_documents} uploaded).`;
      uploadedCount = group.uploaded_documents;
      totalCount = group.total_documents;
    }
  }

  const completionPct = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 100;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Stepper Progress Bar */}
      <StepNavigation currentStep={3} businessId={businessId} />

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

      {/* Global Alerts for Upload Errors or Success */}
      {uploadSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-medium text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
          <button
            onClick={() => setUploadSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile/Tablet Horizontal Scrollable Clearance Tab Strip (< lg) */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 pt-1 border-b border-slate-200/80 -mx-4 px-4 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedTab("all")}
          className={`shrink-0 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
            selectedTab === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Documents</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedTab === "all" ? "bg-slate-700 text-amber-300" : "bg-slate-100 text-slate-600"}`}>
            {docData.total_uploaded_unique}/{docData.total_required_unique}
          </span>
        </button>

        {docData.approvals.map((app) => {
          const isSelected = selectedTab === app.approval_id;
          const isComplete = app.uploaded_documents === app.total_documents && app.total_documents > 0;
          return (
            <button
              key={app.approval_id}
              type="button"
              onClick={() => setSelectedTab(app.approval_id)}
              className={`shrink-0 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 ${
                isSelected
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="font-semibold">{app.approval_name}</span>
              {isComplete ? (
                <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3]" />
              ) : (
                <span className={`text-[10px] font-bold px-1.5 rounded ${isSelected ? "bg-amber-700 text-amber-100" : "bg-slate-100 text-slate-600"}`}>
                  {app.uploaded_documents}/{app.total_documents}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Balanced 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (35% width / lg:col-span-4): Navigation & Sticky Widgets */}
        <div className="lg:col-span-4 space-y-5">
          {/* Desktop Clearance Category Navigation */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2 flex items-center justify-between">
              <span>Clearance Categories</span>
              <span className="text-[10px] text-slate-400">{docData.approvals.length + 1} Views</span>
            </div>

            {/* All Unique Documents Tab */}
            <button
              type="button"
              onClick={() => setSelectedTab("all")}
              className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                selectedTab === "all"
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
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

            {/* Individual Approval Categories */}
            <div className="space-y-1.5 pt-1">
              {docData.approvals.map((app) => {
                const isSelected = selectedTab === app.approval_id;
                const isComplete = app.uploaded_documents === app.total_documents && app.total_documents > 0;

                return (
                  <button
                    key={app.approval_id}
                    type="button"
                    onClick={() => setSelectedTab(app.approval_id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all flex flex-col gap-0.5 cursor-pointer ${
                      isSelected
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
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
          </div>

          {/* Sticky Widget Container */}
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Smart Document Uploader Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-amber-600" />
                  <span>Smart Document Uploader</span>
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Vault Dropzone
                </span>
              </div>

              {activeUploadDoc ? (
                <form onSubmit={handleUploadSubmit} className="space-y-3.5">
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      Active Target Document
                    </span>
                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                      {activeUploadDoc.name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Max: {activeUploadDoc.max_size_mb} MB</span>
                      <span>&bull;</span>
                      <span className="uppercase">{activeUploadDoc.valid_formats}</span>
                    </div>
                  </div>

                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/30"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.docx"
                    />
                    <FileUp className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                    <div className="text-xs font-semibold text-slate-700">
                      {selectedFile ? (
                        <span className="text-amber-700 font-bold truncate block">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                        </span>
                      ) : (
                        <span>Click to choose file or drag here</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Valid formats: PDF, PNG, JPEG (5MB Limit)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:from-amber-700 hover:to-orange-700 disabled:opacity-70 transition-all cursor-pointer"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Encrypting &amp; Attaching...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="h-3.5 w-3.5" />
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
                <div className="text-center py-6 text-xs text-slate-400">
                  Select any document from the list to target it.
                </div>
              )}
            </div>

            {/* Compact Security & Encryption Seal Badge */}
            <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-4 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    Security &amp; Encryption Seal
                  </h4>
                  <span className="text-[10px] font-medium text-emerald-800">
                    ISO 27001 &bull; Digital India Aligned
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px] text-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>AES-256 Bit Encryption at Rest</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  <span>Role-Based Isolation (Zero Tenant Leakage)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>Regulatory Verification Purpose Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (65% width / lg:col-span-8): Clearance Header & Self-Contained Document Cards */}
        <div className="lg:col-span-8 space-y-4">
          {/* Header & Progress Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {currentGroupTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{currentGroupDesc}</p>
              </div>

              <div className="shrink-0 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  {uploadedCount} of {totalCount} Uploaded
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {completionPct}%
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Internal Scrollable Document Cards Grid */}
          <div className="max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 space-y-4">
            {displayedDocuments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 text-sm">
                No statutory documents mapped for this selection.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedDocuments.map((doc) => {
                  const isSelected = activeUploadDoc?.master_document_id === doc.master_document_id;
                  const isUploaded = doc.is_uploaded;
                  const isCardUploading = uploadingDocId === doc.master_document_id;
                  const fileInputId = `direct-upload-${doc.master_document_id}`;

                  return (
                    <div
                      key={doc.master_document_id}
                      onClick={() => handleSelectDocForUpload(doc)}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      {/* Hidden File Input for Direct Inline Upload */}
                      <input
                        id={fileInputId}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleDirectCardUpload(doc, e.target.files[0]);
                          }
                        }}
                      />

                      {/* Card Content Top */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                                isUploaded
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                                {doc.name}
                              </h4>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                {doc.valid_formats} &bull; Max {doc.max_size_mb}MB
                              </span>
                            </div>
                          </div>

                          <div>
                            {doc.is_mandatory ? (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200 shrink-0">
                                Mandatory
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200 shrink-0">
                                Optional
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {doc.description}
                        </p>

                        {/* Cross-Approval Reuse Indicator */}
                        {doc.reused_in_approvals && doc.reused_in_approvals.length > 1 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-700">
                            <Sparkles className="h-3 w-3 text-indigo-600 shrink-0" />
                            <span>Reused across {doc.reused_in_approvals.length} clearances</span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Status & Inline Action Buttons */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col gap-2">
                        {isUploaded && doc.vault_document ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Verified &amp; Encrypted
                              </span>

                              <span className="text-[10px] font-mono text-slate-400">
                                {doc.vault_document.file_size_kb} KB
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-[11px] text-slate-700 truncate max-w-[160px] sm:max-w-[200px]" title={doc.vault_document.file_name}>
                                📄 {doc.vault_document.file_name}
                              </span>

                              <div className="flex items-center gap-2">
                                {doc.vault_document.file_url && (
                                  <a
                                    href={doc.vault_document.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 text-slate-500 hover:text-slate-800 transition-colors"
                                    title="View / Download"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </a>
                                )}

                                <button
                                  type="button"
                                  disabled={isCardUploading}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    document.getElementById(fileInputId)?.click();
                                  }}
                                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors disabled:opacity-50"
                                  title="Replace with new file"
                                >
                                  {isCardUploading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <span>Replace</span>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (doc.vault_document) handleDeleteDoc(doc.vault_document.id);
                                  }}
                                  className="text-rose-600 hover:text-rose-800 p-1 transition-colors"
                                  title="Delete document"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                              <AlertCircle className="h-3 w-3 text-amber-600" />
                              Missing
                            </span>

                            <button
                              type="button"
                              disabled={isCardUploading}
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById(fileInputId)?.click();
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                            >
                              {isCardUploading ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <FileUp className="w-3.5 h-3.5" />
                                  <span>Upload File</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
          <p>© 2026 NiyamSetu &bull; National Regulatory Compliance &amp; Approval Engine &bull; Digital India Initiative</p>
          <div className="flex items-center gap-6">
            <span>Enterprise Regulatory Gateway</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
