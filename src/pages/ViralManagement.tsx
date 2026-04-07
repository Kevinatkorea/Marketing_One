import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import { fetchViralDashboard, type ViralDashboardStats } from '../services/dashboard';
import { fetchVirals, verifyViral, deleteViral as deleteViralApi } from '../services/virals';
import type { Viral } from '../types';

const statusBadge = (status: string, result: string | null) => {
  if (status === 'pending') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 font-medium">
        대기중
      </span>
    );
  }
  if (result === 'ok') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
        적합
      </span>
    );
  }
  if (result === 'warning') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
        경고
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">
      부적합
    </span>
  );
};

type FilterStatus = 'all' | 'pending' | 'ok' | 'warning' | 'fail';

export default function ViralManagement() {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [stats, setStats] = useState<ViralDashboardStats | null>(null);
  const [virals, setVirals] = useState<Viral[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const navigate = useNavigate();
  const { id } = useParams();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchViralDashboard(id),
      fetchVirals(id, { pageSize: 100 }),
    ])
      .then(([dashData, viralData]) => {
        setStats(dashData);
        setVirals(viralData.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleVerifySingle = async (e: React.MouseEvent, viralId: string) => {
    e.stopPropagation();
    if (!id) return;
    setVerifying(viralId);
    try {
      const updated = await verifyViral(id, viralId);
      setVirals((prev) => prev.map((v) => (v.id === viralId ? updated : v)));
      fetchViralDashboard(id).then(setStats).catch(() => {});
      const label = updated.verification.result === 'ok' ? '적합' : updated.verification.result === 'warning' ? '경고' : '부적합';
      showToast(`검증 완료: ${label} (${updated.verification.score}점)`);
    } catch {
      showToast('검증 실패. 다시 시도해주세요.', 'error');
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, viralId: string, title: string) => {
    e.stopPropagation();
    if (!id) return;
    if (!confirm(`"${title}" 바이럴을 삭제하시겠습니까?`)) return;
    try {
      await deleteViralApi(id, viralId);
      setVirals((prev) => prev.filter((v) => v.id !== viralId));
      fetchViralDashboard(id).then(setStats).catch(() => {});
      showToast('삭제 완료');
    } catch {
      showToast('삭제 실패', 'error');
    }
  };

  const handleBulkVerify = async () => {
    if (!id) return;
    const targets = virals.filter((v) => v.status === 'pending');
    const targetList = targets.length > 0 ? targets : virals;
    setBulkVerifying(true);
    setBulkProgress({ done: 0, total: targetList.length });

    let successCount = 0;
    let errorCount = 0;
    for (const viral of targetList) {
      try {
        const updated = await verifyViral(id, viral.id);
        setVirals((prev) => prev.map((v) => (v.id === viral.id ? updated : v)));
        successCount++;
      } catch {
        errorCount++;
      }
      setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    fetchViralDashboard(id).then(setStats).catch(() => {});
    setBulkVerifying(false);
    setBulkProgress({ done: 0, total: 0 });
    showToast(`검증 완료: 성공 ${successCount}건${errorCount > 0 ? `, 실패 ${errorCount}건` : ''}`);
  };

  const pendingCount = virals.filter((v) => v.status === 'pending').length;

  const filteredVirals = virals.filter((v) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return v.status === 'pending';
    return v.verification.result === filter;
  });

  const pieData = stats
    ? [
        { name: '적합', value: stats.resultDistribution.ok, color: '#34d399' },
        { name: '경고', value: stats.resultDistribution.warning, color: '#fbbf24' },
        { name: '부적합', value: stats.resultDistribution.fail, color: '#f87171' },
      ].filter((d) => d.value > 0)
    : [];

  const barData = stats?.failReasons ?? [];

  const complianceRate =
    stats && stats.totalVirals > 0
      ? Math.round((stats.resultDistribution.ok / stats.totalVirals) * 100)
      : 0;

  const timeSince = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}분전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간전`;
    return `${Math.floor(hours / 24)}일전`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all animate-[slideIn_0.3s_ease-out] ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-4">
        <StatCard
          title="총 바이럴"
          value={`${stats?.totalVirals ?? 0}건`}
          subtitle="전체 등록 바이럴 수"
          color="blue"
          icon="📊"
        />
        <StatCard
          title="검증완료"
          value={`${(stats?.verifiedCount ?? 0) + (stats?.failedCount ?? 0)}건`}
          subtitle={`검증 진행률 ${stats && stats.totalVirals > 0 ? Math.round(((stats.verifiedCount + stats.failedCount) / stats.totalVirals) * 100) : 0}%`}
          trend="up"
          color="green"
          icon="✅"
        />
        <StatCard
          title="적합률"
          value={`${complianceRate}%`}
          subtitle="전체 대비 적합 비율"
          trend="up"
          color="blue"
          icon="📈"
        />
        <StatCard
          title="부정댓글"
          value={`${stats?.negativeCommentCount ?? 0}건`}
          subtitle="즉시 대응 필요"
          trend="down"
          color="red"
          icon="💬"
        />
        <StatCard
          title="마지막 검증일"
          value={stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
          subtitle={stats?.lastUpdated ? timeSince(stats.lastUpdated) : ''}
          color="zinc"
          icon="⏰"
        />
      </div>

      {/* Charts — 도넛 절반 축소, 바 라벨 영역 3배 확대 */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {/* Donut Chart — 1/6칸 (기존 1/3 대비 절반) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">검증결과 분포</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    color: '#e4e4e7',
                    fontSize: '13px',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-zinc-400">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-zinc-600 text-sm">
              검증 데이터가 없습니다
            </div>
          )}
        </div>

        {/* Bar Chart — 5/6칸 (도넛이 1/6로 줄어든 공간 흡수) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-5 lg:col-span-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">부적합 원인 분석</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} />
                <YAxis
                  dataKey="reason"
                  type="category"
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={360}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    color: '#e4e4e7',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-zinc-600 text-sm">
              부적합 데이터가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* Viral List Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        {/* Table Header / Filters */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-zinc-200">바이럴 목록</h3>
            <button
              onClick={handleBulkVerify}
              disabled={bulkVerifying}
              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              {bulkVerifying ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {`검증 중 ${bulkProgress.done}/${bulkProgress.total}`}
                </>
              ) : pendingCount > 0 ? (
                `대기 ${pendingCount}건 검증`
              ) : (
                '전체 재검증'
              )}
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {(
              [
                { key: 'all', label: '전체' },
                { key: 'ok', label: '적합' },
                { key: 'warning', label: '경고' },
                { key: 'fail', label: '부적합' },
                { key: 'pending', label: '대기' },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg font-medium transition-colors min-h-[36px] ${
                  filter === f.key
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-3 sm:px-5 text-zinc-500 font-medium">제목</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium hidden sm:table-cell">플랫폼</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium hidden md:table-cell">작성자</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium">상태</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium">댓글</th>
                <th className="text-left py-3 px-2 sm:px-4 text-zinc-500 font-medium hidden sm:table-cell">마지막 검증</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filteredVirals.map((viral) => (
                <tr
                  key={viral.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${id}/viral/${viral.id}`)}
                >
                  <td className="py-3 px-3 sm:px-5 text-zinc-200 font-medium max-w-[140px] sm:max-w-xs truncate">
                    {viral.title}
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-zinc-400 hidden sm:table-cell">{viral.platform}</td>
                  <td className="py-3 px-2 sm:px-4 text-zinc-400 hidden md:table-cell">
                    {viral.author || <span className="text-zinc-600">-</span>}
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    {statusBadge(viral.status, viral.verification.result)}
                  </td>
                  <td className="py-3 px-2 sm:px-4">
                    <span className="text-zinc-400">
                      {viral.comments.totalCount > 0 ? (
                        <>
                          {viral.comments.totalCount}건
                          {viral.comments.negativeCount > 0 && (
                            <span className="text-red-400 ml-1">({viral.comments.negativeCount})</span>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-zinc-500 hidden sm:table-cell text-xs">
                    {viral.verification?.checkedAt
                      ? new Date(viral.verification.checkedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : <span className="text-zinc-600">-</span>}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleVerifySingle(e, viral.id)}
                        disabled={verifying === viral.id}
                        className="text-[10px] sm:text-xs px-2 py-1 bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white disabled:opacity-50 font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1"
                      >
                        {verifying === viral.id ? (
                          <>
                            <span className="inline-block w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                            검증중
                          </>
                        ) : viral.status === 'pending' ? (
                          '검증'
                        ) : (
                          '재검증'
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, viral.id, viral.title)}
                        className="text-[10px] sm:text-xs px-1.5 py-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVirals.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-600">
                    해당 필터에 맞는 바이럴이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
