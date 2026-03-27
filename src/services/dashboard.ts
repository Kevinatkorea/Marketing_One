import { get } from './api';

export interface ViralDashboardStats {
  totalVirals: number;
  verifiedCount: number;
  pendingCount: number;
  failedCount: number;
  resultDistribution: {
    ok: number;
    warning: number;
    fail: number;
    pending: number;
  };
  negativeCommentCount: number;
  failReasons: Array<{ reason: string; count: number }>;
  lastUpdated: string;
}

export function fetchViralDashboard(projectId: string): Promise<ViralDashboardStats> {
  return get<ViralDashboardStats>(`/projects/${projectId}/dashboard/viral`);
}
