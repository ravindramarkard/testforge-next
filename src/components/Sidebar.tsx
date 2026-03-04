'use client'
import { useState } from 'react'
import type { BrowserType, HistoryItem, RunMode, TestType } from '@/types'
import clsx from 'clsx'

const TEST_TYPES: { type: TestType; icon: string; label: string }[] = [
  { type: 'ui',          icon: '🖥️', label: 'UI'   },
  { type: 'api',         icon: '🔌', label: 'API'  },
  { type: 'e2e',         icon: '🔄', label: 'E2E'  },
  { type: 'performance', icon: '⚡', label: 'Perf' },
]

const BROWSERS: { value: BrowserType; label: string }[] = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'firefox',  label: 'Firefox'  },
  { value: 'webkit',   label: 'WebKit'   },
]

const SLOW_MO_OPTIONS = [0, 200, 500, 1000, 2000]

interface Props {
  testType:    TestType
  browser:     BrowserType
  mode:        RunMode
  url:         string
  slowMo:      number
  timeout:     number
  retries:     number
  history:     HistoryItem[]
  onTypeChange:    (t: TestType) => void
  onBrowserChange: (b: BrowserType) => void
  onModeChange:    (m: RunMode) => void
  onUrlChange:     (u: string) => void
  onSlowMoChange:  (s: number) => void
  onTimeoutChange: (t: number) => void
  onRetriesChange: (r: number) => void
  onHistoryClick?: (item: HistoryItem) => void
}

