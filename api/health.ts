export function GET() {
  return Response.json({
    status: 'ok',
    service: 'PerformanceOne',
    timestamp: new Date().toISOString(),
  })
}
