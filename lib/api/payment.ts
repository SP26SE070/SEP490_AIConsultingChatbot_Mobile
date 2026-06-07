import { PAYMENT_BASE } from './config';
import { fetchJsonWithAuth } from './fetchWithAuth';

export type PaymentStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export interface PaymentHistoryItem {
  payment_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transaction_code: string;
  tier: string;
  created_at?: string;
  paid_at?: string;
  expires_at?: string;
  is_expired?: boolean;
}

export async function getPaymentHistory(): Promise<PaymentHistoryItem[]> {
  return fetchJsonWithAuth<PaymentHistoryItem[]>(`${PAYMENT_BASE}/history`);
}