export default function Sidebar({
  testType, browser, mode, url, slowMo, timeout, retries, history,
  onTypeChange, onBrowserChange, onModeChange, onUrlChange,
  onSlowMoChange, onTimeoutChange, onRetriesChange, onHistoryClick,
}: Props) {
  const [showConfig, setShowConfig] = useState(false)

  return (
    <aside className="flex flex-col bg-forge-surface border-r border-forge-border overflow-hidden">
      {/* URL */}
      <div className="p-3 border-b border-forge-border">
        <label className="block text-[10px] font-bold tracking-widest text-forge-muted uppercase font-mono mb-1.5">
          Target URL
        </label>
        <input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://..."
          className="w-full bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
            text-forge-accent font-mono text-[11px] outline-none focus:border-forge-accent transition-colors"
        />
      </div>

      {/* Test type */}
      <div className="p-3 border-b border-forge-border">
        <div className="text-[10px] font-bold tracking-widest text-forge-muted uppercase font-mono mb-2">
          Test Type
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {TEST_TYPES.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={clsx(
                'flex flex-col items-center justify-center py-2.5 rounded-lg border text-center transition-all duration-150',
                testType === type
                  ? 'border-forge-accent bg-forge-accent/[.07] text-forge-accent'
                  : 'border-forge-border bg-forge-surface2 text-forge-muted hover:border-forge-dim'
              )}
            >
              <span className="text-lg mb-0.5">{icon}</span>
              <span className="text-[10px] font-bold tracking-wide uppercase font-mono">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Browser & Mode */}
      <div className="p-3 border-b border-forge-border">
        <div className="text-[10px] font-bold tracking-widest text-forge-muted uppercase font-mono mb-2">
          Browser &amp; Mode
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select
            value={browser}
            onChange={(e) => onBrowserChange(e.target.value as BrowserType)}
            className="bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
              text-forge-text font-mono text-[11px] outline-none cursor-pointer appearance-none focus:border-forge-accent"
          >
            {BROWSERS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as RunMode)}
            className="bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
              text-forge-text font-mono text-[11px] outline-none cursor-pointer appearance-none focus:border-forge-accent"
          >
            <option value="headed">Headed 👁️</option>
            <option value="headless">Headless</option>
          </select>
        </div>

        {/* slow_mo */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-forge-muted font-mono whitespace-nowrap">slow_mo:</span>
          <div className="flex gap-1 flex-1">
            {SLOW_MO_OPTIONS.map((ms) => (
              <button
                key={ms}
                onClick={() => onSlowMoChange(ms)}
                className={clsx(
                  'flex-1 py-1 rounded text-[9px] font-mono font-bold transition-all',
                  slowMo === ms
                    ? 'bg-forge-accent text-forge-bg'
                    : 'bg-forge-surface2 text-forge-muted border border-forge-border hover:border-forge-dim'
                )}
              >
                {ms === 0 ? 'off' : ms >= 1000 ? `${ms / 1000}s` : `${ms}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced config toggle */}
      <div className="p-3 border-b border-forge-border">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between text-[10px] font-bold tracking-widest
            text-forge-muted uppercase font-mono hover:text-forge-text transition-colors"
        >
          <span>Advanced Config</span>
          <span>{showConfig ? '▲' : '▼'}</span>
        </button>
        {showConfig && (
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-mono text-forge-muted w-16 shrink-0">Timeout</label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => onTimeoutChange(Number(e.target.value))}
                className="flex-1 bg-forge-surface2 border border-forge-border rounded px-2 py-1
                  text-forge-text font-mono text-[11px] outline-none focus:border-forge-accent"
              />
              <span className="text-[10px] text-forge-muted font-mono">ms</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-mono text-forge-muted w-16 shrink-0">Retries</label>
              <input
                type="number"
                value={retries}
                min={0}
                max={5}
                onChange={(e) => onRetriesChange(Number(e.target.value))}
                className="w-16 bg-forge-surface2 border border-forge-border rounded px-2 py-1
                  text-forge-text font-mono text-[11px] outline-none focus:border-forge-accent"
              />
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="flex items-center px-3 py-2 border-b border-forge-border shrink-0">
        <span className="text-[10px] font-bold tracking-widest text-forge-muted uppercase font-mono">
          Run History
        </span>
        <span className="ml-auto text-[10px] font-mono text-forge-dim bg-forge-surface2 border border-forge-border
          px-1.5 py-0.5 rounded-full">
          {history.length}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-1.5" style={{ maxHeight: '400px' }}>
        {history.length === 0 ? (
          <p className="text-center text-[11px] text-forge-muted py-8 font-mono">No runs yet</p>
        ) : (
          history.map((h, i) => (
            <div
              key={h.id}
              onClick={() => h.reportPath && onHistoryClick?.(h)}
              className={clsx(
                'px-2.5 py-2 rounded-lg border mb-1 transition-all',
                h.reportPath ? 'cursor-pointer hover:border-forge-accent/50' : 'cursor-default',
                i === 0
                  ? 'border-forge-accent/30 bg-forge-accent/[.04]'
                  : 'border-transparent hover:border-forge-border hover:bg-forge-surface2'
              )}
            >
              <p className="text-[11px] font-semibold truncate mb-1">{h.prompt}</p>
              {h.suiteId && h.suiteName && (
                <div className="mb-1.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-forge-muted uppercase">Test Suite:</span>
                    <span className="text-[10px] font-semibold text-forge-accent truncate">{h.suiteName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-forge-muted uppercase">Tag Test Suite:</span>
                    <span className="px-1.5 py-px rounded text-[9px] font-bold font-mono uppercase bg-purple-500/10 text-purple-400">
                      Suite
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <TypeTag type={h.testType} />
                <StatusTag status={h.status} />
                <span className="ml-auto text-[10px] text-forge-muted font-mono">{h.duration}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

function TypeTag({ type }: { type: TestType }) {
  const colors: Record<TestType, string> = {
    ui:          'bg-forge-accent/10 text-forge-accent',
    api:         'bg-purple-500/10 text-purple-400',
    e2e:         'bg-amber-500/10 text-amber-400',
    performance: 'bg-forge-green/10 text-forge-green',
  }
  return (
    <span className={`px-1.5 py-px rounded text-[9px] font-bold font-mono uppercase ${colors[type]}`}>
      {type}
    </span>
  )
}

function StatusTag({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pass:  'bg-forge-green/10 text-forge-green',
    fail:  'bg-forge-red/10 text-forge-red',
    error: 'bg-forge-red/10 text-forge-red',
  }
  return (
    <span className={`px-1.5 py-px rounded text-[9px] font-bold font-mono uppercase ${colors[status] ?? ''}`}>
      {status}
    </span>
  )
}
