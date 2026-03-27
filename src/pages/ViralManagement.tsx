import { useState } from 'react';
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

// --- Mock data ---

const pieData = [
  { name: '적합', value: 32, color: '#34d399' },
  { name: '경고', value: 8, color: '#fbbf24' },
  { name: '부적합', value: 5, color: '#f87171' },
];

const barData = [
  { name: '키워드 누락', count: 8 },
  { name: '이미지 미포함', count: 5 },
  { name: '링크 오류', count: 3 },
  { name: '가이드 불일치', count: 2 },
  { name: '기타', count: 1 },
];

interface MockViral {
  id: string;
  title: string;
  platform: string;
  author: string;
  status: 'pending' | 'verified' | 'failed';
  result: 'ok' | 'warning' | 'fail' | null;
  negativeComments: number;
  createdAt: string;
}

const mockVirals: MockViral[] = [
  {
    id: 'v1',
    title: '봄 신상품 리뷰 - 자연스러운 일상 후기',
    platform: '네이버 카페',
    author: 'blogger_01',
    status: 'verified',
    result: 'ok',
    negativeComments: 0,
    createdAt: '2026-03-25',
  },
  {
    id: 'v2',
    title: '신상 화장품 솔직 리뷰',
    platform: '네이버 블로그',
    author: 'beauty_queen',
    status: 'verified',
    result: 'ok',
    negativeComments: 1,
    createdAt: '2026-03-24',
  },
  {
    id: 'v3',
    title: '봄맞이 쇼핑 하울 영상',
    platform: '유튜브',
    author: 'shopaholic_kr',
    status: 'verified',
    result: 'warning',
    negativeComments: 2,
    createdAt: '2026-03-24',
  },
  {
    id: 'v4',
    title: '데일리 뷰티 루틴에 추가한 신제품',
    platform: '인스타그램',
    author: 'daily_beauty',
    status: 'pending',
    result: null,
    negativeComments: 0,
    createdAt: '2026-03-23',
  },
  {
    id: 'v5',
    title: '신상품 첫인상 후기',
    platform: '네이버 카페',
    author: 'review_master',
    status: 'verified',
    result: 'fail',
    negativeComments: 3,
    createdAt: '2026-03-22',
  },
  {
    id: 'v6',
    title: '봄 컬렉션 비교 리뷰',
    platform: '네이버 블로그',
    author: 'compare_kr',
    status: 'verified',
    result: 'ok',
    negativeComments: 0,
    createdAt: '2026-03-22',
  },
];

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
  const navigate = useNavigate();
  const { id } = useParams();

  const filteredVirals = mockVirals.filter((v) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return v.status === 'pending';
    return v.result === filter;
  });

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="총 바이럴"
          value="45건"
          subtitle="전체 등록 바이럴 수"
          color="blue"
          icon="📊"
        />
        <StatCard
          title="검증완료"
          value="42건"
          subtitle="검증 진행률 93%"
          trend="up"
          color="green"
          icon="✅"
        />
        <StatCard
          title="적합률"
          value="85%"
          subtitle="전체 대비 적합 비율"
          trend="up"
          color="blue"
          icon="📈"
        />
        <StatCard
          title="부정댓글"
          value="3건"
          subtitle="즉시 대응 필요"
          trend="down"
          color="red"
          icon="💬"
        />
        <StatCard
          title="마지막 업데이트"
          value="5분전"
          subtitle="2026-03-27 14:25"
          color="zinc"
          icon="⏰"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">검증결과 분포</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
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
        </div>

        {/* Bar Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">부적합 원인 분석</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={90}
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
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Viral List Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        {/* Table Header / Filters */}
        <div className="px-5 py-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-200">바이럴 목록</h3>
          <div className="flex items-center gap-2">
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
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-5 text-zinc-500 font-medium">제목</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">플랫폼</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">작성자</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">상태</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">부정댓글</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">등록일</th>
              </tr>
            </thead>
            <tbody>
              {filteredVirals.map((viral) => (
                <tr
                  key={viral.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${id}/viral/${viral.id}`)}
                >
                  <td className="py-3 px-5 text-zinc-200 font-medium max-w-xs truncate">
                    {viral.title}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{viral.platform}</td>
                  <td className="py-3 px-4 text-zinc-400">{viral.author}</td>
                  <td className="py-3 px-4">
                    {statusBadge(viral.status, viral.result)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        viral.negativeComments > 0 ? 'text-red-400' : 'text-zinc-600'
                      }
                    >
                      {viral.negativeComments}건
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">{viral.createdAt}</td>
                </tr>
              ))}
              {filteredVirals.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-600">
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
