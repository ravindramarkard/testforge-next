'use client'
import React, { useState, useCallback } from 'react'
import type { AIProvider } from '@/types'
import type { Environment, ProjectConfig } from '@/lib/projects'
import { loadProjectConfig } from '@/lib/projects'
import EnvironmentModal from './EnvironmentModal'

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
  apiAuthMethod?: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth' | 'oauth2' | 'custom'
  apiAuthToken?: string
  apiBasicUsername?: string
  apiBasicPassword?: string
  apiKeyName?: string
  apiKeyValue?: string
  apiOAuthToken?: string
  apiOAuth2GrantType?: 'client_credentials' | 'authorization_code' | 'password' | 'refresh_token'
  apiOAuth2AuthUrl?: string
  apiOAuth2TokenUrl?: string
  apiOAuth2ClientId?: string
  apiOAuth2ClientSecret?: string
  apiOAuth2Scope?: string
  apiOAuth2RedirectUri?: string
  apiOAuth2Username?: string
  apiOAuth2Password?: string
  apiOAuth2RefreshToken?: string
  apiOAuth2AccessToken?: string
  apiCustomAuth?: string
  apiContentType: string
  apiCustomHeader: string
  aiProvider: AIProvider
  apiKey: string
  aiModel: string
  aiBaseUrl: string
  customProviderName: string
  currentEnvironment?: Environment
  availableEnvironments?: Environment[]
  currentProjectId?: string
  onEnvironmentChange?: (env: Environment) => void
  onCreateEnvironment?: (name: string) => boolean
  onDeleteEnvironment?: (name: string) => boolean
  onRenameEnvironment?: (oldName: string, newName: string) => boolean
  onSaveEnvironment?: (name: string, config: Partial<ProjectConfig>) => void
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
  apiAuthMethod = 'none',
  apiAuthToken = '',
  apiBasicUsername = '',
  apiBasicPassword = '',
  apiKeyName = 'X-API-Key',
  apiKeyValue = '',
  apiOAuthToken = '',
  apiOAuth2GrantType = 'client_credentials',
  apiOAuth2AuthUrl = '',
  apiOAuth2TokenUrl = '',
  apiOAuth2ClientId = '',
  apiOAuth2ClientSecret = '',
  apiOAuth2Scope = '',
  apiOAuth2RedirectUri = '',
  apiOAuth2Username = '',
  apiOAuth2Password = '',
  apiOAuth2RefreshToken = '',
  apiOAuth2AccessToken = '',
  apiCustomAuth = '',
  apiContentType,
  apiCustomHeader,
  aiProvider,
  apiKey,
  aiModel,
  aiBaseUrl,
  customProviderName,
  currentEnvironment = 'dev',
  availableEnvironments = ['dev', 'stage', 'prod'],
  currentProjectId,
  onEnvironmentChange,
  onCreateEnvironment,
  onDeleteEnvironment,
  onRenameEnvironment,
  onSaveEnvironment,
  onChange,
  onApply,
  configSaved = false,
}: Props) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [showEnvModal, setShowEnvModal] = useState(false)
  const [editingEnvName, setEditingEnvName] = useState<string | null>(null)
  const [editingEnvConfig, setEditingEnvConfig] = useState<Partial<ProjectConfig> | undefined>(undefined)

  const getCurrentConfig = useCallback((): Partial<ProjectConfig> => {
    return {
      timeout,
      retries,
      workers,
      baseUrl,
      reporter,
      apiAuthMethod,
      apiAuthToken,
      apiBasicUsername,
      apiBasicPassword,
      apiKeyName,
      apiKeyValue,
      apiOAuthToken,
      apiOAuth2GrantType,
      apiOAuth2AuthUrl,
      apiOAuth2TokenUrl,
      apiOAuth2ClientId,
      apiOAuth2ClientSecret,
      apiOAuth2Scope,
      apiOAuth2RedirectUri,
      apiOAuth2Username,
      apiOAuth2Password,
      apiOAuth2RefreshToken,
      apiOAuth2AccessToken,
      apiCustomAuth,
      apiContentType,
      apiCustomHeader,
      aiProvider,
      apiKey,
      aiModel,
      aiBaseUrl,
      customProviderName,
    }
  }, [timeout, retries, workers, baseUrl, reporter, apiAuthMethod, apiAuthToken, apiBasicUsername, apiBasicPassword, apiKeyName, apiKeyValue, apiOAuthToken, apiOAuth2GrantType, apiOAuth2AuthUrl, apiOAuth2TokenUrl, apiOAuth2ClientId, apiOAuth2ClientSecret, apiOAuth2Scope, apiOAuth2RedirectUri, apiOAuth2Username, apiOAuth2Password, apiOAuth2RefreshToken, apiOAuth2AccessToken, apiCustomAuth, apiContentType, apiCustomHeader, aiProvider, apiKey, aiModel, aiBaseUrl, customProviderName])

  const handleSaveEnvironment = useCallback((name: string, config: Partial<ProjectConfig>) => {
    if (editingEnvName && editingEnvName !== name) {
      // Rename environment
      if (onRenameEnvironment?.(editingEnvName, name)) {
        onSaveEnvironment?.(name, config)
      }
    } else {
      // Create or update environment
      if (!editingEnvName && onCreateEnvironment) {
        // Create new
        if (onCreateEnvironment(name)) {
          onSaveEnvironment?.(name, config)
        }
      } else {
        // Update existing
        onSaveEnvironment?.(name, config)
      }
    }
    setShowEnvModal(false)
    setEditingEnvName(null)
  }, [editingEnvName, onCreateEnvironment, onRenameEnvironment, onSaveEnvironment])

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
      {/* Environment Selector */}
      <section>
        <header className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono font-bold tracking-[0.18em] text-forge-muted uppercase">
              Environment
            </p>
            <p className="text-[11px] text-forge-dim mt-1">
              Create and manage multiple environments with different configurations.
            </p>
          </div>
        </header>
        <div className="bg-forge-surface border border-forge-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Environments:
            </label>
            <div className="flex gap-2 flex-wrap">
              {availableEnvironments.map((env) => (
                <div key={env} className="flex items-center gap-1 group">
                  <button
                    type="button"
                    onClick={() => onEnvironmentChange?.(env)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-bold transition-colors ${
                      currentEnvironment === env
                        ? 'bg-forge-accent text-forge-bg border border-forge-accent'
                        : 'bg-forge-surface2 text-forge-text border border-forge-border hover:border-forge-accent/50'
                    }`}
                  >
                    {env.toUpperCase()}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEnvName(env)
                      // Load config for the environment being edited
                      if (currentProjectId) {
                        const envConfig = loadProjectConfig(currentProjectId, env)
                        setEditingEnvConfig(envConfig || undefined)
                      } else {
                        setEditingEnvConfig(env === currentEnvironment ? getCurrentConfig() : undefined)
                      }
                      setShowEnvModal(true)
                    }}
                    className="opacity-0 group-hover:opacity-100 px-1.5 py-1 rounded-md text-[10px] font-mono bg-forge-surface2 text-forge-muted border border-forge-border hover:border-forge-accent/50 hover:text-forge-text transition-opacity"
                    title="Edit environment"
                  >
                    ✏️
                  </button>
                  {availableEnvironments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete environment "${env}"? This will remove all configuration for this environment.`)) {
                          onDeleteEnvironment?.(env)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 px-1.5 py-1 rounded-md text-[10px] font-mono bg-forge-surface2 text-forge-red border border-forge-border hover:border-forge-red/50 transition-opacity"
                      title="Delete environment"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEditingEnvName(null)
                  setEditingEnvConfig(undefined)
                  setShowEnvModal(true)
                }}
                className="px-3 py-1.5 rounded-md text-[11px] font-mono font-bold bg-forge-surface2 text-forge-text border border-forge-border hover:border-forge-accent/50 hover:text-forge-accent transition-colors"
              >
                + Add Environment
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Environment Modal */}
      <EnvironmentModal
        isOpen={showEnvModal}
        environmentName={editingEnvName}
        initialConfig={editingEnvConfig}
        onClose={() => {
          setShowEnvModal(false)
          setEditingEnvName(null)
          setEditingEnvConfig(undefined)
        }}
        onSave={handleSaveEnvironment}
      />

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

      {/* API Authentication & Headers */}
      <section>
        <header className="mb-3">
          <p className="text-[11px] font-mono font-bold tracking-[0.18em] text-forge-muted uppercase">
            API Authentication & Headers
          </p>
          <p className="text-[11px] text-forge-dim mt-1">
            Configure authentication method and headers for generated API tests.
          </p>
        </header>

        <div className="bg-forge-surface border border-forge-border rounded-xl p-4 space-y-4">
          {/* Authentication Method */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Authentication Method
            </label>
            <select
              value={apiAuthMethod}
              onChange={(e) => {
                const newValue = e.target.value as Props['apiAuthMethod']
                onChange({ apiAuthMethod: newValue })
              }}
              className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                text-[11px] font-mono text-forge-text outline-none cursor-pointer focus:border-forge-accent
                appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pr-8
                hover:border-forge-accent/50 transition-colors"
              style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
            >
              <option value="none">None</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key</option>
              <option value="oauth">OAuth Token (Legacy)</option>
              <option value="oauth2">OAuth2</option>
              <option value="custom">Custom Header</option>
            </select>
          </div>

          {/* Bearer Token */}
          {apiAuthMethod === 'bearer' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                Bearer Token
              </label>
              <input
                type="password"
                value={apiAuthToken}
                onChange={(e) => onChange({ apiAuthToken: e.target.value })}
                placeholder="Enter bearer token..."
                className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                  text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
              />
              <p className="text-[10px] text-forge-dim">Token will be sent as: Authorization: Bearer &lt;token&gt;</p>
            </div>
          )}

          {/* Basic Auth */}
          {apiAuthMethod === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Username
                </label>
                <input
                  type="text"
                  value={apiBasicUsername}
                  onChange={(e) => onChange({ apiBasicUsername: e.target.value })}
                  placeholder="Username"
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Password
                </label>
                <input
                  type="password"
                  value={apiBasicPassword}
                  onChange={(e) => onChange({ apiBasicPassword: e.target.value })}
                  placeholder="Password"
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
              </div>
            </div>
          )}

          {/* API Key */}
          {apiAuthMethod === 'apikey' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Header Name
                </label>
                <input
                  type="text"
                  value={apiKeyName}
                  onChange={(e) => onChange({ apiKeyName: e.target.value })}
                  placeholder="X-API-Key"
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  API Key Value
                </label>
                <input
                  type="password"
                  value={apiKeyValue}
                  onChange={(e) => onChange({ apiKeyValue: e.target.value })}
                  placeholder="Enter API key..."
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
              </div>
            </div>
          )}

          {/* OAuth Token (Legacy) */}
          {apiAuthMethod === 'oauth' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                OAuth Token
              </label>
              <input
                type="password"
                value={apiOAuthToken}
                onChange={(e) => onChange({ apiOAuthToken: e.target.value })}
                placeholder="Enter OAuth access token..."
                className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                  text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
              />
              <p className="text-[10px] text-forge-dim">Token will be sent as: Authorization: Bearer &lt;token&gt;</p>
            </div>
          )}

          {/* OAuth2 Configuration */}
          {apiAuthMethod === 'oauth2' && (
            <div className="space-y-3">
              {/* Grant Type */}
              <div className="flex flex-col gap-1 relative z-10">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Grant Type
                </label>
                <select
                  value={apiOAuth2GrantType}
                  onChange={(e) => {
                    const newValue = e.target.value as Props['apiOAuth2GrantType']
                    onChange({ apiOAuth2GrantType: newValue })
                  }}
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none cursor-pointer focus:border-forge-accent
                    appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pr-8
                    hover:border-forge-accent/50 transition-colors w-full"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                >
                  <option value="client_credentials">Client Credentials</option>
                  <option value="authorization_code">Authorization Code</option>
                  <option value="password">Password (Resource Owner Password)</option>
                  <option value="refresh_token">Refresh Token</option>
                </select>
                <p className="text-[10px] text-forge-dim">
                  {apiOAuth2GrantType === 'client_credentials' && 'For server-to-server authentication'}
                  {apiOAuth2GrantType === 'authorization_code' && 'For web applications with user consent'}
                  {apiOAuth2GrantType === 'password' && 'For trusted applications (not recommended)'}
                  {apiOAuth2GrantType === 'refresh_token' && 'For refreshing expired access tokens'}
                </p>
              </div>

              {/* Token URL (required for all grant types) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Token URL *
                </label>
                <input
                  type="url"
                  value={apiOAuth2TokenUrl}
                  onChange={(e) => onChange({ apiOAuth2TokenUrl: e.target.value })}
                  placeholder="https://api.example.com/oauth/token"
              className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
            />
          </div>

              {/* Authorization URL (for authorization_code) */}
              {apiOAuth2GrantType === 'authorization_code' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                    Authorization URL *
                  </label>
                  <input
                    type="url"
                    value={apiOAuth2AuthUrl}
                    onChange={(e) => onChange({ apiOAuth2AuthUrl: e.target.value })}
                    placeholder="https://api.example.com/oauth/authorize"
                    className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                      text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                  />
                </div>
              )}

              {/* Client ID and Secret */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    value={apiOAuth2ClientId}
                    onChange={(e) => onChange({ apiOAuth2ClientId: e.target.value })}
                    placeholder="your-client-id"
                    className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                      text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                    Client Secret *
                  </label>
                  <input
                    type="password"
                    value={apiOAuth2ClientSecret}
                    onChange={(e) => onChange({ apiOAuth2ClientSecret: e.target.value })}
                    placeholder="your-client-secret"
                    className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                      text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                  />
                </div>
              </div>

              {/* Scope */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Scope (optional)
                </label>
                <input
                  type="text"
                  value={apiOAuth2Scope}
                  onChange={(e) => onChange({ apiOAuth2Scope: e.target.value })}
                  placeholder="read write admin"
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
                <p className="text-[10px] text-forge-dim">Space or comma separated scopes</p>
              </div>

              {/* Redirect URI (for authorization_code) */}
              {apiOAuth2GrantType === 'authorization_code' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                    Redirect URI
                  </label>
                  <input
                    type="url"
                    value={apiOAuth2RedirectUri}
                    onChange={(e) => onChange({ apiOAuth2RedirectUri: e.target.value })}
                    placeholder="https://your-app.com/callback"
                    className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                      text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                  />
                </div>
              )}

              {/* Username/Password (for password grant) */}
              {apiOAuth2GrantType === 'password' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={apiOAuth2Username}
                      onChange={(e) => onChange({ apiOAuth2Username: e.target.value })}
                      placeholder="username"
                      className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                        text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={apiOAuth2Password}
                      onChange={(e) => onChange({ apiOAuth2Password: e.target.value })}
                      placeholder="password"
                      className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                        text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                    />
                  </div>
                </div>
              )}

              {/* Refresh Token (for refresh_token grant) */}
              {apiOAuth2GrantType === 'refresh_token' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                    Refresh Token *
                  </label>
                  <input
                    type="password"
                    value={apiOAuth2RefreshToken}
                    onChange={(e) => onChange({ apiOAuth2RefreshToken: e.target.value })}
                    placeholder="your-refresh-token"
                    className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                      text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                  />
                </div>
              )}

              {/* Access Token (optional, for manual entry) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Access Token (optional - for manual entry)
                </label>
                <input
                  type="password"
                  value={apiOAuth2AccessToken}
                  onChange={(e) => onChange({ apiOAuth2AccessToken: e.target.value })}
                  placeholder="Leave empty to auto-fetch from token endpoint"
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
                <p className="text-[10px] text-forge-dim">
                  If provided, this token will be used directly. Otherwise, token will be fetched automatically.
                </p>
              </div>
            </div>
          )}

          {/* Custom Auth */}
          {apiAuthMethod === 'custom' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                Custom Authorization Header
              </label>
              <input
                type="text"
                value={apiCustomAuth}
                onChange={(e) => onChange({ apiCustomAuth: e.target.value })}
                placeholder="Header-Name: value"
                className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                  text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
              />
              <p className="text-[10px] text-forge-dim">Format: "Header-Name: value" (e.g., "X-Auth-Token: abc123")</p>
            </div>
          )}

          <div className="border-t border-forge-border/50 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option value="application/xml">application/xml</option>
                  <option value="multipart/form-data">multipart/form-data</option>
            </select>
          </div>

          {/* Custom header */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Additional Custom Header
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

