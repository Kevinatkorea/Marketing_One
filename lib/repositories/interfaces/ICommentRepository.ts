import type { Comment, CommentFilters } from '../../../src/types/index.js';

export interface ICommentRepository {
  findById(id: string): Promise<Comment | null>;
  findAll(filters?: CommentFilters): Promise<Comment[]>;
  listByViral(viralId: string): Promise<Comment[]>;
  countNegative(viralId: string): Promise<number>;
  create(data: Omit<Comment, 'id' | 'detectedAt'>): Promise<Comment>;
  update(id: string, data: Partial<Omit<Comment, 'id' | 'detectedAt'>>): Promise<Comment>;
  delete(id: string): Promise<boolean>;
}
