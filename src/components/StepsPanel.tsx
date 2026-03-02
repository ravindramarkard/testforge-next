'use client'
import type { TestStep } from '@/types'
import clsx from 'clsx'

interface Props {
  steps: TestStep[]
}

export default function StepsPanel({ steps }: Props) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-forge-muted">
        <div className="w-20 h-20 rounded-2xl bg-forge-surface border border-forge-border
          flex items-center justify-center text-3xl">
          🪜
        </div>
        <div className="text-center">
          <p className="text-forge-text font-bold text-base mb-1">No steps yet</p>
          <p className="text-sm max-w-sm leading-relaxed">
            Run a test to see the step-by-step execution trace here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-forge-surface border-b border-forge-border shrink-0">
        <span className="text-[10px] font-mono text-forge-muted">
          execution trace · {steps.length} steps
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all',
              step.status === 'running' && 'border-forge-accent/40 bg-forge-accent/[.04]',
              step.status === 'pass'    && 'border-forge-green/30 bg-forge-green/[.03]',
              step.status === 'fail'    && 'border-forge-red/30   bg-forge-red/[.03]',
            )}
          >
            {/* Step number */}
            <span className="text-[10px] font-mono text-forge-dim w-5 text-right shrink-0">
              {i + 1}
            </span>

            {/* Status icon */}
            <span className="shrink-0 text-sm">
              {step.status === 'running' ? (
                <span className="w-4 h-4 rounded-full border-2 border-forge-accent border-t-transparent
                  animate-spin inline-block" />
              ) : step.status === 'pass' ? (
                '✅'
              ) : (
                '❌'
              )}
            </span>

            {/* Name */}
            <span className="flex-1 text-[12px] font-mono text-forge-text truncate">
              {step.name}
            </span>

            {/* Duration */}
            {step.duration !== undefined && (
              <span className="shrink-0 text-[10px] font-mono text-forge-muted">
                {step.duration}ms
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
