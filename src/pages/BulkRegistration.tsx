import { useState } from 'react';
import { useLocation } from 'react-router-dom';

type TabKey = 'paste' | 'excel';

export default function BulkRegistration() {
  const location = useLocation();
  const isBulk = location.pathname.endsWith('/bulk');

  const [activeTab, setActiveTab] = useState<TabKey>('paste');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">
          {isBulk ? '바이럴 일괄 등록' : '바이럴 등록'}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isBulk
            ? '여러 바이럴 URL을 한 번에 등록합니다'
            : '바이럴 URL을 등록합니다'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('paste')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'paste'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          텍스트 붙여넣기
        </button>
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'excel'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          엑셀 업로드
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        {activeTab === 'paste' ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">
                URL 목록 (줄바꿈으로 구분)
              </span>
              <textarea
                className="mt-2 w-full h-48 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder={
                  'https://cafe.naver.com/example/12345\nhttps://blog.naver.com/example/67890\nhttps://cafe.naver.com/example/11111'
                }
              />
            </label>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
                등록하기
              </button>
              <span className="text-xs text-zinc-500">
                등록 후 자동으로 검증이 시작됩니다
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center hover:border-zinc-600 transition-colors cursor-pointer">
              <div className="text-3xl mb-3">📁</div>
              <p className="text-sm text-zinc-400">
                엑셀 파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                .xlsx, .xls, .csv 형식 지원
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-600 transition-colors">
                템플릿 다운로드
              </button>
              <span className="text-xs text-zinc-500">
                템플릿에 맞춰 데이터를 입력해주세요
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
