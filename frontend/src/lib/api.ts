export interface BusinessProfileInput {
  enterprise_name: string;
  business_type: string;
  state: string;
  investment_inr: number;
  employee_count: number;
}

export interface BusinessProfileResponse {
  id: string;
  enterprise_name: string;
  business_type: string;
  state: string;
  investment_inr: number;
  employee_count: number;
  created_at: string;
}

export interface BusinessApprovalItem {
  id: string;
  approval_id: string;
  code: string;
  name: string;
  department: string;
  description: string;
  official_portal_url?: string | null;
  processing_days: number;
  prerequisites?: string | null;
  prerequisite_count: number;
  status: string;
  is_mandatory: boolean;
  created_at: string;
}

export interface RoadmapSummary {
  total_approvals: number;
  mandatory_approvals: number;
  estimated_total_days: number;
  msme_category: string;
}

export interface RoadmapResponse {
  business_id: string;
  enterprise_name: string;
  business_type: string;
  state: string;
  investment_inr: number;
  employee_count: number;
  summary: RoadmapSummary;
  approvals: BusinessApprovalItem[];
}

export interface VaultDocumentItem {
  id: string;
  business_id: string;
  master_document_id: string;
  file_name: string;
  file_url: string;
  mime_type?: string | null;
  file_size_kb: number;
  verification_status: string;
  uploaded_at: string;
}

export interface ApprovalDocumentItem {
  master_document_id: string;
  code: string;
  name: string;
  description: string;
  valid_formats: string;
  max_size_mb: number;
  is_mandatory: boolean;
  is_uploaded: boolean;
  vault_document?: VaultDocumentItem | null;
  reused_in_approvals: string[];
}

export interface ApprovalDocumentGroup {
  approval_id: string;
  approval_code: string;
  approval_name: string;
  department: string;
  total_documents: number;
  uploaded_documents: number;
  completion_percentage: number;
  documents: ApprovalDocumentItem[];
}

export interface BusinessDocumentsResponse {
  business_id: string;
  enterprise_name: string;
  total_required_unique: number;
  total_uploaded_unique: number;
  document_readiness_pct: number;
  approvals: ApprovalDocumentGroup[];
  unique_vault_checklist: ApprovalDocumentItem[];
}

export interface ComplianceScoreBreakdown {
  documents_readiness: number;
  approvals_progress: number;
  dependencies_score: number;
  renewals_validity_score: number;
}

export interface ComplianceScoreResponse {
  business_id: string;
  enterprise_name: string;
  overall_score: number;
  rating_label: string;
  breakdown: ComplianceScoreBreakdown;
  weights: Record<string, number>;
  summary_message: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function createBusinessProfile(
  data: BusinessProfileInput
): Promise<BusinessProfileResponse> {
  const response = await fetch(`${API_BASE_URL}/business/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMsg = `Server responded with ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMsg = errorData.detail
            .map((e: { msg?: string; loc?: string[] }) => e.msg || JSON.stringify(e))
            .join(", ");
        } else {
          errorMsg = String(errorData.detail);
        }
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function getBusinessProfile(
  businessId: string
): Promise<BusinessProfileResponse> {
  const response = await fetch(`${API_BASE_URL}/business/${businessId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch business profile (${response.status})`);
  }

  return response.json();
}

export async function discoverBusinessRoadmap(
  businessId: string
): Promise<RoadmapResponse> {
  const response = await fetch(
    `${API_BASE_URL}/business/${businessId}/discover-approvals`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to discover approvals (${response.status})`);
  }

  return response.json();
}

export async function getBusinessRoadmap(
  businessId: string
): Promise<RoadmapResponse> {
  const response = await fetch(
    `${API_BASE_URL}/business/${businessId}/roadmap`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch roadmap (${response.status})`);
  }

  return response.json();
}

export async function updateApprovalStatus(
  businessId: string,
  approvalId: string,
  status: string
): Promise<{ success: boolean; status: string }> {
  const response = await fetch(
    `${API_BASE_URL}/business/${businessId}/approvals/${approvalId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update status (${response.status})`);
  }

  return response.json();
}

export async function getBusinessDocuments(
  businessId: string
): Promise<BusinessDocumentsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/business/${businessId}/documents`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch business documents (${response.status})`);
  }

  return response.json();
}

export async function uploadVaultDocument(
  businessId: string,
  masterDocumentId: string,
  file?: File,
  fileName?: string
): Promise<VaultDocumentItem> {
  const formData = new FormData();
  formData.append("master_document_id", masterDocumentId);

  if (file) {
    formData.append("file", file);
  }
  if (fileName) {
    formData.append("file_name", fileName);
  }

  const response = await fetch(
    `${API_BASE_URL}/business/${businessId}/documents/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let errText = "Failed to upload document";
    try {
      const err = await response.json();
      if (err.detail) errText = err.detail;
    } catch {
      // ignore
    }
    throw new Error(errText);
  }

  return response.json();
}

export async function deleteVaultDocument(
  businessId: string,
  vaultDocumentId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/business/${businessId}/documents/${vaultDocumentId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete document (${response.status})`);
  }

  return response.json();
}

export async function getComplianceScore(
  businessId: string
): Promise<ComplianceScoreResponse> {
  const response = await fetch(
    `${API_BASE_URL}/business/${businessId}/compliance-score`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch compliance score (${response.status})`);
  }

  return response.json();
}

export interface DAGNode {
  id: string;
  code: string;
  label: string;
  department: string;
  description: string;
  status: string;
  execution_state: "CAN_APPLY_NOW" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  can_apply: boolean;
  blocking_reasons: string[];
  prerequisites: string[];
  documents_ready_percentage: number;
  portal_url?: string | null;
  processing_days: number;
}

export interface DAGEdge {
  id: string;
  source: string;
  target: string;
  is_satisfied: boolean;
  label?: string | null;
}

export interface DAGSummary {
  total_clearances: number;
  ready_to_apply_count: number;
  blocked_count: number;
  in_progress_count: number;
  completed_count: number;
}

export interface DAGResponse {
  business_id: string;
  enterprise_name: string;
  summary: DAGSummary;
  nodes: DAGNode[];
  edges: DAGEdge[];
}

export async function getDependencyMap(
  businessId: string
): Promise<DAGResponse> {
  const response = await fetch(
    `${API_BASE_URL}/business/${businessId}/dependency-map`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch dependency map (${response.status})`);
  }

  return response.json();
}

