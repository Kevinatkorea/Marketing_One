// ============================================================
// PerformanceOne - Zod Validation Schemas
// ============================================================

import { z } from 'zod';

// --- Project ---

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  owner: z.string().max(100).optional().default(''),
  status: z.enum(['active', 'archived']).optional().default('active'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  owner: z.string().max(100).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

// --- Product ---

const campaignPeriodSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.enum(['active', 'upcoming', 'ended']).optional().default('active'),
});

export const createProductSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Product name is required').max(200),
  category: z.string().max(100).optional().default(''),
  description: z.string().max(2000).optional().default(''),
  campaignPeriod: campaignPeriodSchema.optional().default({
    startDate: '',
    endDate: '',
    status: 'upcoming',
  }),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  campaignPeriod: campaignPeriodSchema.optional(),
});

// --- Guide ---

const verificationRuleSchema = z.object({
  ruleId: z.string().min(1),
  name: z.string().min(1),
  weight: z.number().min(0).max(100),
  isAutoFail: z.boolean().optional().default(false),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

export const createGuideSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  version: z.string().max(50).optional().default('1.0'),
  verificationRules: z.array(verificationRuleSchema).optional().default([]),
  customGuidelines: z.string().max(5000).optional().default(''),
  isTemplate: z.boolean().optional().default(false),
});

export const updateGuideSchema = z.object({
  productId: z.string().min(1).optional(),
  version: z.string().max(50).optional(),
  verificationRules: z.array(verificationRuleSchema).optional(),
  customGuidelines: z.string().max(5000).optional(),
  isTemplate: z.boolean().optional(),
});

// --- Viral ---

export const createViralSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  guideId: z.string().min(1, 'Guide ID is required'),
  title: z.string().min(1, 'Title is required').max(500),
  url: z.string().url('Valid URL is required'),
  platform: z.string().max(100).optional().default(''),
  cafeName: z.string().max(200).optional().default(''),
  author: z.string().max(200).optional().default(''),
});

export const updateViralSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  url: z.string().url().optional(),
  platform: z.string().max(100).optional(),
  cafeName: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
  status: z.enum(['pending', 'verified', 'failed']).optional(),
});

// --- Bulk Text ---

export const bulkTextSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  guideId: z.string().min(1, 'Guide ID is required'),
  text: z.string().min(1, 'Text content is required'),
});

// --- Comment ---

export const createCommentSchema = z.object({
  viralId: z.string().min(1, 'Viral ID is required'),
  author: z.string().min(1, 'Author is required').max(200),
  content: z.string().min(1, 'Content is required').max(5000),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional().default('neutral'),
  sentimentScore: z.number().min(-1).max(1).optional().default(0),
  isNegative: z.boolean().optional().default(false),
  category: z.string().max(100).optional().default(''),
  priority: z.enum(['immediate', 'high', 'monitor', 'ignore']).optional().default('monitor'),
  responseRequired: z.boolean().optional().default(false),
  responses: z.array(z.object({
    responder: z.string(),
    content: z.string(),
    respondedAt: z.string(),
  })).optional().default([]),
  originalDate: z.string().optional().default(''),
});
