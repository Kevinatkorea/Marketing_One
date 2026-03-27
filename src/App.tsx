function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          PerformanceOne
        </h1>
        <p className="text-zinc-400 text-lg max-w-md mx-auto">
          퍼포먼스 마케팅 통합 관리시스템
        </p>
        <div className="flex gap-3 justify-center text-sm text-zinc-500">
          <span className="px-3 py-1 rounded-full border border-zinc-800">바이럴 관리</span>
          <span className="px-3 py-1 rounded-full border border-zinc-800">가이드 검증</span>
          <span className="px-3 py-1 rounded-full border border-zinc-800">댓글 모니터링</span>
        </div>
      </div>
    </div>
  )
}

export default App
