import { API_BASE_URL } from './config';

export type TenantStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

export interface TenantRegistrationRequest {
  companyName: string;
  address?: string;
  website?: string;
  companySize?: string;
  contactEmail: string;
  representativeName?: string;
  representativePosition?: string;
  representativePhone?: string;
  requestMessage?: string;
}

export interface TenantRegistrationResponse {
  message: string;
  tenantId?: string;
}

export async function registerTenant(
  data: TenantRegistrationRequest
): Promise<TenantRegistrationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/register-tenant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    const message = responseData?.message || responseData?.error || 'Đăng ký thất bại';
    throw new Error(message);
  }

  return responseData;
}
