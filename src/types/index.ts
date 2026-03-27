// ============================================================
// PerformanceOne - Shared TypeScript Types
// ============================================================

// --- Project ---

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
  owner: string;
}

// --- Product (상품/서비스) ---

export interface CampaignPeriod {
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'ended';
}

export interface Product {
  id: string;
  projectId: string;
  name: string;
  category: string;
  description: string;
  campaignPeriod: CampaignPeriod;
  createdAt: string;
}

// --- Guide (바이럴 가이드) ---

export interface VerificationRule {
  ruleId: string;
  name: string;
  weight: number;
  isAutoFail: boolean;
  config: Record<string, unknown>;
}

export interface Guide {
  id: string;
  projectId: string;
  productId: string;
  version: string;
  verificationRules: VerificationRule[];
  customGuidelines: string;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Viral (바이럴 게시물) ---

export interface VerificationDetail {
  ruleId: string;
  passed: boolean;
  score: number;
  note: string;
}

export interface VerificationHistoryEntry {
  attempt: number;
  result: 'ok' | 'warning' | 'fail';
  score: number;
  verifiedAt: string;
}

export interface ViralVerification {
  result: 'ok' | 'warning' | 'fail' | null;
  score: number | null;
  grade: 'green' | 'yellow' | 'red' | null;
  checkedAt: string | null;
  details: VerificationDetail[];
  issues: string[];
}

export interface ViralComments {
  totalCount: number;
  negativeCount: number;
  lastCheckedAt: string | null;
}

export interface Viral {
  id: string;
  projectId: string;
  productId: string;
  guideId: string;
  title: string;
  url: string;
  platform: string;
  cafeName: string;
  author: string;
  batchId: string | null;
  status: 'pending' | 'verified' | 'failed';
  verification: ViralVerification;
  verificationHistory: VerificationHistoryEntry[];
  comments: ViralComments;
  createdAt: string;
}

// --- Comment (댓글) ---

export interface CommentResponse {
  responder: string;
  content: string;
  respondedAt: string;
}

export interface Comment {
  id: string;
  viralId: string;
  author: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  isNegative: boolean;
  category: string;
  priority: 'immediate' | 'high' | 'monitor' | 'ignore';
  responseRequired: boolean;
  responses: CommentResponse[];
  detectedAt: string;
  originalDate: string;
}

// --- Filter & Pagination Types ---

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProjectFilters {
  status?: 'active' | 'archived';
  owner?: string;
  search?: string;
}

export interface ProductFilters {
  projectId?: string;
  category?: string;
  campaignStatus?: 'active' | 'upcoming' | 'ended';
}

export interface GuideFilters {
  projectId?: string;
  productId?: string;
  isTemplate?: boolean;
}

export interface ViralFilters {
  projectId?: string;
  productId?: string;
  guideId?: string;
  status?: 'pending' | 'verified' | 'failed';
  verificationResult?: 'ok' | 'warning' | 'fail';
  platform?: string;
  batchId?: string;
  search?: string;
}

export interface CommentFilters {
  viralId?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  priority?: 'immediate' | 'high' | 'monitor' | 'ignore';
  responseRequired?: boolean;
  category?: string;
}
