'use client'
import React, { useState, useCallback } from 'react'
import type { AIProvider } from '@/types'

type Reporter = 'html' | 'list' | 'dot'

const AI_PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'glm', label: 'GLM (ZhiPu / 智谱)' },
  { value: 'local', label: 'Local (Ollama / LM Studio)' },
  { value: 'custom', label: 'Custom (URL + API Key + Model)' },
]

interface Props {
  timeout: number
  retries: number
  workers: number
  baseUrl: string
  reporter: Reporter
  apiAuthToken: string
  apiContentType: string
  apiCustomHeader: string
  aiProvider: AIProvider
  apiKey: string
  aiModel: string
  aiBaseUrl: string
  customProviderName: string
  onChange: (next: Partial<Props>) => void
  onApply?: () => void
  configSaved?: boolean
}

export default function ConfigPanel({
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
  onChange,
  onApply,
  configSaved = false,
}: Props) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const handleTestConnection = useCallback(async () => {
    setTestStatus('testing')
    setTestMessage('')
    try {
      const res = await fetch('/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider,
          apiKey: apiKey || undefined,
          aiModel: aiModel || undefined,
          aiBaseUrl: aiBaseUrl || undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestStatus('ok')
        setTestMessage(data.message ?? 'Connected')
      } else {
        setTestStatus('fail')
        setTestMessage(data.error ?? 'Connection failed')
      }
    } catch (e: any) {
      setTestStatus('fail')
      setTestMessage(e?.message ?? 'Request failed')
    }
  }, [aiProvider, apiKey, aiModel, aiBaseUrl])

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-forge-bg px-6 py-5 gap-6">
      {/* Playwright configuration */}
      <section>
        <header className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono font-bold tracking-[0.18em] text-forge-muted uppercase">
              Playwright Configuration
            </p>
            <p className="text-[11px] text-forge-dim mt-1">
              Tune how the generated tests run (timeouts, workers, reporter, base URL).
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-forge-surface border border-forge-border rounded-xl p-4">
          {/* Timeout */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Timeout
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={timeout}
                min={1000}
                onChange={(e) => onChange({ timeout: Number(e.target.value) || 0 })}
                className="flex-1 bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
                  text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
              />
              <span className="text-[10px] font-mono text-forge-muted">ms</span>
            </div>
          </div>

          {/* Retries */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Retries
            </label>
            <input
              type="number"
              value={retries}
              min={0}
              max={5}
              onChange={(e) => onChange({ retries: Number(e.target.value) || 0 })}
              className="w-24 bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
                text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
            />
          </div>

          {/* Workers */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Workers
            </label>
            <input
              type="number"
              value={workers}
              min={1}
              max={16}
              onChange={(e) => onChange({ workers: Number(e.target.value) || 1 })}
              className="w-24 bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
                text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
            />
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => onChange({ baseUrl: e.target.value })}
              placeholder="https://demo.playwright.dev"
              className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                text-[11px] font-mono text-forge-accent outline-none focus:border-forge-accent"
            />
          </div>

          {/* Reporter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Reporter
            </label>
            <select
              value={reporter}
              onChange={(e) => onChange({ reporter: e.target.value as Reporter })}
              className="bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
                text-[11px] font-mono text-forge-text outline-none cursor-pointer focus:border-forge-accent"
            >
              <option value="html">html</option>
              <option value="list">list</option>
              <option value="dot">dot</option>
            </select>
          </div>
        </div>
      </section>

      {/* AI provider */}
      <section>
        <header className="mb-3">
          <p className="text-[11px] font-mono font-bold tracking-[0.18em] text-forge-muted uppercase">
            AI Provider
          </p>
          <p className="text-[11px] text-forge-dim mt-1">
            Choose the provider for AI-powered Playwright script generation.
          </p>
        </header>

        <div className="bg-forge-surface border border-forge-border rounded-xl p-4 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Provider
            </label>
            <select
              value={aiProvider}
              onChange={(e) => onChange({ aiProvider: e.target.value as AIProvider })}
              className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                text-[11px] font-mono text-forge-text outline-none cursor-pointer focus:border-forge-accent"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {(aiProvider === 'custom') && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Base URL
                </label>
                <input
                  type="url"
                  value={aiBaseUrl}
                  onChange={(e) => onChange({ aiBaseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
                <p className="text-[10px] text-forge-dim">OpenAI-compatible chat completions endpoint.</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Provider name (optional)
                </label>
                <input
                  type="text"
                  value={customProviderName}
                  onChange={(e) => onChange({ customProviderName: e.target.value })}
                  placeholder="My Custom API"
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
              </div>
            </>
          )}

          {aiProvider !== 'local' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => onChange({ apiKey: e.target.value })}
                placeholder={
                  aiProvider === 'anthropic' ? 'sk-ant-...' :
                  aiProvider === 'openai' ? 'sk-...' :
                  aiProvider === 'openrouter' ? 'sk-or-...' :
                  aiProvider === 'custom' ? 'Optional for some endpoints' : 'API key'
                }
                className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                  text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
              />
            </div>
          )}

          {(aiProvider === 'openai' || aiProvider === 'openrouter' || aiProvider === 'glm' || aiProvider === 'local' || aiProvider === 'custom') && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                Model
              </label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => onChange({ aiModel: e.target.value })}
                placeholder={
                  aiProvider === 'openai' ? 'gpt-4o' :
                  aiProvider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' :
                  aiProvider === 'glm' ? 'glm-4-flash' :
                  aiProvider === 'custom' ? 'model-id' : 'llama3.2'
                }
                className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                  text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
              />
            </div>
          )}

          {aiProvider === 'local' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                Base URL
              </label>
              <input
                type="text"
                value={aiBaseUrl}
                onChange={(e) => onChange({ aiBaseUrl: e.target.value })}
                placeholder="http://localhost:11434/v1"
                className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                  text-[11px] font-mono text-forge-accent outline-none focus:border-forge-accent"
              />
              <p className="text-[10px] text-forge-dim">
                OpenAI-compatible chat endpoint (e.g. Ollama, LM Studio).
              </p>
            </div>
          )}

          <p className="text-[10px] text-forge-dim">
            API key is stored only in this session and sent to the server for generation.
          </p>

          <div className="flex items-center gap-2 pt-2 border-t border-forge-border/50">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-forge-border
                text-[11px] font-mono font-bold text-forge-text bg-forge-surface2
                hover:border-forge-accent hover:text-forge-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testStatus === 'testing' ? 'Testing…' : '🔌 Test connection'}
            </button>
            {testStatus === 'ok' && (
              <span className="text-[11px] font-mono text-forge-green">
                ✓ {testMessage}
              </span>
            )}
            {testStatus === 'fail' && (
              <span className="text-[11px] font-mono text-forge-red max-w-xs truncate" title={testMessage}>
                ✗ {testMessage}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* API headers */}
      <section>
        <header className="mb-3">
          <p className="text-[11px] font-mono font-bold tracking-[0.18em] text-forge-muted uppercase">
            API Headers
          </p>
          <p className="text-[11px] text-forge-dim mt-1">
            Optional headers that the generated API tests can include.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-forge-surface border border-forge-border rounded-xl p-4">
          {/* Auth token */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Auth Token
            </label>
            <input
              type="text"
              value={apiAuthToken}
              onChange={(e) => onChange({ apiAuthToken: e.target.value })}
              placeholder="Bearer token..."
              className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
            />
          </div>

          {/* Content-Type */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Content-Type
            </label>
            <select
              value={apiContentType}
              onChange={(e) => onChange({ apiContentType: e.target.value })}
              className="bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
                text-[11px] font-mono text-forge-text outline-none cursor-pointer focus:border-forge-accent"
            >
              <option value="application/json">application/json</option>
              <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
              <option value="text/plain">text/plain</option>
            </select>
          </div>

          {/* Custom header */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Custom Header
            </label>
            <input
              type="text"
              value={apiCustomHeader}
              onChange={(e) => onChange({ apiCustomHeader: e.target.value })}
              placeholder="X-Custom: value"
              className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
            />
          </div>
        </div>
      </section>

      <div className="mt-auto pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md
            bg-forge-accent text-[11px] font-mono font-bold text-forge-bg
            hover:brightness-110 transition-colors border border-forge-accent"
        >
          ✅ Apply Configuration
        </button>
        {configSaved && (
          <span className="text-[11px] font-mono text-forge-green">
            Saved to browser
          </span>
        )}
      </div>
    </div>
  )
}

