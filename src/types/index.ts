// ============================================================
// PerformanceOne - Shared TypeScript Types
// ============================================================

// --- Project ---

export interface Competitor {
  name: string;
  keywords: string[];
}

export interface ProjectInfo {
  categoryL1: string;          // 예: "자동차"
  categoryL2: string;          // 예: "전기차"
  ownDescription: string;      // 자사 제품/서비스 설명
  coreKeywords: string[];      // 프로젝트 핵심 키워드
  competitors: Competitor[];   // 경쟁사 + 경쟁사별 키워드
  additionalNotes?: string;    // 향후 추가된 사항 (free text)
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
  owner: string;
  projectInfo?: ProjectInfo;
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
  pdfContent?: string;
  pdfFileName?: string;
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

// --- Ad Report (운영보고서) ---

/** 변환된 광고 보고서 1행 (RAW 형식) */
export interface AdReportEntry {
  id: string;
  projectId: string;
  uploadBatchId: string;
  month: string;           // "25년 3월"
  weekNumber: number;      // 1-5
  category: string;        // "META"
  adChannel: string;       // "META-서초본점"
  target: string;          // "잠재-서초본점"
  creativeName: string;    // "체험권(VIP)"
  branch: string;          // "서초본점"
  date: string;            // ISO date
  campaignGroup: string;   // "META_전환_서초본점"
  adGroupCreative: string; // 원본 광고그룹/소재명
  impressions: number;
  clicks: number;
  cost: number;            // 매체비용
  costExVat: number;
  costInVat: number;
  registrations: number;      // 신청완료 합산 (등록 + 잠재고객, 기존 호환)
  formRegistrations: number;  // 등록 (= 홈페이지 전환)
  leadRegistrations: number;  // 잠재 고객 (= Meta 리드)
  rawCampaignName: string;
  rawAdSetName: string;
  rawAdName: string;
  createdAt: string;
}

/** CSV 업로드 이력 */
export interface AdReportUpload {
  id: string;
  projectId: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  processedCount: number;
  errorCount: number;
  errors: Array<{ row: number; field: string; message: string }>;
  dateRange: { start: string; end: string };
  status: 'processing' | 'completed' | 'failed';
}

/** 매핑 설정 (프로젝트별 독립) */
export interface AdMappingBranch {
  suffix: string;    // "서초"
  fullName: string;  // "서초본점"
}

export interface AdMappingTargetKeyword {
  keyword: string;   // "잠재고객"
  label: string;     // "잠재"
}

export interface AdMappingCreativePattern {
  pattern: string;   // "체험권.*VIP"
  label: string;     // "체험권(VIP)"
}

export interface AdMappingConfig {
  id: string;
  projectId: string;
  branches: AdMappingBranch[];
  targetKeywords: AdMappingTargetKeyword[];
  creativePatterns: AdMappingCreativePattern[];
  categoryDefault: string;
  // 일일보고 설정
  mediaSources: string[];                         // ["fb&insta","당근","구글","토스","오가닉"]
  dailyReportBranchOrder: string[];               // ["잠실점","서초본점",...]
  branchMediaSources: Record<string, string[]>;   // 지점별 매체 목록
  mediaDisplayNames: Record<string, string>;      // {"당근":"당근APP"}
  updatedAt: string;
}

// --- Daily Manual Input (수동 입력) ---

export interface DailyManualSourceData {
  leads: number;      // 잠재고객
  homepage: number;   // 홈페이지 전환
  adSpend: number;    // 광고비
}

export interface DailyManualInput {
  id: string;
  projectId: string;
  date: string;       // "2026-04-01"
  branch: string;     // "서초본점"
  sources: Record<string, DailyManualSourceData>;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

/** 집계 결과 */
export interface ReportMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  registrations: number;
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  cvr: number | null;
}

export interface MonthSummary extends ReportMetrics {
  month: string;
  period: string;
}

export interface BranchSummary extends ReportMetrics {
  branch: string;
}

export interface WeekSummary extends ReportMetrics {
  weekNumber: number;
}

export interface AdReportFilters {
  projectId?: string;
  month?: string;
  branch?: string;
  category?: string;
  target?: string;
  dateRange?: { start: string; end: string };
  uploadBatchId?: string;
}
