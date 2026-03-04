'use client'
import type { TestSuite, SavedTestCase } from '@/types'

interface Props {
  suites: TestSuite[]
  testCases: SavedTestCase[]
}

export default function PlaywrightReportPanel({ suites, testCases }: Props) {
  const getCasesForSuite = (suite: TestSuite): SavedTestCase[] =>
    suite.testCaseIds
      .map((id) => testCases.find((tc) => tc.id === id))
      .filter(Boolean) as SavedTestCase[]

  if (suites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-forge-muted">
        <div className="w-20 h-20 rounded-2xl bg-forge-surface border border-forge-border flex items-center justify-center text-3xl">
          📊
        </div>
        <div className="text-center">
          <p className="text-forge-text font-bold text-base mb-1">No test suites yet</p>
          <p className="text-sm max-w-sm leading-relaxed">
            Create a test suite first, then you&apos;ll see its Playwright results summary here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-forge-surface border-b border-forge-border shrink-0">
        <span className="text-[10px] font-mono text-forge-muted mr-auto">
          Playwright Report · {suites.length} test {suites.length === 1 ? 'suite' : 'suites'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {suites.map((suite) => {
          const cases = getCasesForSuite(suite)
          const total = cases.length
          const passed = cases.filter((c) => c.status === 'pass').length
          const failed = cases.filter((c) => c.status === 'fail').length
          const errored = cases.filter((c) => c.status === 'error').length
          const idle = cases.filter((c) => c.status === 'idle').length

          return (
            <div
              key={suite.id}
              className="bg-forge-surface border border-forge-border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-forge-text">{suite.name}</p>
                  {suite.description && (
                    <p className="text-[10px] text-forge-dim mt-0.5">
                      {suite.description}
                    </p>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full border border-forge-border bg-forge-surface2 text-[10px] font-mono text-forge-muted">
                  {total} cases
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
                <Metric label="Passed" value={passed} type="pass" />
                <Metric label="Failed" value={failed} type="fail" />
                <Metric label="Error" value={errored} type="error" />
                <Metric label="Idle" value={idle} type="idle" />
              </div>

              {cases.length > 0 && (
                <div className="mt-1 border-t border-forge-border/60 pt-2">
                  <p className="text-[10px] font-bold text-forge-muted uppercase mb-1">
                    Test Cases
                  </p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {cases.map((tc) => (
                      <div
                        key={tc.id}
                        className="flex items-center gap-2 px-2 py-1 rounded bg-forge-surface2 border border-forge-border"
                      >
                        <StatusPill status={tc.status} />
                        <span className="text-[10px] font-mono text-forge-text truncate">
                          {tc.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ label, value, type }: { label: string; value: number; type: 'pass' | 'fail' | 'error' | 'idle' }) {
  const map: Record<string, string> = {
    pass: 'text-forge-green',
    fail: 'text-forge-red',
    error: 'text-forge-red',
    idle: 'text-forge-muted',
  }

  return (
    <div className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5">
      <p className={`text-base font-black font-mono ${map[type]}`}>{value}</p>
      <p className="text-[10px] text-forge-muted font-bold uppercase tracking-wide">{label}</p>
    </div>
  )
}

function StatusPill({ status }: { status: SavedTestCase['status'] }) {
  const map: Record<SavedTestCase['status'], string> = {
    pass:  'bg-forge-green/10 text-forge-green border-forge-green/40',
    fail:  'bg-forge-red/10 text-forge-red border-forge-red/40',
    error: 'bg-forge-red/10 text-forge-red border-forge-red/40',
    idle:  'bg-forge-surface border-forge-border text-forge-muted',
  }

  const label = status.toUpperCase()

  return (
    <span className={`px-1.5 py-px rounded-full border text-[9px] font-bold font-mono ${map[status]}`}>
      {label}
    </span>
  )
}

