import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { fetchViralDashboard, type ViralDashboardStats } from '../services/dashboard';
import { createProject } from '../services/projects';

export default function ProjectList() {
  const { projects, loading, fetchProjects } = useProjectStore();
  const [statsMap, setStatsMap] = useState<Record<string, ViralDashboardStats>>({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', owner: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (projects.length === 0) return;
    projects.forEach((p) => {
      fetchViralDashboard(p.id)
        .then((stats) => setStatsMap((prev) => ({ ...prev, [p.id]: stats })))
        .catch(() => {});
    });
  }, [projects]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await createProject({
        name: form.name,
        description: form.description,
        owner: form.owner || '담당자',
        status: 'active',
      });
      setShowModal(false);
      setForm({ name: '', description: '', owner: '' });
      fetchProjects();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-500">프로젝트를 불러오는 중...</div>
      </div>
    );
  }

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
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + 새 프로젝트
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold mb-6">프로젝트 목록</h2>

        {projects.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            등록된 프로젝트가 없습니다. 새 프로젝트를 만들어 보세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const stats = statsMap[project.id];
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
                  <p className="text-sm text-zinc-500 mb-4 line-clamp-2">{project.description}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      전체 {stats?.totalVirals ?? '-'}건
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      검증 {stats?.verifiedCount ?? '-'}건
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      대기 {stats?.pendingCount ?? '-'}건
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
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-zinc-100 mb-4">새 프로젝트 만들기</h2>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-zinc-400">프로젝트명 *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="2026 봄 신상품 런칭"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-400">설명</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="프로젝트에 대한 간단한 설명"
                  rows={3}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-400">담당자</span>
                <input
                  type="text"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  placeholder="마케팅팀"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !form.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? '생성 중...' : '프로젝트 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
