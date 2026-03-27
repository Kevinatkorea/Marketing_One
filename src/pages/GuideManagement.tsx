const mockGuides = [
  {
    id: 'g1',
    name: '봄 신상품 리뷰 가이드 v2.1',
    product: '봄 신상품',
    version: '2.1',
    rulesCount: 8,
    status: 'active' as const,
    updatedAt: '2026-03-25',
  },
  {
    id: 'g2',
    name: '프로모션 컨텐츠 가이드 v1.0',
    product: '여름 프로모션',
    version: '1.0',
    rulesCount: 5,
    status: 'draft' as const,
    updatedAt: '2026-03-20',
  },
  {
    id: 'g3',
    name: '영상 리뷰 가이드 v1.3',
    product: '봄 신상품',
    version: '1.3',
    rulesCount: 6,
    status: 'active' as const,
    updatedAt: '2026-03-18',
  },
];

export default function GuideManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">가이드 관리</h1>
          <p className="text-sm text-zinc-500 mt-1">바이럴 검증 가이드를 관리합니다</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
          + 가이드 등록
        </button>
      </div>

      {/* Guide List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-5 text-zinc-500 font-medium">가이드명</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">상품</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">버전</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">검증 규칙</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">상태</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">수정일</th>
              </tr>
            </thead>
            <tbody>
              {mockGuides.map((guide) => (
                <tr
                  key={guide.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-3 px-5 text-zinc-200 font-medium">{guide.name}</td>
                  <td className="py-3 px-4 text-zinc-400">{guide.product}</td>
                  <td className="py-3 px-4 text-zinc-400">v{guide.version}</td>
                  <td className="py-3 px-4 text-zinc-400">{guide.rulesCount}개</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        guide.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-zinc-700/50 text-zinc-400'
                      }`}
                    >
                      {guide.status === 'active' ? '활성' : '초안'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">{guide.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
