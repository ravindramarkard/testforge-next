'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { TestType, BrowserType, RunMode, HistoryItem, AIProvider, SavedTestCase, Project, TestSuite } from '@/types'
import { useWebSocket } from '@/hooks/useWebSocket'
import Sidebar    from '@/components/Sidebar'
import PromptBar  from '@/components/PromptBar'
import CodeViewer from '@/components/CodeViewer'
import LiveLog    from '@/components/LiveLog'
import StepsPanel from '@/components/StepsPanel'
import ConfigPanel from '@/components/ConfigPanel'
import TestCasesPanel from '@/components/TestCasesPanel'
import TestSuitesPanel from '@/components/TestSuitesPanel'
import ProjectSelector from '@/components/ProjectSelector'
import {
  getCurrentProject,
  loadProjectConfig,
  saveProjectConfig,
  loadProjectCases,
  saveProjectCases,
  loadProjectHistory,
  saveProjectHistory,
  loadProjectSuites,
  saveProjectSuites,
  migrateToProjects,
  getCurrentEnvironment,
  setCurrentEnvironment,
  getAllEnvironments,
  createEnvironment,
  deleteEnvironment,
  renameEnvironment,
  type Environment,
  type ProjectConfig,
} from '@/lib/projects'
import clsx from 'clsx'

type TabId = 'script' | 'cases' | 'suites' | 'config' | 'steps'

