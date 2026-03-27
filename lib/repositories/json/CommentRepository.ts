import type { Comment, CommentFilters } from '../../../src/types/index.js';
import type { ICommentRepository } from '../interfaces/ICommentRepository.js';
import { JsonRepository } from './JsonRepository.js';

export class CommentRepository
  extends JsonRepository<Comment>
  implements ICommentRepository
{
  constructor() {
    super('comments.json', 'cmt');
  }

  async findAll(filters?: CommentFilters): Promise<Comment[]> {
    let items = await this.readAll();

    if (filters?.viralId) {
      items = items.filter((c) => c.viralId === filters.viralId);
    }
    if (filters?.sentiment) {
      items = items.filter((c) => c.sentiment === filters.sentiment);
    }
    if (filters?.priority) {
      items = items.filter((c) => c.priority === filters.priority);
    }
    if (filters?.responseRequired !== undefined) {
      items = items.filter(
        (c) => c.responseRequired === filters.responseRequired
      );
    }
    if (filters?.category) {
      items = items.filter((c) => c.category === filters.category);
    }

    return items;
  }

  async listByViral(viralId: string): Promise<Comment[]> {
    return this.findAll({ viralId });
  }

  async countNegative(viralId: string): Promise<number> {
    const items = await this.readAll();
    return items.filter((c) => c.viralId === viralId && c.isNegative).length;
  }

  async create(data: Omit<Comment, 'id' | 'detectedAt'>): Promise<Comment> {
    const comment: Comment = {
      ...data,
      id: await this.generateId(),
      detectedAt: new Date().toISOString(),
    };
    return this.insertOne(comment);
  }

  async update(
    id: string,
    data: Partial<Omit<Comment, 'id' | 'detectedAt'>>
  ): Promise<Comment> {
    const updated = await this.updateOne(id, data as Partial<Comment>);
    if (!updated) throw new Error(`Comment not found: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteById(id);
  }
}
