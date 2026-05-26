import { API_BASE_URL } from './config';
import { fetchJsonWithAuth } from './fetchWithAuth';

export const TENANT_ADMIN_BASE = `${API_BASE_URL}/api/v1/tenant-admin`;

export interface LlmUsageStats {
  totalTokensUsed: number;
  totalRequests: number;
  tokensThisMonth: number;
  requestsThisMonth: number;
  tokensToday: number;
  requestsToday: number;
  averageTokensPerRequest: number;
}

export interface DocumentStats {
  totalDocuments: number;
  totalChunks: number;
  averageChunksPerDocument: number;
  embeddingStatusBreakdown: {
    COMPLETED: number;
    PROCESSING: number;
    PENDING: number;
    FAILED: number;
  };
}

export interface DashboardAnalytics {
  llmUsage: LlmUsageStats;
  documentStats: DocumentStats;
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/dashboard`);
}

export async function getLlmUsageStats(): Promise<LlmUsageStats> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/dashboard/llm-usage`);
}

export async function getDocumentStats(): Promise<DocumentStats> {
  return await fetchJsonWithAuth(`${TENANT_ADMIN_BASE}/dashboard/documents`);
}