export default function Dashboard() {
  // ── Project state ─────────────────────────────────────────────────
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  
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
  const [apiAuthMethod, setApiAuthMethod] = useState<'none' | 'bearer' | 'basic' | 'apikey' | 'oauth' | 'oauth2' | 'custom'>('none')
  const [apiAuthToken,   setApiAuthToken]   = useState('')
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
  const [tab,      setTab]      = useState<TabId>('script')
  const [history,  setHistory]  = useState<HistoryItem[]>([])
  const [configSaved, setConfigSaved] = useState(false)
  const [savedCases, setSavedCases] = useState<SavedTestCase[]>([])
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [wsUrl, setWsUrl] = useState<string | null>(null)
  const [wsServerReady, setWsServerReady] = useState(false)
  const [currentEnvironment, setCurrentEnvironment_] = useState<Environment>('dev')
  const [runtimeEnvironment, setRuntimeEnvironment] = useState<Environment>('dev')
  const lastSavedScriptRef = useRef<string | null>(null)
  const runningTestCaseIdRef = useRef<string | null>(null) // Track which test case is currently running

  // ── Load project data when project changes ────────────────────────
  const loadProjectData = useCallback((project: Project | null) => {
    if (!project) {
      // Reset to defaults if no project
      setSavedCases([])
      setHistory([])
      setCurrentEnvironment_('dev')
      setRuntimeEnvironment('dev')
      return
    }

    // Load current environment for this project
    const env = getCurrentEnvironment(project.id)
    setCurrentEnvironment_(env)
    setRuntimeEnvironment(env) // Set runtime environment to current environment by default

    // Load config for current environment
    const saved = loadProjectConfig(project.id, env)
    if (saved) {
      if (saved.timeout != null) setTimeout_(saved.timeout)
      if (saved.retries != null) setRetries(saved.retries)
      if (saved.workers != null) setWorkers(saved.workers)
      if (saved.baseUrl != null) setBaseUrl(saved.baseUrl)
      if (saved.reporter != null) setReporter(saved.reporter)
      if (saved.apiAuthMethod != null) setApiAuthMethod(saved.apiAuthMethod)
      if (saved.apiAuthToken != null) setApiAuthToken(saved.apiAuthToken)
      if (saved.apiBasicUsername != null) setApiBasicUsername(saved.apiBasicUsername)
      if (saved.apiBasicPassword != null) setApiBasicPassword(saved.apiBasicPassword)
      if (saved.apiKeyName != null) setApiKeyName(saved.apiKeyName)
      if (saved.apiKeyValue != null) setApiKeyValue(saved.apiKeyValue)
      if (saved.apiOAuthToken != null) setApiOAuthToken(saved.apiOAuthToken)
      if (saved.apiOAuth2GrantType != null) setApiOAuth2GrantType(saved.apiOAuth2GrantType)
      if (saved.apiOAuth2AuthUrl != null) setApiOAuth2AuthUrl(saved.apiOAuth2AuthUrl)
      if (saved.apiOAuth2TokenUrl != null) setApiOAuth2TokenUrl(saved.apiOAuth2TokenUrl)
      if (saved.apiOAuth2ClientId != null) setApiOAuth2ClientId(saved.apiOAuth2ClientId)
      if (saved.apiOAuth2ClientSecret != null) setApiOAuth2ClientSecret(saved.apiOAuth2ClientSecret)
      if (saved.apiOAuth2Scope != null) setApiOAuth2Scope(saved.apiOAuth2Scope)
      if (saved.apiOAuth2RedirectUri != null) setApiOAuth2RedirectUri(saved.apiOAuth2RedirectUri)
      if (saved.apiOAuth2Username != null) setApiOAuth2Username(saved.apiOAuth2Username)
      if (saved.apiOAuth2Password != null) setApiOAuth2Password(saved.apiOAuth2Password)
      if (saved.apiOAuth2RefreshToken != null) setApiOAuth2RefreshToken(saved.apiOAuth2RefreshToken)
      if (saved.apiOAuth2AccessToken != null) setApiOAuth2AccessToken(saved.apiOAuth2AccessToken)
      if (saved.apiCustomAuth != null) setApiCustomAuth(saved.apiCustomAuth)
      if (saved.apiContentType != null) setApiContentType(saved.apiContentType)
      if (saved.apiCustomHeader != null) setApiCustomHeader(saved.apiCustomHeader)
      if (saved.aiProvider != null) setAiProvider(saved.aiProvider)
      if (saved.apiKey != null) setApiKey(saved.apiKey)
      if (saved.aiModel != null) setAiModel(saved.aiModel)
      if (saved.aiBaseUrl != null) setAiBaseUrl(saved.aiBaseUrl)
      if (saved.customProviderName != null) setCustomProviderName(saved.customProviderName)
    }

    // Load project defaults
    if (project.defaultUrl) setUrl(project.defaultUrl)
    if (project.defaultBaseUrl) setBaseUrl(project.defaultBaseUrl)
    if (project.defaultTestType) setTestType(project.defaultTestType)
    if (project.defaultBrowser) setBrowser(project.defaultBrowser)

    // Load cases, history, and suites
    setSavedCases(loadProjectCases(project.id))
    setHistory(loadProjectHistory(project.id))
    setTestSuites(loadProjectSuites(project.id))
  }, [setTimeout_, setRetries, setWorkers, setBaseUrl, setReporter, setApiAuthMethod, setApiAuthToken, setApiBasicUsername, setApiBasicPassword, setApiKeyName, setApiKeyValue, setApiOAuthToken, setApiCustomAuth, setApiContentType, setApiCustomHeader, setAiProvider, setApiKey, setAiModel, setAiBaseUrl, setCustomProviderName])

  // ── Initialize theme + project system ─────────────────────────────
  useEffect(() => {
    // Theme from localStorage or system preference
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('testforge-theme') as 'dark' | 'light' | null
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      const next = stored || (prefersDark ? 'dark' : 'light')
      setTheme(next)
      document.body.classList.toggle('theme-dark', next === 'dark')
      document.body.classList.toggle('theme-light', next === 'light')
    }

    migrateToProjects()
    const project = getCurrentProject()
    setCurrentProject(project)
    loadProjectData(project)
  }, [loadProjectData])

  // ── Handle environment change ──────────────────────────────────────
  const handleEnvironmentChange = useCallback((env: Environment) => {
    if (!currentProject) return
    
    // Save current environment config before switching
    saveProjectConfig(currentProject.id, {
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
    }, currentEnvironment)
    
    // Set new environment
    setCurrentEnvironment(currentProject.id, env)
    setCurrentEnvironment_(env)
    
    // Load config for new environment
    const saved = loadProjectConfig(currentProject.id, env)
    if (saved) {
      if (saved.timeout != null) setTimeout_(saved.timeout)
      if (saved.retries != null) setRetries(saved.retries)
      if (saved.workers != null) setWorkers(saved.workers)
      if (saved.baseUrl != null) setBaseUrl(saved.baseUrl)
      if (saved.reporter != null) setReporter(saved.reporter)
      if (saved.apiAuthMethod != null) setApiAuthMethod(saved.apiAuthMethod)
      if (saved.apiAuthToken != null) setApiAuthToken(saved.apiAuthToken)
      if (saved.apiBasicUsername != null) setApiBasicUsername(saved.apiBasicUsername)
      if (saved.apiBasicPassword != null) setApiBasicPassword(saved.apiBasicPassword)
      if (saved.apiKeyName != null) setApiKeyName(saved.apiKeyName)
      if (saved.apiKeyValue != null) setApiKeyValue(saved.apiKeyValue)
      if (saved.apiOAuthToken != null) setApiOAuthToken(saved.apiOAuthToken)
      if (saved.apiOAuth2GrantType != null) setApiOAuth2GrantType(saved.apiOAuth2GrantType)
      if (saved.apiOAuth2AuthUrl != null) setApiOAuth2AuthUrl(saved.apiOAuth2AuthUrl)
      if (saved.apiOAuth2TokenUrl != null) setApiOAuth2TokenUrl(saved.apiOAuth2TokenUrl)
      if (saved.apiOAuth2ClientId != null) setApiOAuth2ClientId(saved.apiOAuth2ClientId)
      if (saved.apiOAuth2ClientSecret != null) setApiOAuth2ClientSecret(saved.apiOAuth2ClientSecret)
      if (saved.apiOAuth2Scope != null) setApiOAuth2Scope(saved.apiOAuth2Scope)
      if (saved.apiOAuth2RedirectUri != null) setApiOAuth2RedirectUri(saved.apiOAuth2RedirectUri)
      if (saved.apiOAuth2Username != null) setApiOAuth2Username(saved.apiOAuth2Username)
      if (saved.apiOAuth2Password != null) setApiOAuth2Password(saved.apiOAuth2Password)
      if (saved.apiOAuth2RefreshToken != null) setApiOAuth2RefreshToken(saved.apiOAuth2RefreshToken)
      if (saved.apiOAuth2AccessToken != null) setApiOAuth2AccessToken(saved.apiOAuth2AccessToken)
      if (saved.apiCustomAuth != null) setApiCustomAuth(saved.apiCustomAuth)
      if (saved.apiContentType != null) setApiContentType(saved.apiContentType)
      if (saved.apiCustomHeader != null) setApiCustomHeader(saved.apiCustomHeader)
      if (saved.aiProvider != null) setAiProvider(saved.aiProvider)
      if (saved.apiKey != null) setApiKey(saved.apiKey)
      if (saved.aiModel != null) setAiModel(saved.aiModel)
      if (saved.aiBaseUrl != null) setAiBaseUrl(saved.aiBaseUrl)
      if (saved.customProviderName != null) setCustomProviderName(saved.customProviderName)
    }
  }, [currentProject, currentEnvironment, timeout, retries, workers, baseUrl, reporter, apiAuthMethod, apiAuthToken, apiBasicUsername, apiBasicPassword, apiKeyName, apiKeyValue, apiOAuthToken, apiOAuth2GrantType, apiOAuth2AuthUrl, apiOAuth2TokenUrl, apiOAuth2ClientId, apiOAuth2ClientSecret, apiOAuth2Scope, apiOAuth2RedirectUri, apiOAuth2Username, apiOAuth2Password, apiOAuth2RefreshToken, apiOAuth2AccessToken, apiCustomAuth, apiContentType, apiCustomHeader, aiProvider, apiKey, aiModel, aiBaseUrl, customProviderName])

  // ── Environment management handlers ──────────────────────────────────
  const handleCreateEnvironment = useCallback((name: string): boolean => {
    if (!currentProject) return false
    const newEnv = createEnvironment(currentProject.id, name)
    if (newEnv) {
      // After creating, switch to the new environment
      handleEnvironmentChange(newEnv)
      return true
    }
    return false
  }, [currentProject, handleEnvironmentChange])

  const handleDeleteEnvironment = useCallback((name: string): boolean => {
    if (!currentProject) return false
    const success = deleteEnvironment(currentProject.id, name)
    if (success) {
      // If deleted environment was current, switch to first available
      const remaining = getAllEnvironments(currentProject.id)
      if (remaining.length > 0 && currentEnvironment === name) {
        handleEnvironmentChange(remaining[0])
      }
    }
    return success
  }, [currentProject, currentEnvironment, handleEnvironmentChange])

  const handleRenameEnvironment = useCallback((oldName: string, newName: string): boolean => {
    if (!currentProject) return false
    
    // Check if new name already exists
    const existingEnvs = getAllEnvironments(currentProject.id)
    if (existingEnvs.includes(newName.toLowerCase())) {
      alert(`Environment "${newName}" already exists`)
      return false
    }
    
    const success = renameEnvironment(currentProject.id, oldName, newName.toLowerCase())
    if (success) {
      // Update current environment if it was the renamed one
      if (currentEnvironment === oldName) {
        setCurrentEnvironment_(newName.toLowerCase())
      }
    }
    return success
  }, [currentProject, currentEnvironment])

  const handleSaveEnvironment = useCallback((name: string, config: Partial<ProjectConfig>) => {
    if (!currentProject) return
    
    // Save config for the environment
    saveProjectConfig(currentProject.id, config, name.toLowerCase())
    
    // If this is the current environment, reload it
    if (name.toLowerCase() === currentEnvironment) {
      const saved = loadProjectConfig(currentProject.id, name.toLowerCase())
      if (saved) {
        if (saved.timeout != null) setTimeout_(saved.timeout)
        if (saved.retries != null) setRetries(saved.retries)
        if (saved.workers != null) setWorkers(saved.workers)
        if (saved.baseUrl != null) setBaseUrl(saved.baseUrl)
        if (saved.reporter != null) setReporter(saved.reporter)
        if (saved.apiAuthMethod != null) setApiAuthMethod(saved.apiAuthMethod)
        if (saved.apiAuthToken != null) setApiAuthToken(saved.apiAuthToken)
        if (saved.apiBasicUsername != null) setApiBasicUsername(saved.apiBasicUsername)
        if (saved.apiBasicPassword != null) setApiBasicPassword(saved.apiBasicPassword)
        if (saved.apiKeyName != null) setApiKeyName(saved.apiKeyName)
        if (saved.apiKeyValue != null) setApiKeyValue(saved.apiKeyValue)
        if (saved.apiOAuthToken != null) setApiOAuthToken(saved.apiOAuthToken)
        if (saved.apiOAuth2GrantType != null) setApiOAuth2GrantType(saved.apiOAuth2GrantType)
        if (saved.apiOAuth2AuthUrl != null) setApiOAuth2AuthUrl(saved.apiOAuth2AuthUrl)
        if (saved.apiOAuth2TokenUrl != null) setApiOAuth2TokenUrl(saved.apiOAuth2TokenUrl)
        if (saved.apiOAuth2ClientId != null) setApiOAuth2ClientId(saved.apiOAuth2ClientId)
        if (saved.apiOAuth2ClientSecret != null) setApiOAuth2ClientSecret(saved.apiOAuth2ClientSecret)
        if (saved.apiOAuth2Scope != null) setApiOAuth2Scope(saved.apiOAuth2Scope)
        if (saved.apiOAuth2RedirectUri != null) setApiOAuth2RedirectUri(saved.apiOAuth2RedirectUri)
        if (saved.apiOAuth2Username != null) setApiOAuth2Username(saved.apiOAuth2Username)
        if (saved.apiOAuth2Password != null) setApiOAuth2Password(saved.apiOAuth2Password)
        if (saved.apiOAuth2RefreshToken != null) setApiOAuth2RefreshToken(saved.apiOAuth2RefreshToken)
        if (saved.apiOAuth2AccessToken != null) setApiOAuth2AccessToken(saved.apiOAuth2AccessToken)
        if (saved.apiCustomAuth != null) setApiCustomAuth(saved.apiCustomAuth)
        if (saved.apiContentType != null) setApiContentType(saved.apiContentType)
        if (saved.apiCustomHeader != null) setApiCustomHeader(saved.apiCustomHeader)
        if (saved.aiProvider != null) setAiProvider(saved.aiProvider)
        if (saved.apiKey != null) setApiKey(saved.apiKey)
        if (saved.aiModel != null) setAiModel(saved.aiModel)
        if (saved.aiBaseUrl != null) setAiBaseUrl(saved.aiBaseUrl)
        if (saved.customProviderName != null) setCustomProviderName(saved.customProviderName)
      }
    }
  }, [currentProject, currentEnvironment])

  // ── Get runtime environment config ────────────────────────────────────
  const getRuntimeConfig = useCallback((): Partial<ProjectConfig> => {
    if (!currentProject) return {}
    const envConfig = loadProjectConfig(currentProject.id, runtimeEnvironment)
    if (envConfig) {
      return envConfig
    }
    // Fallback to current config if environment config not found
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
  }, [currentProject, runtimeEnvironment, timeout, retries, workers, baseUrl, reporter, apiAuthMethod, apiAuthToken, apiBasicUsername, apiBasicPassword, apiKeyName, apiKeyValue, apiOAuthToken, apiOAuth2GrantType, apiOAuth2AuthUrl, apiOAuth2TokenUrl, apiOAuth2ClientId, apiOAuth2ClientSecret, apiOAuth2Scope, apiOAuth2RedirectUri, apiOAuth2Username, apiOAuth2Password, apiOAuth2RefreshToken, apiOAuth2AccessToken, apiCustomAuth, apiContentType, apiCustomHeader, aiProvider, apiKey, aiModel, aiBaseUrl, customProviderName])

  // ── Handle project change ──────────────────────────────────────────
  const handleProjectChange = useCallback((project: Project | null) => {
    // Save current project data before switching
    if (currentProject) {
      saveProjectConfig(currentProject.id, {
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
      }, currentEnvironment)
      saveProjectCases(currentProject.id, savedCases)
      saveProjectHistory(currentProject.id, history)
      saveProjectSuites(currentProject.id, testSuites)
    }

    // Switch to new project
    setCurrentProject(project)
    loadProjectData(project)
  }, [currentProject, currentEnvironment, timeout, retries, workers, baseUrl, reporter, apiAuthMethod, apiAuthToken, apiBasicUsername, apiBasicPassword, apiKeyName, apiKeyValue, apiOAuthToken, apiOAuth2GrantType, apiOAuth2AuthUrl, apiOAuth2TokenUrl, apiOAuth2ClientId, apiOAuth2ClientSecret, apiOAuth2Scope, apiOAuth2RedirectUri, apiOAuth2Username, apiOAuth2Password, apiOAuth2RefreshToken, apiOAuth2AccessToken, apiCustomAuth, apiContentType, apiCustomHeader, aiProvider, apiKey, aiModel, aiBaseUrl, customProviderName, savedCases, history, testSuites, loadProjectData])

  // ── Initialize WebSocket server and get port ─────────────────────
  useEffect(() => {
    console.log('[Dashboard] Initializing WebSocket...')
    fetch('/api/init', { cache: 'no-store' })
      .then(res => {
        console.log('[Dashboard] /api/init response:', res.status)
        if (res.ok || res.status === 304) {
          return res.json().catch(() => {
            console.warn('[Dashboard] Failed to parse JSON, using default port')
            return { ok: true, port: 4002 }
          })
        }
        console.warn('[Dashboard] Non-OK response, using default port')
        return { ok: true, port: 4002 }
      })
      .then(data => {
        console.log('[Dashboard] WebSocket init data:', data)
        if (data.ok && data.port) {
          const url = `ws://localhost:${data.port}`
          console.log('[Dashboard] Setting WebSocket URL:', url)
          setWsUrl(url)
          // Small delay to ensure server is ready
          setTimeout(() => {
            console.log('[Dashboard] WebSocket server ready, enabling connection')
            setWsServerReady(true)
          }, 300)
        } else {
          console.error('[Dashboard] Invalid response:', data)
          const url = `ws://localhost:4002`
          console.log('[Dashboard] Using fallback URL:', url)
          setWsUrl(url)
          setTimeout(() => {
            console.log('[Dashboard] WebSocket server ready (fallback), enabling connection')
            setWsServerReady(true)
          }, 300)
        }
      })
      .catch(err => {
        console.error('[Dashboard] WebSocket init error:', err)
        // Fallback to default port
        const url = `ws://localhost:4002`
        console.log('[Dashboard] Using fallback URL after error:', url)
        setWsUrl(url)
        setTimeout(() => {
          console.log('[Dashboard] WebSocket server ready (error fallback), enabling connection')
          setWsServerReady(true)
        }, 300)
      })
  }, [])

  // ── WS ────────────────────────────────────────────────────────────
  // Debug: Log WebSocket URL and ready state
  useEffect(() => {
    console.log('[Dashboard] WebSocket state:', {
      wsUrl,
      wsServerReady,
      willConnect: wsServerReady ? wsUrl : null
    })
  }, [wsUrl, wsServerReady])
  
  const {
    readyState, send, logs, steps, status, progress,
    script, setScript, passed, failed, duration, screenshots, clearLogs,
  } = useWebSocket(wsServerReady ? wsUrl : null, (testCaseId: string, healedScript: string) => {
    // Handle healed scripts - update saved test case with fixed script
    if (!currentProject) return
    setSavedCases((prev) => {
      const next = prev.map((tc) => 
        tc.id === testCaseId 
          ? { ...tc, code: healedScript, status: 'idle' as const } // Reset status for re-run
          : tc
      )
      saveProjectCases(currentProject.id, next)
      return next
    })
    // Update the script in the editor too
    setScript(healedScript)
    lastSavedScriptRef.current = healedScript
    // Keep the runningTestCaseIdRef set so auto-save doesn't create a new test case
    // It will be cleared when the run completes
  })

  // Auto-save script as a test case when it arrives
  // Skip auto-save when running a saved test case (to avoid creating duplicates)
  useEffect(() => {
    if (!script || script === lastSavedScriptRef.current || !currentProject) return
    // Don't auto-save if we're currently running a saved test case (it will be updated via healed callback)
    if (runningTestCaseIdRef.current) return
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
      saveProjectCases(currentProject.id, next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, currentProject])

  // Update latest test case status when run completes
  useEffect(() => {
    if ((status === 'pass' || status === 'fail' || status === 'error') && currentProject) {
      // Type-safe status conversion
      const testStatus: 'pass' | 'fail' | 'error' = status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : 'error'
      // Clear the running test case ref when run completes
      if (runningTestCaseIdRef.current) {
        const testCaseId = runningTestCaseIdRef.current
        runningTestCaseIdRef.current = null
        // Update the specific test case status
        setSavedCases((prev) => {
          const next = prev.map((tc) => 
            tc.id === testCaseId 
              ? { ...tc, status: testStatus }
              : tc
          )
          saveProjectCases(currentProject.id, next)
          return next
        })
      } else {
        // Fallback: update first test case if no specific test case was tracked
        setSavedCases((prev) => {
          if (prev.length === 0) return prev
          const next = [...prev]
          next[0] = { ...next[0], status: testStatus }
          saveProjectCases(currentProject.id, next)
          return next
        })
      }
      setHistory((prev) => {
        // Map testStatus to HistoryItem status ('pass' | 'fail')
        const historyStatus: 'pass' | 'fail' = testStatus === 'pass' ? 'pass' : 'fail'
        const newHistory = [{
          id:        Math.random().toString(36).slice(2),
          prompt:    prompt.slice(0, 60),
          testType,
          browser,
          mode,
          status:    historyStatus,
          duration:  `${duration}s`,
          timestamp: new Date(),
          passed,
          failed,
        }, ...prev]
        saveProjectHistory(currentProject.id, newHistory)
        return newHistory
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentProject])

  // ── Run ───────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (!prompt.trim()) return
    clearLogs()
    setTab('script')
    
    // Get config for runtime environment
    const runtimeConfig = getRuntimeConfig()
    
    send({
      type:   'run',
      config: {
        prompt,
        url,
        testType,
        browser,
        mode,
        slowMo,
        timeout: runtimeConfig.timeout ?? timeout,
        retries: runtimeConfig.retries ?? retries,
        workers: runtimeConfig.workers ?? workers,
        baseUrl: runtimeConfig.baseUrl ?? baseUrl,
        reporter: runtimeConfig.reporter ?? reporter,
        apiAuthMethod: runtimeConfig.apiAuthMethod ?? apiAuthMethod,
        apiAuthToken: runtimeConfig.apiAuthToken ?? apiAuthToken,
        apiBasicUsername: runtimeConfig.apiBasicUsername ?? apiBasicUsername,
        apiBasicPassword: runtimeConfig.apiBasicPassword ?? apiBasicPassword,
        apiKeyName: runtimeConfig.apiKeyName ?? apiKeyName,
        apiKeyValue: runtimeConfig.apiKeyValue ?? apiKeyValue,
        apiOAuthToken: runtimeConfig.apiOAuthToken ?? apiOAuthToken,
        apiOAuth2GrantType: runtimeConfig.apiOAuth2GrantType ?? apiOAuth2GrantType,
        apiOAuth2AuthUrl: runtimeConfig.apiOAuth2AuthUrl ?? apiOAuth2AuthUrl,
        apiOAuth2TokenUrl: runtimeConfig.apiOAuth2TokenUrl ?? apiOAuth2TokenUrl,
        apiOAuth2ClientId: runtimeConfig.apiOAuth2ClientId ?? apiOAuth2ClientId,
        apiOAuth2ClientSecret: runtimeConfig.apiOAuth2ClientSecret ?? apiOAuth2ClientSecret,
        apiOAuth2Scope: runtimeConfig.apiOAuth2Scope ?? apiOAuth2Scope,
        apiOAuth2RedirectUri: runtimeConfig.apiOAuth2RedirectUri ?? apiOAuth2RedirectUri,
        apiOAuth2Username: runtimeConfig.apiOAuth2Username ?? apiOAuth2Username,
        apiOAuth2Password: runtimeConfig.apiOAuth2Password ?? apiOAuth2Password,
        apiOAuth2RefreshToken: runtimeConfig.apiOAuth2RefreshToken ?? apiOAuth2RefreshToken,
        apiOAuth2AccessToken: runtimeConfig.apiOAuth2AccessToken ?? apiOAuth2AccessToken,
        apiCustomAuth: runtimeConfig.apiCustomAuth ?? apiCustomAuth,
        apiContentType: runtimeConfig.apiContentType ?? apiContentType,
        apiCustomHeader: runtimeConfig.apiCustomHeader ?? apiCustomHeader,
        aiProvider: runtimeConfig.aiProvider ?? aiProvider,
        apiKey: runtimeConfig.apiKey ?? apiKey,
        aiModel: runtimeConfig.aiModel ?? aiModel,
        aiBaseUrl: runtimeConfig.aiBaseUrl ?? aiBaseUrl,
        customProviderName: runtimeConfig.customProviderName ?? customProviderName,
        environment: runtimeEnvironment, // Pass runtime environment for --project flag
      },
    })
  }, [
    prompt, url, testType, browser, mode, slowMo, runtimeEnvironment, getRuntimeConfig,
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
    if (!currentProject) return
    setSavedCases((prev) => {
      const next = prev.filter((c) => c.id !== id)
      saveProjectCases(currentProject.id, next)
      return next
    })
  }, [currentProject])

  const handleRenameCase = useCallback((id: string, name: string) => {
    if (!currentProject) return
    setSavedCases((prev) => {
      const next = prev.map((c) => c.id === id ? { ...c, name } : c)
      saveProjectCases(currentProject.id, next)
      return next
    })
  }, [currentProject])

  // Test Suite handlers
  const handleCreateSuite = useCallback((name: string, description?: string, initialTestCaseIds: string[] = []) => {
    if (!currentProject) return
    const suite: TestSuite = {
      id: Math.random().toString(36).slice(2, 10),
      name,
      description,
      testCaseIds: initialTestCaseIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setTestSuites((prev) => {
      const next = [suite, ...prev]
      saveProjectSuites(currentProject.id, next)
      return next
    })
  }, [currentProject])

  const handleUpdateSuite = useCallback((id: string, name: string, description?: string) => {
    if (!currentProject) return
    setTestSuites((prev) => {
      const next = prev.map((s) => 
        s.id === id 
          ? { ...s, name, description, updatedAt: new Date().toISOString() }
          : s
      )
      saveProjectSuites(currentProject.id, next)
      return next
    })
  }, [currentProject])

  const handleDeleteSuite = useCallback((id: string) => {
    if (!currentProject) return
    setTestSuites((prev) => {
      const next = prev.filter((s) => s.id !== id)
      saveProjectSuites(currentProject.id, next)
      return next
    })
  }, [currentProject])

  const handleAddTestCaseToSuite = useCallback((suiteId: string, testCaseId: string) => {
    if (!currentProject) return
    setTestSuites((prev) => {
      const next = prev.map((s) => 
        s.id === suiteId && !s.testCaseIds.includes(testCaseId)
          ? { ...s, testCaseIds: [...s.testCaseIds, testCaseId], updatedAt: new Date().toISOString() }
          : s
      )
      saveProjectSuites(currentProject.id, next)
      return next
    })
  }, [currentProject])

  const handleRemoveTestCaseFromSuite = useCallback((suiteId: string, testCaseId: string) => {
    if (!currentProject) return
    setTestSuites((prev) => {
      const next = prev.map((s) => 
        s.id === suiteId
          ? { ...s, testCaseIds: s.testCaseIds.filter(id => id !== testCaseId), updatedAt: new Date().toISOString() }
          : s
      )
      saveProjectSuites(currentProject.id, next)
      return next
    })
  }, [currentProject])

  const handleRunSuite = useCallback((suite: TestSuite) => {
    // TODO: Implement running all test cases in a suite sequentially
    console.log('Run suite:', suite)
    // For now, just log - can be implemented later to run all test cases
  }, [])

  const handleRunCase = useCallback((tc: SavedTestCase) => {
    clearLogs()
    setTab('script')
    setScript(tc.code)
    lastSavedScriptRef.current = tc.code
    runningTestCaseIdRef.current = tc.id // Track that we're running a saved test case
    
    // Get config for runtime environment
    const runtimeConfig = getRuntimeConfig()
    
    // Run the saved script directly without regenerating
    send({
      type: 'run',
      config: {
        prompt: tc.prompt,
        url, // Use current URL or extract from script if needed
        testType: tc.testType,
        browser: tc.browser,
        mode,
        slowMo,
        timeout: runtimeConfig.timeout ?? timeout,
        retries: runtimeConfig.retries ?? retries,
        workers: runtimeConfig.workers ?? workers,
        baseUrl: runtimeConfig.baseUrl ?? baseUrl,
        reporter: runtimeConfig.reporter ?? reporter,
        apiAuthMethod: runtimeConfig.apiAuthMethod ?? apiAuthMethod,
        apiAuthToken: runtimeConfig.apiAuthToken ?? apiAuthToken,
        apiBasicUsername: runtimeConfig.apiBasicUsername ?? apiBasicUsername,
        apiBasicPassword: runtimeConfig.apiBasicPassword ?? apiBasicPassword,
        apiKeyName: runtimeConfig.apiKeyName ?? apiKeyName,
        apiKeyValue: runtimeConfig.apiKeyValue ?? apiKeyValue,
        apiOAuthToken: runtimeConfig.apiOAuthToken ?? apiOAuthToken,
        apiOAuth2GrantType: runtimeConfig.apiOAuth2GrantType ?? apiOAuth2GrantType,
        apiOAuth2AuthUrl: runtimeConfig.apiOAuth2AuthUrl ?? apiOAuth2AuthUrl,
        apiOAuth2TokenUrl: runtimeConfig.apiOAuth2TokenUrl ?? apiOAuth2TokenUrl,
        apiOAuth2ClientId: runtimeConfig.apiOAuth2ClientId ?? apiOAuth2ClientId,
        apiOAuth2ClientSecret: runtimeConfig.apiOAuth2ClientSecret ?? apiOAuth2ClientSecret,
        apiOAuth2Scope: runtimeConfig.apiOAuth2Scope ?? apiOAuth2Scope,
        apiOAuth2RedirectUri: runtimeConfig.apiOAuth2RedirectUri ?? apiOAuth2RedirectUri,
        apiOAuth2Username: runtimeConfig.apiOAuth2Username ?? apiOAuth2Username,
        apiOAuth2Password: runtimeConfig.apiOAuth2Password ?? apiOAuth2Password,
        apiOAuth2RefreshToken: runtimeConfig.apiOAuth2RefreshToken ?? apiOAuth2RefreshToken,
        apiOAuth2AccessToken: runtimeConfig.apiOAuth2AccessToken ?? apiOAuth2AccessToken,
        apiCustomAuth: runtimeConfig.apiCustomAuth ?? apiCustomAuth,
        apiContentType: runtimeConfig.apiContentType ?? apiContentType,
        apiCustomHeader: runtimeConfig.apiCustomHeader ?? apiCustomHeader,
        aiProvider: runtimeConfig.aiProvider ?? aiProvider,
        apiKey: runtimeConfig.apiKey ?? apiKey,
        aiModel: runtimeConfig.aiModel ?? aiModel,
        aiBaseUrl: runtimeConfig.aiBaseUrl ?? aiBaseUrl,
        customProviderName: runtimeConfig.customProviderName ?? customProviderName,
        script: tc.code, // Pass the saved script to skip generation
        autoHeal: true, // Enable auto-healing for saved test cases (will fix and save)
        testCaseId: tc.id, // Track which test case to update with healed script
        environment: runtimeEnvironment, // Pass runtime environment for --project flag
      },
    })
  }, [
    url, mode, slowMo, runtimeEnvironment, getRuntimeConfig, timeout, retries, workers, baseUrl, reporter,
    apiAuthMethod, apiAuthToken, apiBasicUsername, apiBasicPassword, apiKeyName, apiKeyValue, apiOAuthToken,
    apiOAuth2GrantType, apiOAuth2AuthUrl, apiOAuth2TokenUrl, apiOAuth2ClientId, apiOAuth2ClientSecret,
    apiOAuth2Scope, apiOAuth2RedirectUri, apiOAuth2Username, apiOAuth2Password, apiOAuth2RefreshToken, apiOAuth2AccessToken,
    apiCustomAuth, apiContentType, apiCustomHeader, aiProvider, apiKey,
    aiModel, aiBaseUrl, customProviderName, clearLogs, setScript, send,
  ])

  const handleApplyConfig = useCallback(() => {
    if (!currentProject) return
    saveProjectConfig(currentProject.id, {
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
    }, currentEnvironment)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
  }, [
    currentProject,
    currentEnvironment,
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
  ])

  // Save project data before unmount
  useEffect(() => {
    return () => {
      if (currentProject) {
        saveProjectConfig(currentProject.id, {
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
        })
        saveProjectCases(currentProject.id, savedCases)
        saveProjectHistory(currentProject.id, history)
        saveProjectSuites(currentProject.id, testSuites)
      }
    }
  }, [currentProject, timeout, retries, workers, baseUrl, reporter, apiAuthMethod, apiAuthToken, apiBasicUsername, apiBasicPassword, apiKeyName, apiKeyValue, apiOAuthToken, apiOAuth2GrantType, apiOAuth2AuthUrl, apiOAuth2TokenUrl, apiOAuth2ClientId, apiOAuth2ClientSecret, apiOAuth2Scope, apiOAuth2RedirectUri, apiOAuth2Username, apiOAuth2Password, apiOAuth2RefreshToken, apiOAuth2AccessToken, apiCustomAuth, apiContentType, apiCustomHeader, aiProvider, apiKey, aiModel, aiBaseUrl, customProviderName, savedCases, history, testSuites])

  const isRunning = status === 'generating' || status === 'running'

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: 'dark' | 'light' = prev === 'dark' ? 'light' : 'dark'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('testforge-theme', next)
        document.body.classList.toggle('theme-dark', next === 'dark')
        document.body.classList.toggle('theme-light', next === 'light')
      }
      return next
    })
  }, [])

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
        {/* Left side: Logo + Connected badge */}
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

        {/* Right side: Project Selector + Theme toggle */}
        <div className="ml-auto flex items-center gap-3">
          {/* Project Selector */}
          <ProjectSelector onProjectChange={handleProjectChange} />

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-forge-border bg-forge-surface2 text-[10px] font-mono text-forge-muted hover:border-forge-accent hover:text-forge-accent"
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
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
          {/* Runtime Environment Selector */}
          {currentProject && (
            <div className="bg-forge-surface border-b border-forge-border px-4 py-2 shrink-0">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-forge-muted">
                  Runtime Environment:
                </label>
                <select
                  value={runtimeEnvironment}
                  onChange={(e) => setRuntimeEnvironment(e.target.value as Environment)}
                  className="px-3 py-1.5 rounded-md text-[11px] font-mono font-bold bg-forge-surface2 border border-forge-border
                    text-forge-text outline-none cursor-pointer focus:border-forge-accent transition-colors"
                >
                  {getAllEnvironments(currentProject.id).map((env) => (
                    <option key={env} value={env}>
                      {env.toUpperCase()}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-forge-dim font-mono">
                  Tests will run with {runtimeEnvironment.toUpperCase()} configuration
                </span>
              </div>
            </div>
          )}

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
              ['suites', '📦 Test Suites', testSuites.length > 0 ? String(testSuites.length) : '—'],
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
                onRun={handleRunCase}
              />
            )}
            {tab === 'suites' && (
              <TestSuitesPanel
                suites={testSuites}
                testCases={savedCases}
                onCreate={handleCreateSuite}
                onUpdate={handleUpdateSuite}
                onDelete={handleDeleteSuite}
                onAddTestCase={handleAddTestCaseToSuite}
                onRemoveTestCase={handleRemoveTestCaseFromSuite}
                onRunSuite={handleRunSuite}
              />
            )}
            {tab === 'config' && (
              <ConfigPanel
                timeout={timeout}
                retries={retries}
                workers={workers}
                baseUrl={baseUrl}
                reporter={reporter}
                apiAuthMethod={apiAuthMethod}
                apiAuthToken={apiAuthToken}
                apiBasicUsername={apiBasicUsername}
                apiBasicPassword={apiBasicPassword}
                apiKeyName={apiKeyName}
                apiKeyValue={apiKeyValue}
                apiOAuthToken={apiOAuthToken}
                apiOAuth2GrantType={apiOAuth2GrantType}
                apiOAuth2AuthUrl={apiOAuth2AuthUrl}
                apiOAuth2TokenUrl={apiOAuth2TokenUrl}
                apiOAuth2ClientId={apiOAuth2ClientId}
                apiOAuth2ClientSecret={apiOAuth2ClientSecret}
                apiOAuth2Scope={apiOAuth2Scope}
                apiOAuth2RedirectUri={apiOAuth2RedirectUri}
                apiOAuth2Username={apiOAuth2Username}
                apiOAuth2Password={apiOAuth2Password}
                apiOAuth2RefreshToken={apiOAuth2RefreshToken}
                apiOAuth2AccessToken={apiOAuth2AccessToken}
                apiCustomAuth={apiCustomAuth}
                apiContentType={apiContentType}
                apiCustomHeader={apiCustomHeader}
                aiProvider={aiProvider}
                apiKey={apiKey}
                aiModel={aiModel}
                aiBaseUrl={aiBaseUrl}
                customProviderName={customProviderName}
                currentEnvironment={currentEnvironment}
                availableEnvironments={currentProject ? getAllEnvironments(currentProject.id) : ['dev', 'stage', 'prod']}
                currentProjectId={currentProject?.id}
                onEnvironmentChange={handleEnvironmentChange}
                onCreateEnvironment={handleCreateEnvironment}
                onDeleteEnvironment={handleDeleteEnvironment}
                onRenameEnvironment={handleRenameEnvironment}
                onSaveEnvironment={handleSaveEnvironment}
                onChange={(next) => {
                  if (next.timeout !== undefined) setTimeout_(next.timeout)
                  if (next.retries !== undefined) setRetries(next.retries)
                  if (next.workers !== undefined) setWorkers(next.workers)
                  if (next.baseUrl !== undefined) setBaseUrl(next.baseUrl)
                  if (next.reporter !== undefined) setReporter(next.reporter)
                  if (next.apiAuthMethod !== undefined) setApiAuthMethod(next.apiAuthMethod)
                  if (next.apiAuthToken !== undefined) setApiAuthToken(next.apiAuthToken)
                  if (next.apiBasicUsername !== undefined) setApiBasicUsername(next.apiBasicUsername)
                  if (next.apiBasicPassword !== undefined) setApiBasicPassword(next.apiBasicPassword)
                  if (next.apiKeyName !== undefined) setApiKeyName(next.apiKeyName)
                  if (next.apiKeyValue !== undefined) setApiKeyValue(next.apiKeyValue)
                  if (next.apiOAuthToken !== undefined) setApiOAuthToken(next.apiOAuthToken)
                  if (next.apiOAuth2GrantType !== undefined) setApiOAuth2GrantType(next.apiOAuth2GrantType)
                  if (next.apiOAuth2AuthUrl !== undefined) setApiOAuth2AuthUrl(next.apiOAuth2AuthUrl)
                  if (next.apiOAuth2TokenUrl !== undefined) setApiOAuth2TokenUrl(next.apiOAuth2TokenUrl)
                  if (next.apiOAuth2ClientId !== undefined) setApiOAuth2ClientId(next.apiOAuth2ClientId)
                  if (next.apiOAuth2ClientSecret !== undefined) setApiOAuth2ClientSecret(next.apiOAuth2ClientSecret)
                  if (next.apiOAuth2Scope !== undefined) setApiOAuth2Scope(next.apiOAuth2Scope)
                  if (next.apiOAuth2RedirectUri !== undefined) setApiOAuth2RedirectUri(next.apiOAuth2RedirectUri)
                  if (next.apiOAuth2Username !== undefined) setApiOAuth2Username(next.apiOAuth2Username)
                  if (next.apiOAuth2Password !== undefined) setApiOAuth2Password(next.apiOAuth2Password)
                  if (next.apiOAuth2RefreshToken !== undefined) setApiOAuth2RefreshToken(next.apiOAuth2RefreshToken)
                  if (next.apiOAuth2AccessToken !== undefined) setApiOAuth2AccessToken(next.apiOAuth2AccessToken)
                  if (next.apiCustomAuth !== undefined) setApiCustomAuth(next.apiCustomAuth)
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
