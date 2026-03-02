'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { TestType, BrowserType, RunMode, HistoryItem, AIProvider, SavedTestCase } from '@/types'
import { useWebSocket } from '@/hooks/useWebSocket'
import Sidebar    from '@/components/Sidebar'
import PromptBar  from '@/components/PromptBar'
import CodeViewer from '@/components/CodeViewer'
import LiveLog    from '@/components/LiveLog'
import StepsPanel from '@/components/StepsPanel'
import ConfigPanel from '@/components/ConfigPanel'
import TestCasesPanel from '@/components/TestCasesPanel'
import clsx from 'clsx'

type TabId = 'script' | 'cases' | 'config' | 'steps'

const CONFIG_STORAGE_KEY = 'testforge-config'
const CASES_STORAGE_KEY  = 'testforge-cases'

function loadSavedConfig() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<{
      timeout: number
      retries: number
      workers: number
      baseUrl: string
      reporter: 'html' | 'list' | 'dot'
      apiAuthToken: string
      apiContentType: string
      apiCustomHeader: string
      aiProvider: AIProvider
      apiKey: string
      aiModel: string
      aiBaseUrl: string
      customProviderName: string
    }>
  } catch {
    return null
  }
}

function saveConfig(config: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // ignore
  }
}

export default function Dashboard() {
  // ── Config state ─────────────────────────────────────────────────
  const [prompt,   setPrompt]   = useState('')
  const [url,      setUrl]      = useState('https://demo.playwright.dev/todomvc')
  const [testType, setTestType] = useState<TestType>('ui')
  const [browser,  setBrowser]  = useState<BrowserType>('chromium')
  const [mode,     setMode]     = useState<RunMode>('headed')
  const [slowMo,   setSlowMo]   = useState(500)
  const [timeout,  setTimeout_] = useState(30000)
  const [retries,  setRetries]  = useState(2)
  const [workers,  setWorkers]  = useState(4)
  const [baseUrl,  setBaseUrl]  = useState('https://demo.playwright.dev')
  const [reporter, setReporter] = useState<'html' | 'list' | 'dot'>('html')
  const [apiAuthToken,   setApiAuthToken]   = useState('')
  const [apiContentType, setApiContentType] = useState('application/json')
  const [apiCustomHeader, setApiCustomHeader] = useState('')
  const [aiProvider, setAiProvider] = useState<AIProvider>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiBaseUrl, setAiBaseUrl] = useState('http://localhost:11434/v1')
  const [customProviderName, setCustomProviderName] = useState('')
  const [tab,      setTab]      = useState<TabId>('script')
  const [history,  setHistory]  = useState<HistoryItem[]>([])
  const [configSaved, setConfigSaved] = useState(false)
  const [savedCases, setSavedCases] = useState<SavedTestCase[]>([])
  const lastSavedScriptRef = useRef<string | null>(null)

  // ── Load saved config on mount ────────────────────────────────────
  useEffect(() => {
    const saved = loadSavedConfig()
    if (!saved) return
    if (saved.timeout != null) setTimeout_(saved.timeout)
    if (saved.retries != null) setRetries(saved.retries)
    if (saved.workers != null) setWorkers(saved.workers)
    if (saved.baseUrl != null) setBaseUrl(saved.baseUrl)
    if (saved.reporter != null) setReporter(saved.reporter)
    if (saved.apiAuthToken != null) setApiAuthToken(saved.apiAuthToken)
    if (saved.apiContentType != null) setApiContentType(saved.apiContentType)
    if (saved.apiCustomHeader != null) setApiCustomHeader(saved.apiCustomHeader)
    if (saved.aiProvider != null) setAiProvider(saved.aiProvider)
    if (saved.apiKey != null) setApiKey(saved.apiKey)
    if (saved.aiModel != null) setAiModel(saved.aiModel)
    if (saved.aiBaseUrl != null) setAiBaseUrl(saved.aiBaseUrl)
    if (saved.customProviderName != null) setCustomProviderName(saved.customProviderName)

    try {
      const raw = localStorage.getItem(CASES_STORAGE_KEY)
      if (raw) setSavedCases(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // ── WS ────────────────────────────────────────────────────────────
  const {
    readyState, send, logs, steps, status, progress,
    script, setScript, passed, failed, duration, screenshots, clearLogs,
  } = useWebSocket(`ws://localhost:${process.env.NEXT_PUBLIC_WS_PORT || '4002'}`)

  // Boot the WS server via Next.js API route on mount
  useEffect(() => {
    fetch('/api/init').catch(() => {})
  }, [])

  // Auto-save script as a test case when it arrives
  useEffect(() => {
    if (!script || script === lastSavedScriptRef.current) return
    lastSavedScriptRef.current = script
    const tc: SavedTestCase = {
      id:        Math.random().toString(36).slice(2, 10),
      name:      prompt.slice(0, 50) || 'Untitled test',
      prompt:    prompt,
      testType,
      browser,
      code:      script,
      status:    'idle',
      createdAt: new Date().toISOString(),
    }
    setSavedCases((prev) => {
      const next = [tc, ...prev]
      try { localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script])

  // Update latest test case status when run completes
  useEffect(() => {
    if (status === 'pass' || status === 'fail' || status === 'error') {
      setSavedCases((prev) => {
        if (prev.length === 0) return prev
        const next = [...prev]
        next[0] = { ...next[0], status: status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : 'error' }
        try { localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(next)) } catch {}
        return next
      })
      setHistory((prev) => [{
        id:        Math.random().toString(36).slice(2),
        prompt:    prompt.slice(0, 60),
        testType,
        browser,
        mode,
        status:    status === 'pass' ? 'pass' : 'fail',
        duration:  `${duration}s`,
        timestamp: new Date(),
        passed,
        failed,
      }, ...prev])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // ── Run ───────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (!prompt.trim()) return
    clearLogs()
    setTab('script')
    send({
      type:   'run',
      config: {
        prompt,
        url,
        testType,
        browser,
        mode,
        slowMo,
        timeout,
        retries,
        workers,
        baseUrl,
        reporter,
        apiAuthToken,
        apiContentType,
        apiCustomHeader,
        aiProvider,
        apiKey,
        aiModel,
        aiBaseUrl,
        customProviderName,
      },
    })
  }, [
    prompt,
    url,
    testType,
    browser,
    mode,
    slowMo,
    timeout,
    retries,
    workers,
    baseUrl,
    reporter,
    apiAuthToken,
    apiContentType,
    apiCustomHeader,
    aiProvider,
    apiKey,
    aiModel,
    aiBaseUrl,
    customProviderName,
    clearLogs,
    send,
  ])

  const handleStop = useCallback(() => {
    send({ type: 'stop' })
  }, [send])

  const handleSelectCase = useCallback((tc: SavedTestCase) => {
    setScript(tc.code)
    lastSavedScriptRef.current = tc.code
    setPrompt(tc.prompt)
    setTab('script')
  }, [setScript])

  const handleDeleteCase = useCallback((id: string) => {
    setSavedCases((prev) => {
      const next = prev.filter((c) => c.id !== id)
      try { localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleRenameCase = useCallback((id: string, name: string) => {
    setSavedCases((prev) => {
      const next = prev.map((c) => c.id === id ? { ...c, name } : c)
      try { localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleApplyConfig = useCallback(() => {
    saveConfig({
      timeout,
      retries,
      workers,
      baseUrl,
      reporter,
      apiAuthToken,
      apiContentType,
      apiCustomHeader,
      aiProvider,
      apiKey,
      aiModel,
      aiBaseUrl,
      customProviderName,
    })
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
  }, [
    timeout,
    retries,
    workers,
    baseUrl,
    reporter,
    apiAuthToken,
    apiContentType,
    apiCustomHeader,
    aiProvider,
    apiKey,
    aiModel,
    aiBaseUrl,
    customProviderName,
  ])

  const isRunning = status === 'generating' || status === 'running'

  // ── Conn badge ────────────────────────────────────────────────────
  const connBadge = {
    connecting: { cls: 'border-forge-amber/40 text-forge-amber bg-forge-amber/[.07]', label: 'Connecting...' },
    open:       { cls: 'border-forge-green/40 text-forge-green bg-forge-green/[.07]', label: 'Connected'     },
    closed:     { cls: 'border-forge-red/40  text-forge-red   bg-forge-red/[.07]',    label: 'Offline'       },
  }[readyState]

  return (
    <div className="flex flex-col h-screen bg-forge-bg overflow-hidden">
      {/* ── HEADER ── */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-forge-border
        bg-forge-bg/95 backdrop-blur-xl shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-forge-accent to-forge-violet
            flex items-center justify-center text-sm shrink-0">
            ⚡
          </div>
          <span className="text-base font-black tracking-tight">
            Test<span className="text-forge-accent">Forge</span> AI
          </span>
        </div>

        {/* WS badge */}
        <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold', connBadge.cls)}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
          {connBadge.label}
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-forge-muted font-mono">
          <kbd className="px-1.5 py-0.5 rounded border border-forge-border bg-forge-surface2 text-[10px]">⌘↵</kbd>
          <span>Run</span>
          <span className="ml-3 text-forge-dim">Next.js · React · Playwright</span>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <Sidebar
            testType={testType}   onTypeChange={setTestType}
            browser={browser}     onBrowserChange={setBrowser}
            mode={mode}           onModeChange={setMode}
            url={url}             onUrlChange={setUrl}
            slowMo={slowMo}       onSlowMoChange={setSlowMo}
            timeout={timeout}     onTimeoutChange={setTimeout_}
            retries={retries}     onRetriesChange={setRetries}
            history={history}
          />
        </div>

        {/* Center */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <PromptBar
            prompt={prompt}
            testType={testType}
            status={status}
            onChange={setPrompt}
            onRun={handleRun}
            onStop={handleStop}
          />

          {/* Tabs */}
          <div className="flex bg-forge-surface border-b border-forge-border px-4 shrink-0">
            {([
              ['script', '📄 Script',    script ? `${script.split('\n').length}L` : '—'],
              ['cases',  '🧪 Test Cases', savedCases.length > 0 ? String(savedCases.length) : '—'],
              ['config', '⚙ Config',    'playwright'],
              ['steps',  '🪜 Steps',     steps.length > 0 ? String(steps.length) : '—'],
            ] as const).map(([id, label, badge]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  'px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all flex items-center gap-2',
                  tab === id
                    ? 'border-forge-accent text-forge-accent'
                    : 'border-transparent text-forge-muted hover:text-forge-text'
                )}
              >
                {label}
                <span className="px-1.5 py-px rounded-full bg-forge-surface2 border border-forge-border
                  text-[10px] font-mono text-forge-muted">
                  {badge}
                </span>
              </button>
            ))}

            {/* Run indicator */}
            {isRunning && (
              <div className="ml-auto flex items-center gap-2 py-2 text-[10px] text-forge-accent font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-forge-accent animate-pulse-dot" />
                {status === 'generating' ? 'Generating script...' : 'Browser running...'}
              </div>
            )}
          </div>

          {/* Tab content */}
          <div className="flex flex-col flex-1 overflow-hidden bg-forge-bg">
            {tab === 'script' && <CodeViewer code={script} />}
            {tab === 'cases' && (
              <TestCasesPanel
                cases={savedCases}
                onSelect={handleSelectCase}
                onDelete={handleDeleteCase}
                onRename={handleRenameCase}
              />
            )}
            {tab === 'config' && (
              <ConfigPanel
                timeout={timeout}
                retries={retries}
                workers={workers}
                baseUrl={baseUrl}
                reporter={reporter}
                apiAuthToken={apiAuthToken}
                apiContentType={apiContentType}
                apiCustomHeader={apiCustomHeader}
                aiProvider={aiProvider}
                apiKey={apiKey}
                aiModel={aiModel}
                aiBaseUrl={aiBaseUrl}
                customProviderName={customProviderName}
                onChange={(next) => {
                  if (next.timeout !== undefined) setTimeout_(next.timeout)
                  if (next.retries !== undefined) setRetries(next.retries)
                  if (next.workers !== undefined) setWorkers(next.workers)
                  if (next.baseUrl !== undefined) setBaseUrl(next.baseUrl)
                  if (next.reporter !== undefined) setReporter(next.reporter)
                  if (next.apiAuthToken !== undefined) setApiAuthToken(next.apiAuthToken)
                  if (next.apiContentType !== undefined) setApiContentType(next.apiContentType)
                  if (next.apiCustomHeader !== undefined) setApiCustomHeader(next.apiCustomHeader)
                  if (next.aiProvider !== undefined) setAiProvider(next.aiProvider)
                  if (next.apiKey !== undefined) setApiKey(next.apiKey)
                  if (next.aiModel !== undefined) setAiModel(next.aiModel)
                  if (next.aiBaseUrl !== undefined) setAiBaseUrl(next.aiBaseUrl)
                  if (next.customProviderName !== undefined) setCustomProviderName(next.customProviderName)
                }}
                onApply={handleApplyConfig}
                configSaved={configSaved}
              />
            )}
            {tab === 'steps'  && <StepsPanel steps={steps} />}
          </div>
        </div>

        {/* Results panel — fixed height, scroll inside */}
        <div className="w-80 shrink-0 flex flex-col min-h-0 overflow-hidden">
          <LiveLog
            logs={logs}
            status={status}
            progress={progress}
            passed={passed}
            failed={failed}
            duration={duration}
            screenshots={screenshots}
            onClear={clearLogs}
          />
        </div>
      </div>
    </div>
  )
}
