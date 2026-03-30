import type { Project, ProjectFilters } from '../../../src/types/index.js';
import type { IProjectRepository } from '../interfaces/IProjectRepository.js';
import { JsonRepository } from './JsonRepository.js';

export class ProjectRepository
  extends JsonRepository<Project>
  implements IProjectRepository
{
  constructor() {
    super('projects.json', 'proj');
  }

  async findAll(filters?: ProjectFilters): Promise<Project[]> {
    let items = await this.readAll();

    if (filters?.status) {
      items = items.filter((p) => p.status === filters.status);
    }
    if (filters?.owner) {
      items = items.filter((p) => p.owner === filters.owner);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return items;
  }

  async create(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Project> {
    const now = new Date().toISOString();
    return this.insertOneAutoId((id) => ({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    } as Project));
  }

  async update(
    id: string,
    data: Partial<Omit<Project, 'id' | 'createdAt'>>
  ): Promise<Project> {
    const updated = await this.updateOne(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    } as Partial<Project>);
    if (!updated) throw new Error(`Project not found: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteById(id);
  }
}
