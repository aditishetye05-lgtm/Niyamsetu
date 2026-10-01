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
      // ignore json parse error
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
