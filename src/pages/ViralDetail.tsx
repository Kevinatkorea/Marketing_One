import { useParams, Link } from 'react-router-dom';

const ruleLabels: Record<string, string> = {
  r1: '필수 키워드 포함',
  r2: '이미지 포함 여부',
  r3: '최소 글자수',
  r4: '링크 정상 작동',
  r5: '가이드 문구 일치',
};

const mockViral = {
  id: 'v1',
  title: '봄 신상품 리뷰 - 자연스러운 일상 후기',
  url: 'https://cafe.naver.com/example/12345',
  platform: '네이버 카페',
  cafeName: '뷰티톡',
  author: 'blogger_01',
  status: 'verified' as const,
  createdAt: '2026-03-25 14:30',
  verification: {
    result: 'ok' as const,
    score: 92,
    checkedAt: '2026-03-25 14:35',
    details: [
      { ruleId: 'r1', passed: true, score: 100, note: '5개 중 5개 포함' },
      { ruleId: 'r2', passed: true, score: 100, note: '3장 확인' },
      { ruleId: 'r3', passed: true, score: 100, note: '1,200자 (최소 500자)' },
      { ruleId: 'r4', passed: true, score: 100, note: '200 OK' },
      { ruleId: 'r5', passed: false, score: 60, note: '일부 문구 변형 감지' },
    ],
  },
  comments: [
    {
      id: 'c1',
      author: '유저A',
      content: '좋은 리뷰 감사합니다!',
      sentiment: 'positive' as const,
      date: '2026-03-25 15:00',
    },
    {
      id: 'c2',
      author: '유저B',
      content: '이거 광고 아닌가요?',
      sentiment: 'negative' as const,
      date: '2026-03-25 16:20',
    },
    {
      id: 'c3',
      author: '유저C',
      content: '저도 써봤는데 괜찮았어요',
      sentiment: 'positive' as const,
      date: '2026-03-25 17:10',
    },
  ],
};

export default function ViralDetail() {
  const { id, vid } = useParams();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to={`/projects/${id}/viral`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 4l-4 4 4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        바이럴 목록으로
      </Link>

      {/* Viral Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-zinc-100">{mockViral.title}</h1>
            <p className="text-sm text-zinc-500 mt-1">ID: {vid}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
            적합
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-zinc-500">플랫폼</span>
            <p className="text-zinc-200 mt-0.5">{mockViral.platform}</p>
          </div>
          <div>
            <span className="text-zinc-500">카페명</span>
            <p className="text-zinc-200 mt-0.5">{mockViral.cafeName}</p>
          </div>
          <div>
            <span className="text-zinc-500">작성자</span>
            <p className="text-zinc-200 mt-0.5">{mockViral.author}</p>
          </div>
          <div>
            <span className="text-zinc-500">등록일</span>
            <p className="text-zinc-200 mt-0.5">{mockViral.createdAt}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <a
            href={mockViral.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {mockViral.url} ↗
          </a>
        </div>
      </div>

      {/* Verification Result */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-200">검증 결과</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500">
              점수: <span className="text-blue-400 font-semibold">{mockViral.verification.score}점</span>
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500">
              검증일: {mockViral.verification.checkedAt}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {mockViral.verification.details.map((detail, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    detail.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {detail.passed ? '✓' : '✗'}
                </span>
                <span className="text-sm text-zinc-300">{ruleLabels[detail.ruleId] || detail.ruleId}</span>
              </div>
              <span className="text-xs text-zinc-500">{detail.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-base font-semibold text-zinc-200 mb-4">
          댓글 ({mockViral.comments.length})
        </h2>

        <div className="space-y-3">
          {mockViral.comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 rounded-lg border ${
                comment.sentiment === 'negative'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-zinc-800/50 border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-300">
                    {comment.author}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      comment.sentiment === 'positive'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : comment.sentiment === 'negative'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-zinc-700/50 text-zinc-400'
                    }`}
                  >
                    {comment.sentiment === 'positive'
                      ? '긍정'
                      : comment.sentiment === 'negative'
                      ? '부정'
                      : '중립'}
                  </span>
                </div>
                <span className="text-xs text-zinc-600">{comment.date}</span>
              </div>
              <p className="text-sm text-zinc-400">{comment.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
