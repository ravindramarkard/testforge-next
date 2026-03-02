'use client'
import { useRef, KeyboardEvent } from 'react'
import type { TestType, RunStatus } from '@/types'

const CHIPS: Record<TestType, Array<[string, string]>> = {
  ui: [
    ['Todo flow',     'Test adding, completing and deleting todo items. Verify the counter updates correctly.'],
    ['Login',         'Test login form with valid credentials. Verify redirect to dashboard.'],
    ['Validation',    'Test form validation: empty fields, invalid email, password too short.'],
    ['Navigation',    'Test all main navigation links load correct pages without errors.'],
    ['Responsive',    'Test layout on mobile (375px), tablet (768px) and desktop (1280px).'],
  ],
  api: [
    ['GET users',     'GET /users — verify 200, response is array, each item has id and name.'],
    ['CRUD test',     'Test full CRUD: GET list, POST create, PUT update, DELETE — verify status codes.'],
    ['Auth',          'Test authenticated endpoint with Bearer token. Verify 401 without token.'],
    ['Error codes',   'Test 400 Bad Request, 401 Unauthorized, 404 Not Found responses.'],
    ['Schema',        'Validate JSON schema for all API responses including nested objects.'],
  ],
  e2e: [
    ['Todo E2E',      'Add 3 todo items → mark 2 complete → filter Active → filter Completed → clear completed.'],
    ['Registration',  'Complete user registration form → verify confirmation → login with new credentials.'],
    ['Search flow',   'Type in search box → verify results appear → click first result → verify detail page.'],
    ['Form wizard',   'Complete multi-step form wizard, fill all fields, submit, verify success screen.'],
    ['Cart checkout', 'Add item to cart → proceed to checkout → fill shipping → verify order summary.'],
  ],
  performance: [
    ['Page load',     'Measure total page load time. Assert under 3 seconds budget.'],
    ['Core Web Vitals','Measure LCP, CLS and TTFB. Flag if any metric is outside Good threshold.'],
    ['Resources',     'Count total resources loaded. Identify any failed requests (4xx/5xx).'],
    ['TTFB',          'Measure Time to First Byte across 3 loads. Report average and p95.'],
    ['Stress test',   'Navigate all main routes 5 times each and check for memory growth.'],
  ],
}

interface Props {
  prompt:   string
  testType: TestType
  status:   RunStatus
  onChange: (p: string) => void
  onRun:    () => void
  onStop:   () => void
}

export default function PromptBar({ prompt, testType, status, onChange, onRun, onStop }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isRunning = status === 'generating' || status === 'running'

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isRunning) onRun()
  }

  const placeholders: Record<TestType, string> = {
    ui:          "Describe the UI test... e.g. 'Test adding, completing and deleting todo items with counter validation.'",
    api:         "Describe the API test... e.g. 'Test GET /users returns 200 with array of user objects.'",
    e2e:         "Describe the E2E flow... e.g. 'Full todo workflow: add → complete → filter → delete.'",
    performance: "Describe the perf test... e.g. 'Measure Core Web Vitals and page load under 3s.'",
  }

  return (
    <div className="bg-forge-surface border-b border-forge-border p-3 shrink-0">
      <div className="relative rounded-xl border border-forge-border bg-forge-bg
        transition-all duration-200 focus-within:border-forge-accent
        focus-within:shadow-[0_0_0_1px_rgba(0,200,240,.15),0_0_20px_rgba(0,200,240,.08)]">

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholders[testType]}
          rows={3}
          className="w-full bg-transparent border-none outline-none resize-none
            text-forge-text text-sm leading-relaxed placeholder-forge-dim
            px-4 pt-3 pb-2 font-display"
        />

        {/* Chips */}
        <div className="flex items-center gap-2 px-3 pb-2.5 pt-1 border-t border-forge-border/50">
          <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-none">
            {CHIPS[testType].map(([label, text]) => (
              <button
                key={label}
                onClick={() => { onChange(text); textareaRef.current?.focus() }}
                className="shrink-0 px-2.5 py-1 rounded-full border border-forge-border bg-forge-surface2
                  text-[10px] text-forge-muted font-semibold hover:border-forge-accent hover:text-forge-accent
                  hover:bg-forge-accent/[.05] transition-all duration-150"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-forge-dim font-mono hidden sm:block">⌘↵ to run</span>
            {isRunning ? (
              <button
                onClick={onStop}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-none
                  bg-gradient-to-r from-forge-red to-orange-600 text-white text-xs font-bold
                  cursor-pointer transition-all duration-150 hover:-translate-y-px
                  hover:shadow-[0_4px_16px_rgba(239,68,68,.35)]"
              >
                <span>⏹</span> Stop
              </button>
            ) : (
              <button
                onClick={onRun}
                disabled={!prompt.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-none
                  bg-gradient-to-r from-forge-accent to-blue-500 text-forge-bg text-xs font-black
                  cursor-pointer transition-all duration-150 hover:-translate-y-px
                  hover:shadow-[0_4px_16px_rgba(0,200,240,.35)]
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                <span>▶</span> Run Test
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
