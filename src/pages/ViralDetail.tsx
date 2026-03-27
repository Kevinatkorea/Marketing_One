import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchViral, verifyViral, fetchViralComments } from '../services/virals';
import type { Viral, Comment } from '../types';

const gradeStyle: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-400',
  yellow: 'bg-amber-500/15 text-amber-400',
  red: 'bg-red-500/15 text-red-400',
};

const gradeLabel: Record<string, string> = {
  green: '적합',
  yellow: '경고',
  red: '부적합',
};

export default function ViralDetail() {
  const { id, vid } = useParams();
  const [viral, setViral] = useState<Viral | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!id || !vid) return;
    setLoading(true);
    Promise.all([
      fetchViral(id, vid),
      fetchViralComments(id, vid).catch(() => []),
    ])
      .then(([v, c]) => {
        setViral(v);
        setComments(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, vid]);

  const handleVerify = async () => {
    if (!id || !vid) return;
    setVerifying(true);
    try {
      const updated = await verifyViral(id, vid);
      setViral(updated);
    } catch {
      // verification endpoint may not be fully implemented yet
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        바이럴 정보를 불러오는 중...
      </div>
    );
  }

  if (!viral) {
    return (
      <div className="text-center py-24 text-zinc-500">
        바이럴을 찾을 수 없습니다.
      </div>
    );
  }

  const grade = viral.verification.grade;
  const score = viral.verification.score;

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
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-zinc-100">{viral.title}</h1>
            <p className="text-sm text-zinc-500 mt-1">ID: {viral.id}</p>
          </div>
          {grade ? (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${gradeStyle[grade] ?? 'bg-zinc-700/50 text-zinc-400'}`}>
              {gradeLabel[grade] ?? '미검증'}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-zinc-700/50 text-zinc-400">
              미검증
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
          <div>
            <span className="text-zinc-500">플랫폼</span>
            <p className="text-zinc-200 mt-0.5">{viral.platform}</p>
          </div>
          <div>
            <span className="text-zinc-500">카페명</span>
            <p className="text-zinc-200 mt-0.5">{viral.cafeName || '-'}</p>
          </div>
          <div>
            <span className="text-zinc-500">작성자</span>
            <p className="text-zinc-200 mt-0.5">{viral.author}</p>
          </div>
          <div>
            <span className="text-zinc-500">등록일</span>
            <p className="text-zinc-200 mt-0.5">
              {new Date(viral.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <a
            href={viral.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {viral.url} ↗
          </a>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors min-h-[44px] self-start sm:self-auto"
          >
            {verifying ? '검증 중...' : '재검증'}
          </button>
        </div>
      </div>

      {/* Verification Result */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-200">검증 결과</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500">
              점수: <span className="text-blue-400 font-semibold">{score ?? '-'}점</span>
            </span>
            {viral.verification.checkedAt && (
              <>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-500">
                  검증일: {new Date(viral.verification.checkedAt).toLocaleString('ko-KR')}
                </span>
              </>
            )}
          </div>
        </div>

        {viral.verification.details.length > 0 ? (
          <div className="space-y-2">
            {viral.verification.details.map((detail, index) => (
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
                  <span className="text-sm text-zinc-300">{detail.ruleId}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500">{detail.note}</span>
                  <span className="text-xs font-medium text-zinc-400">{detail.score}점</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-600 text-sm">
            아직 검증이 실행되지 않았습니다.
          </div>
        )}

        {viral.verification.issues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-red-400 mb-2">문제 사항</h3>
            <ul className="space-y-1">
              {viral.verification.issues.map((issue, i) => (
                <li key={i} className="text-sm text-zinc-400 flex items-center gap-2">
                  <span className="text-red-400">•</span> {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Verification History */}
      {viral.verificationHistory.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-200 mb-4">검증 이력</h2>
          <div className="space-y-2">
            {viral.verificationHistory.map((entry, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-4 rounded-lg bg-zinc-800/50">
                <span className="text-sm text-zinc-300">#{entry.attempt}차 검증</span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gradeStyle[entry.result === 'ok' ? 'green' : entry.result === 'warning' ? 'yellow' : 'red']}`}>
                    {entry.result === 'ok' ? '적합' : entry.result === 'warning' ? '경고' : '부적합'} {entry.score}점
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(entry.verifiedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
        <h2 className="text-base font-semibold text-zinc-200 mb-4">
          댓글 ({comments.length})
          {viral.comments.negativeCount > 0 && (
            <span className="ml-2 text-xs text-red-400 font-normal">
              부정 {viral.comments.negativeCount}건
            </span>
          )}
        </h2>

        {comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg border ${
                  comment.isNegative
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
                    {comment.priority === 'immediate' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-500/15 text-red-400">
                        즉시대응
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600">
                    {new Date(comment.originalDate).toLocaleString('ko-KR')}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-600 text-sm">
            수집된 댓글이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
