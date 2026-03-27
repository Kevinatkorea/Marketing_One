import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';

const projectStats: Record<string, { total: number; verified: number; pending: number }> = {
  '1': { total: 45, verified: 42, pending: 3 },
  '2': { total: 28, verified: 20, pending: 8 },
  '3': { total: 60, verified: 60, pending: 0 },
};

export default function ProjectList() {
  const { projects, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              P1
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PerformanceOne</h1>
              <p className="text-sm text-zinc-500">퍼포먼스 마케팅 통합 관리시스템</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            + 새 프로젝트
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold mb-6">프로젝트 목록</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const stats = projectStats[project.id] || { total: 0, verified: 0, pending: 0 };
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}/viral`}
                className="group bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-zinc-950/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                    {project.name}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      project.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-zinc-700/50 text-zinc-500'
                    }`}
                  >
                    {project.status === 'active' ? '진행중' : '종료'}
                  </span>
                </div>

                <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
                  {project.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    전체 {stats.total}건
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    검증 {stats.verified}건
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    대기 {stats.pending}건
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
                  <span>담당: {project.owner}</span>
                  <span>{new Date(project.updatedAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
