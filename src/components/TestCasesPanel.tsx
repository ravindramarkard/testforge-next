'use client'
import { useState, useCallback } from 'react'
import type { SavedTestCase } from '@/types'
import clsx from 'clsx'

interface Props {
  cases: SavedTestCase[]
  onSelect: (tc: SavedTestCase) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pass:  { cls: 'bg-forge-green/10 border-forge-green/30 text-forge-green', label: 'PASS' },
  fail:  { cls: 'bg-forge-red/10 border-forge-red/30 text-forge-red',      label: 'FAIL' },
  error: { cls: 'bg-forge-red/10 border-forge-red/30 text-forge-red',      label: 'ERR' },
  idle:  { cls: 'bg-forge-surface2 border-forge-border text-forge-muted',   label: 'NEW' },
}

export default function TestCasesPanel({ cases, onSelect, onDelete, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const startRename = useCallback((tc: SavedTestCase) => {
    setEditingId(tc.id)
    setEditName(tc.name)
  }, [])

  const commitRename = useCallback(() => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim())
    }
    setEditingId(null)
  }, [editingId, editName, onRename])

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-forge-muted">
        <div className="w-20 h-20 rounded-2xl bg-forge-surface border border-forge-border
          flex items-center justify-center text-3xl">
          🧪
        </div>
        <div className="text-center">
          <p className="text-forge-text font-bold text-base mb-1">No test cases yet</p>
          <p className="text-sm max-w-sm leading-relaxed">
            Generated Playwright scripts are automatically saved here after each run.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-forge-surface border-b border-forge-border shrink-0">
        <span className="text-[10px] font-mono text-forge-muted mr-auto">
          {cases.length} saved test {cases.length === 1 ? 'case' : 'cases'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {cases.map((tc) => {
          const badge = STATUS_BADGE[tc.status] ?? STATUS_BADGE.idle
          const lines = tc.code.split('\n').length
          const date = new Date(tc.createdAt)
          const timeStr = date.toLocaleString(undefined, {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })

          return (
            <div
              key={tc.id}
              className="group bg-forge-surface border border-forge-border rounded-lg p-3
                hover:border-forge-accent/50 transition-all cursor-pointer"
              onClick={() => onSelect(tc)}
            >
              <div className="flex items-start gap-2 mb-1.5">
                {editingId === tc.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-forge-surface2 border border-forge-accent rounded px-1.5 py-0.5
                      text-[11px] font-mono text-forge-text outline-none"
                  />
                ) : (
                  <span className="flex-1 text-[12px] font-bold text-forge-text truncate">
                    {tc.name}
                  </span>
                )}
                <span className={clsx(
                  'px-1.5 py-px rounded-full border text-[9px] font-bold font-mono shrink-0',
                  badge.cls
                )}>
                  {badge.label}
                </span>
              </div>

              <p className="text-[10px] text-forge-dim truncate mb-2">{tc.prompt}</p>

              <div className="flex items-center gap-3 text-[10px] font-mono text-forge-muted">
                <span>{tc.testType.toUpperCase()}</span>
                <span>{tc.browser}</span>
                <span>{lines}L</span>
                <span>{timeStr}</span>

                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(tc) }}
                    className="px-1.5 py-0.5 rounded border border-forge-border bg-forge-surface2
                      text-forge-muted hover:text-forge-text hover:border-forge-accent transition-all"
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(tc.id) }}
                    className="px-1.5 py-0.5 rounded border border-forge-border bg-forge-surface2
                      text-forge-muted hover:text-forge-red hover:border-forge-red transition-all"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
