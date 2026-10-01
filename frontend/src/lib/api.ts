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
