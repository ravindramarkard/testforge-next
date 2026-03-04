'use client'
import { useEffect, useRef } from 'react'
import type { LogEntry, RunStatus } from '@/types'
import clsx from 'clsx'

interface Props {
  logs:       LogEntry[]
  status:     RunStatus
  progress:   number
  passed:     number
  failed:     number
  duration:   number
  screenshots: string[]
  onClear:    () => void
}

const LEVEL_STYLES: Record<string, string> = {
  pass:   'text-forge-green',
  fail:   'text-forge-red bg-forge-red/[.04]',
  warn:   'text-forge-amber',
  action: 'text-forge-accent',
  test:   'text-purple-400 font-bold',
  step:   'text-sky-400',
  error:  'text-forge-red bg-forge-red/[.06]',
  info:   'text-forge-muted',
}

export default function LiveLog({
  logs, status, progress, passed, failed, duration, screenshots, onClear,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  const total = passed + failed

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-forge-surface border-l border-forge-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-3 py-2.5 border-b border-forge-border shrink-0">
        <span className="text-[10px] font-bold tracking-widest text-forge-muted uppercase font-mono">
          Live Results
        </span>
        <StatusPill status={status} />
        <button
          onClick={onClear}
          className="ml-auto text-[10px] font-mono text-forge-muted hover:text-forge-text
            border border-forge-border rounded px-2 py-0.5 hover:border-forge-dim transition-all"
        >
          Clear
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-forge-border shrink-0">
        <div
          className={clsx(
            'h-full transition-[width] duration-300',
            progress < 100
              ? 'bg-gradient-to-r from-forge-accent via-forge-violet to-forge-accent bg-[length:200%] animate-shimmer'
              : passed > 0 && failed === 0 ? 'bg-forge-green' : 'bg-forge-red'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 p-2.5 border-b border-forge-border shrink-0">
        <Metric label="Passed"   value={total ? String(passed)    : '—'} color="text-forge-green"  />
        <Metric label="Failed"   value={total ? String(failed)    : '—'} color="text-forge-red"   />
        <Metric label="Duration" value={duration ? `${duration}s` : '—'} color="text-forge-accent" />
        <Metric label="Total"    value={total ? String(total)     : '—'} color="text-forge-text"   />
      </div>

      {/* Log output — fixed area, scroll inside */}
      <div className="flex-1 min-h-0 overflow-y-auto font-mono text-[11px] leading-relaxed p-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {logs.length === 0 ? (
          <p className="text-center text-forge-muted py-8">Waiting for test run...</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={clsx('flex gap-2 px-2 py-0.5 rounded mb-px animate-fade-up', LEVEL_STYLES[log.level] ?? 'text-forge-muted')}
            >
              <span className="text-forge-dim shrink-0">{log.timestamp}</span>
              <span className="break-all">{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <div className="border-t border-forge-border p-2.5 shrink-0">
          <p className="text-[10px] font-bold tracking-widest text-forge-muted uppercase font-mono mb-2">
            Screenshots ({screenshots.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {screenshots.map((name) => (
              <a
                key={name}
                href={`/screenshots/${name}`}
                target="_blank"
                rel="noreferrer"
                title={name}
                className="shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/screenshots/${name}?t=${Date.now()}`}
                  alt={name}
                  className="w-20 h-14 object-cover rounded-md border border-forge-border
                    hover:border-forge-accent hover:scale-105 transition-all duration-150 cursor-pointer"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-forge-surface2 border border-forge-border rounded-lg px-3 py-2">
      <p className={clsx('text-base font-black font-mono', color)}>{value}</p>
      <p className="text-[10px] text-forge-muted font-bold uppercase tracking-wide">{label}</p>
    </div>
  )
}

function StatusPill({ status }: { status: RunStatus }) {
  if (status === 'idle') return null
  const map: Record<string, [string, string]> = {
    generating: ['bg-forge-amber/10 border-forge-amber/30 text-forge-amber', 'GENERATING'],
    running:    ['bg-forge-accent/10 border-forge-accent/30 text-forge-accent', 'RUNNING'],
    pass:       ['bg-forge-green/10 border-forge-green/30 text-forge-green', 'PASSED'],
    fail:       ['bg-forge-red/10 border-forge-red/30 text-forge-red', 'FAILED'],
    error:      ['bg-forge-red/10 border-forge-red/30 text-forge-red', 'ERROR'],
  }
  const [cls, label] = map[status] ?? ['', status]
  return (
    <span className={clsx('ml-2 px-2 py-px rounded-full border text-[9px] font-bold font-mono', cls)}>
      {label}
    </span>
  )
}
