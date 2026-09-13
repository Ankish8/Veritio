import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BACKEND_TIMEOUT_MS = 5_000

export async function GET() {
  const backendOrigin = (
    process.env.MOTIA_BACKEND_URL || 'http://localhost:4000'
  ).replace(/\/$/, '')
  const startedAt = performance.now()

  try {
    const response = await fetch(`${backendOrigin}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    })
    const ready = response.ok

    return NextResponse.json(
      {
        status: ready ? 'ready' : 'not_ready',
        service: 'frontend',
        dependencies: {
          backend: {
            status: ready ? 'up' : 'down',
            http_status: response.status,
            latency_ms: Math.round(performance.now() - startedAt),
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: ready ? 200 : 503 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'not_ready',
        service: 'frontend',
        dependencies: {
          backend: {
            status: 'down',
            latency_ms: Math.round(performance.now() - startedAt),
            error:
              error instanceof Error
                ? error.message
                : 'Backend readiness check failed',
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
