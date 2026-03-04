'use client'
import React, { useState, useEffect } from 'react'
import type { AIProvider } from '@/types'
import type { Environment, ProjectConfig } from '@/lib/projects'

const AI_PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'glm', label: 'GLM (ZhiPu / 智谱)' },
  { value: 'local', label: 'Local (Ollama / LM Studio)' },
  { value: 'custom', label: 'Custom (URL + API Key + Model)' },
]

type Reporter = 'html' | 'list' | 'dot'

interface Props {
  isOpen: boolean
  environmentName?: string | null // null = create new, string = edit existing
  initialConfig?: Partial<ProjectConfig>
  onClose: () => void
  onSave: (name: string, config: Partial<ProjectConfig>) => void
}

export default function EnvironmentModal({
  isOpen,
  environmentName,
  initialConfig,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState('')
  const [timeout, setTimeout_] = useState(30000)
  const [retries, setRetries] = useState(2)
  const [workers, setWorkers] = useState(4)
  const [baseUrl, setBaseUrl] = useState('https://demo.playwright.dev')
  const [reporter, setReporter] = useState<Reporter>('html')
  const [apiAuthMethod, setApiAuthMethod] = useState<'none' | 'bearer' | 'basic' | 'apikey' | 'oauth' | 'oauth2' | 'custom'>('none')
  const [apiAuthToken, setApiAuthToken] = useState('')
  const [apiBasicUsername, setApiBasicUsername] = useState('')
  const [apiBasicPassword, setApiBasicPassword] = useState('')
  const [apiKeyName, setApiKeyName] = useState('X-API-Key')
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [apiOAuthToken, setApiOAuthToken] = useState('')
  const [apiOAuth2GrantType, setApiOAuth2GrantType] = useState<'client_credentials' | 'authorization_code' | 'password' | 'refresh_token'>('client_credentials')
  const [apiOAuth2AuthUrl, setApiOAuth2AuthUrl] = useState('')
  const [apiOAuth2TokenUrl, setApiOAuth2TokenUrl] = useState('')
  const [apiOAuth2ClientId, setApiOAuth2ClientId] = useState('')
  const [apiOAuth2ClientSecret, setApiOAuth2ClientSecret] = useState('')
  const [apiOAuth2Scope, setApiOAuth2Scope] = useState('')
  const [apiOAuth2RedirectUri, setApiOAuth2RedirectUri] = useState('')
  const [apiOAuth2Username, setApiOAuth2Username] = useState('')
  const [apiOAuth2Password, setApiOAuth2Password] = useState('')
  const [apiOAuth2RefreshToken, setApiOAuth2RefreshToken] = useState('')
  const [apiOAuth2AccessToken, setApiOAuth2AccessToken] = useState('')
  const [apiCustomAuth, setApiCustomAuth] = useState('')
  const [apiContentType, setApiContentType] = useState('application/json')
  const [apiCustomHeader, setApiCustomHeader] = useState('')
  const [aiProvider, setAiProvider] = useState<AIProvider>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiBaseUrl, setAiBaseUrl] = useState('http://localhost:11434/v1')
  const [customProviderName, setCustomProviderName] = useState('')

  // Load initial config when modal opens
  useEffect(() => {
    if (isOpen) {
      if (environmentName) {
        setName(environmentName)
      } else {
        setName('')
      }

      if (initialConfig) {
        if (initialConfig.timeout != null) setTimeout_(initialConfig.timeout)
        if (initialConfig.retries != null) setRetries(initialConfig.retries)
        if (initialConfig.workers != null) setWorkers(initialConfig.workers)
        if (initialConfig.baseUrl != null) setBaseUrl(initialConfig.baseUrl)
        if (initialConfig.reporter != null) setReporter(initialConfig.reporter)
        if (initialConfig.apiAuthMethod != null) setApiAuthMethod(initialConfig.apiAuthMethod)
        if (initialConfig.apiAuthToken != null) setApiAuthToken(initialConfig.apiAuthToken)
        if (initialConfig.apiBasicUsername != null) setApiBasicUsername(initialConfig.apiBasicUsername)
        if (initialConfig.apiBasicPassword != null) setApiBasicPassword(initialConfig.apiBasicPassword)
        if (initialConfig.apiKeyName != null) setApiKeyName(initialConfig.apiKeyName)
        if (initialConfig.apiKeyValue != null) setApiKeyValue(initialConfig.apiKeyValue)
        if (initialConfig.apiOAuthToken != null) setApiOAuthToken(initialConfig.apiOAuthToken)
        if (initialConfig.apiOAuth2GrantType != null) setApiOAuth2GrantType(initialConfig.apiOAuth2GrantType)
        if (initialConfig.apiOAuth2AuthUrl != null) setApiOAuth2AuthUrl(initialConfig.apiOAuth2AuthUrl)
        if (initialConfig.apiOAuth2TokenUrl != null) setApiOAuth2TokenUrl(initialConfig.apiOAuth2TokenUrl)
        if (initialConfig.apiOAuth2ClientId != null) setApiOAuth2ClientId(initialConfig.apiOAuth2ClientId)
        if (initialConfig.apiOAuth2ClientSecret != null) setApiOAuth2ClientSecret(initialConfig.apiOAuth2ClientSecret)
        if (initialConfig.apiOAuth2Scope != null) setApiOAuth2Scope(initialConfig.apiOAuth2Scope)
        if (initialConfig.apiOAuth2RedirectUri != null) setApiOAuth2RedirectUri(initialConfig.apiOAuth2RedirectUri)
        if (initialConfig.apiOAuth2Username != null) setApiOAuth2Username(initialConfig.apiOAuth2Username)
        if (initialConfig.apiOAuth2Password != null) setApiOAuth2Password(initialConfig.apiOAuth2Password)
        if (initialConfig.apiOAuth2RefreshToken != null) setApiOAuth2RefreshToken(initialConfig.apiOAuth2RefreshToken)
        if (initialConfig.apiOAuth2AccessToken != null) setApiOAuth2AccessToken(initialConfig.apiOAuth2AccessToken)
        if (initialConfig.apiCustomAuth != null) setApiCustomAuth(initialConfig.apiCustomAuth)
        if (initialConfig.apiContentType != null) setApiContentType(initialConfig.apiContentType)
        if (initialConfig.apiCustomHeader != null) setApiCustomHeader(initialConfig.apiCustomHeader)
        if (initialConfig.aiProvider != null) setAiProvider(initialConfig.aiProvider)
        if (initialConfig.apiKey != null) setApiKey(initialConfig.apiKey)
        if (initialConfig.aiModel != null) setAiModel(initialConfig.aiModel)
        if (initialConfig.aiBaseUrl != null) setAiBaseUrl(initialConfig.aiBaseUrl)
        if (initialConfig.customProviderName != null) setCustomProviderName(initialConfig.customProviderName)
      }
    }
  }, [isOpen, environmentName, initialConfig])

  const handleSave = () => {
    if (!name.trim()) {
      alert('Environment name is required')
      return
    }

    const config: Partial<ProjectConfig> = {
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

    onSave(name.trim().toLowerCase(), config)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      style={{ minHeight: '100vh' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-forge-bg border border-forge-border rounded-xl p-6 w-full max-w-4xl shadow-2xl my-4 max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-semibold mb-4 text-forge-text">
          {environmentName ? `Edit Environment: ${environmentName}` : 'Create New Environment'}
        </h2>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Environment Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
              Environment Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., dev, stage, prod, qa"
              disabled={!!environmentName}
              className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent
                disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) handleSave()
                if (e.key === 'Escape') onClose()
              }}
            />
          </div>

          {/* Playwright Configuration */}
          <section className="border-t border-forge-border pt-4">
            <header className="mb-3">
              <p className="text-[11px] font-mono font-bold tracking-[0.18em] text-forge-muted uppercase">
                Playwright Configuration
              </p>
              <p className="text-[11px] text-forge-dim mt-1">
                Tune how the generated tests run (timeouts, workers, reporter, base URL).
              </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-forge-surface border border-forge-border rounded-xl p-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Timeout
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={timeout}
                    min={1000}
                    onChange={(e) => setTimeout_(Number(e.target.value) || 0)}
                    className="flex-1 bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
                      text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                  />
                  <span className="text-[10px] font-mono text-forge-muted">ms</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Retries
                </label>
                <input
                  type="number"
                  value={retries}
                  min={0}
                  max={5}
                  onChange={(e) => setRetries(Number(e.target.value) || 0)}
                  className="w-24 bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Workers
                </label>
                <input
                  type="number"
                  value={workers}
                  min={1}
                  max={16}
                  onChange={(e) => setWorkers(Number(e.target.value) || 1)}
                  className="w-24 bg-forge-surface2 border border-forge-border rounded-md px-2 py-1.5
                    text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://demo.playwright.dev"
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-accent outline-none focus:border-forge-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Reporter
                </label>
                <select
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value as Reporter)}
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

          {/* AI Provider */}
          <section className="border-t border-forge-border pt-4">
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
                  onChange={(e) => setAiProvider(e.target.value as AIProvider)}
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
                      onChange={(e) => setAiBaseUrl(e.target.value)}
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
                      onChange={(e) => setCustomProviderName(e.target.value)}
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
                    onChange={(e) => setApiKey(e.target.value)}
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
                    onChange={(e) => setAiModel(e.target.value)}
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
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                      text-[11px] font-mono text-forge-accent outline-none focus:border-forge-accent"
                  />
                  <p className="text-[10px] text-forge-dim">
                    OpenAI-compatible chat endpoint (e.g. Ollama, LM Studio).
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* API Authentication & Headers */}
          <section className="border-t border-forge-border pt-4">
            <header className="mb-3">
              <p className="text-[11px] font-mono font-bold tracking-[0.18em] text-forge-muted uppercase">
                API Authentication & Headers
              </p>
              <p className="text-[11px] text-forge-dim mt-1">
                Configure authentication method and headers for generated API tests.
              </p>
            </header>
            <div className="bg-forge-surface border border-forge-border rounded-xl p-4 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Authentication Method
                </label>
                <select
                  value={apiAuthMethod}
                  onChange={(e) => setApiAuthMethod(e.target.value as typeof apiAuthMethod)}
                  className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                    text-[11px] font-mono text-forge-text outline-none cursor-pointer focus:border-forge-accent"
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

              {apiAuthMethod === 'bearer' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                    Bearer Token
                  </label>
                  <input
                    type="password"
                    value={apiAuthToken}
                    onChange={(e) => setApiAuthToken(e.target.value)}
                    placeholder="Enter bearer token..."
                    className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                      text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                  />
                  <p className="text-[10px] text-forge-dim">Token will be sent as: Authorization: Bearer &lt;token&gt;</p>
                </div>
              )}

              {apiAuthMethod === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Username
                    </label>
                    <input
                      type="text"
                      value={apiBasicUsername}
                      onChange={(e) => setApiBasicUsername(e.target.value)}
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
                      onChange={(e) => setApiBasicPassword(e.target.value)}
                      placeholder="Password"
                      className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                        text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                    />
                  </div>
                </div>
              )}

              {apiAuthMethod === 'apikey' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Header Name
                    </label>
                    <input
                      type="text"
                      value={apiKeyName}
                      onChange={(e) => setApiKeyName(e.target.value)}
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
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      placeholder="Enter API key..."
                      className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                        text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                    />
                  </div>
                </div>
              )}

              {apiAuthMethod === 'oauth' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                    OAuth Token
                  </label>
                  <input
                    type="password"
                    value={apiOAuthToken}
                    onChange={(e) => setApiOAuthToken(e.target.value)}
                    placeholder="Enter OAuth access token..."
                    className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                      text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                  />
                  <p className="text-[10px] text-forge-dim">Token will be sent as: Authorization: Bearer &lt;token&gt;</p>
                </div>
              )}

              {apiAuthMethod === 'oauth2' && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Grant Type
                    </label>
                    <select
                      value={apiOAuth2GrantType}
                      onChange={(e) => setApiOAuth2GrantType(e.target.value as typeof apiOAuth2GrantType)}
                      className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                        text-[11px] font-mono text-forge-text outline-none cursor-pointer focus:border-forge-accent"
                    >
                      <option value="client_credentials">Client Credentials</option>
                      <option value="authorization_code">Authorization Code</option>
                      <option value="password">Password (Resource Owner Password)</option>
                      <option value="refresh_token">Refresh Token</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Token URL *
                    </label>
                    <input
                      type="url"
                      value={apiOAuth2TokenUrl}
                      onChange={(e) => setApiOAuth2TokenUrl(e.target.value)}
                      placeholder="https://api.example.com/oauth/token"
                      className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                        text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                    />
                  </div>
                  {apiOAuth2GrantType === 'authorization_code' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                        Authorization URL *
                      </label>
                      <input
                        type="url"
                        value={apiOAuth2AuthUrl}
                        onChange={(e) => setApiOAuth2AuthUrl(e.target.value)}
                        placeholder="https://api.example.com/oauth/authorize"
                        className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                          text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                        Client ID *
                      </label>
                      <input
                        type="text"
                        value={apiOAuth2ClientId}
                        onChange={(e) => setApiOAuth2ClientId(e.target.value)}
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
                        onChange={(e) => setApiOAuth2ClientSecret(e.target.value)}
                        placeholder="your-client-secret"
                        className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                          text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Scope (optional)
                    </label>
                    <input
                      type="text"
                      value={apiOAuth2Scope}
                      onChange={(e) => setApiOAuth2Scope(e.target.value)}
                      placeholder="read write admin"
                      className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                        text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                    />
                    <p className="text-[10px] text-forge-dim">Space or comma separated scopes</p>
                  </div>
                  {apiOAuth2GrantType === 'authorization_code' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                        Redirect URI
                      </label>
                      <input
                        type="url"
                        value={apiOAuth2RedirectUri}
                        onChange={(e) => setApiOAuth2RedirectUri(e.target.value)}
                        placeholder="https://your-app.com/callback"
                        className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                          text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                      />
                    </div>
                  )}
                  {apiOAuth2GrantType === 'password' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                          Username *
                        </label>
                        <input
                          type="text"
                          value={apiOAuth2Username}
                          onChange={(e) => setApiOAuth2Username(e.target.value)}
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
                          onChange={(e) => setApiOAuth2Password(e.target.value)}
                          placeholder="password"
                          className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                            text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                        />
                      </div>
                    </div>
                  )}
                  {apiOAuth2GrantType === 'refresh_token' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                        Refresh Token *
                      </label>
                      <input
                        type="password"
                        value={apiOAuth2RefreshToken}
                        onChange={(e) => setApiOAuth2RefreshToken(e.target.value)}
                        placeholder="your-refresh-token"
                        className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                          text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Access Token (optional - for manual entry)
                    </label>
                    <input
                      type="password"
                      value={apiOAuth2AccessToken}
                      onChange={(e) => setApiOAuth2AccessToken(e.target.value)}
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

              {apiAuthMethod === 'custom' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                    Custom Authorization Header
                  </label>
                  <input
                    type="text"
                    value={apiCustomAuth}
                    onChange={(e) => setApiCustomAuth(e.target.value)}
                    placeholder="Header-Name: value"
                    className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                      text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                  />
                  <p className="text-[10px] text-forge-dim">Format: "Header-Name: value" (e.g., "X-Auth-Token: abc123")</p>
                </div>
              )}

              <div className="border-t border-forge-border/50 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Content-Type
                    </label>
                    <select
                      value={apiContentType}
                      onChange={(e) => setApiContentType(e.target.value)}
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
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                      Additional Custom Header
                    </label>
                    <input
                      type="text"
                      value={apiCustomHeader}
                      onChange={(e) => setApiCustomHeader(e.target.value)}
                      placeholder="X-Custom: value"
                      className="bg-forge-surface2 border border-forge-border rounded-md px-2.5 py-1.5
                        text-[11px] font-mono text-forge-text outline-none focus:border-forge-accent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex gap-3 mt-6 border-t border-forge-border pt-4">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 bg-forge-accent text-forge-bg rounded-md hover:brightness-110
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {environmentName ? 'Save Changes' : 'Create Environment'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-forge-surface2 text-forge-text border border-forge-border rounded-md
              hover:border-forge-accent/50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
