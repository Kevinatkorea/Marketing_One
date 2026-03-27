// ============================================================
// PerformanceOne - Repository Exports & Singleton Instances
// ============================================================

import { ProjectRepository } from './json/ProjectRepository.js';
import { ProductRepository } from './json/ProductRepository.js';
import { GuideRepository } from './json/GuideRepository.js';
import { ViralRepository } from './json/ViralRepository.js';
import { CommentRepository } from './json/CommentRepository.js';

// Re-export interfaces
export type { IProjectRepository } from './interfaces/IProjectRepository.js';
export type { IProductRepository } from './interfaces/IProductRepository.js';
export type { IGuideRepository } from './interfaces/IGuideRepository.js';
export type { IViralRepository } from './interfaces/IViralRepository.js';
export type { ICommentRepository } from './interfaces/ICommentRepository.js';

// Re-export JSON implementations
export { ProjectRepository, ProductRepository, GuideRepository, ViralRepository, CommentRepository };

// Singleton instances -- reused across serverless invocations within the same
// runtime container (Vercel keeps the module scope alive between warm starts).

export const projectRepo = new ProjectRepository();
export const productRepo = new ProductRepository();
export const guideRepo = new GuideRepository();
export const viralRepo = new ViralRepository();
export const commentRepo = new CommentRepository();
