// ─── Domain Types ────────────────────────────────────────────────────────────

export type TestType    = 'ui' | 'api' | 'e2e' | 'performance'
export type BrowserType = 'chromium' | 'firefox' | 'webkit'
export type RunMode     = 'headed' | 'headless'
export type RunStatus   = 'idle' | 'generating' | 'running' | 'pass' | 'fail' | 'error'

// ─── Project Management ──────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  // Project-specific defaults
  defaultUrl?: string
  defaultBaseUrl?: string
  defaultTestType?: TestType
  defaultBrowser?: BrowserType
}

// ─── AI Provider ─────────────────────────────────────────────────────────────

export type AIProvider = 'anthropic' | 'openai' | 'openrouter' | 'glm' | 'local' | 'custom'

// ─── Run Config ──────────────────────────────────────────────────────────────

export interface RunConfig {
  prompt:   string
  url:      string
  testType: TestType
  browser:  BrowserType
  mode:     RunMode
  slowMo:   number
  timeout:  number
  retries:  number
  // Optional advanced Playwright + API config
  workers?:        number
  baseUrl?:        string
  reporter?:       'html' | 'list' | 'dot'
  // API Authentication
  apiAuthMethod?:  'none' | 'bearer' | 'basic' | 'apikey' | 'oauth' | 'oauth2' | 'custom'
  apiAuthToken?:   string  // For bearer token
  apiBasicUsername?: string  // For basic auth
  apiBasicPassword?: string  // For basic auth
  apiKeyName?:     string  // For API key (header name, e.g., 'X-API-Key')
  apiKeyValue?:    string  // For API key (value)
  apiOAuthToken?:  string  // For OAuth token (legacy)
  // OAuth2 Configuration
  apiOAuth2GrantType?: 'client_credentials' | 'authorization_code' | 'password' | 'refresh_token'
  apiOAuth2AuthUrl?: string  // Authorization URL
  apiOAuth2TokenUrl?: string  // Token URL
  apiOAuth2ClientId?: string  // Client ID
  apiOAuth2ClientSecret?: string  // Client Secret
  apiOAuth2Scope?: string  // Scopes (space or comma separated)
  apiOAuth2RedirectUri?: string  // Redirect URI (for authorization_code)
  apiOAuth2Username?: string  // Username (for password grant)
  apiOAuth2Password?: string  // Password (for password grant)
  apiOAuth2RefreshToken?: string  // Refresh token (for refresh_token grant)
  apiOAuth2AccessToken?: string  // Cached access token (optional, for manual entry)
  apiCustomAuth?:  string  // For custom auth (header format: "Header-Name: value")
  apiContentType?: string
  apiCustomHeader?: string
  // AI script generation
  aiProvider?:   AIProvider
  apiKey?:       string   // provider API key (used for selected provider)
  aiModel?:      string   // model name (e.g. gpt-4o, claude-3.5-sonnet)
  aiBaseUrl?:    string   // for local/custom: e.g. http://localhost:8080/v1
  customProviderName?: string   // optional label for custom provider (e.g. "My API")
  // Pre-generated script (skip AI generation if provided)
  script?:        string   // if provided, use this script instead of generating
  autoHeal?:      boolean  // enable auto-healing for failing tests
  maxHealAttempts?: number // maximum number of healing attempts
  testCaseId?:    string   // ID of the test case being run
  environment?:   string   // Runtime environment (dev/stage/prod) for --project flag
}

// ─── Log / Step ──────────────────────────────────────────────────────────────

export interface LogEntry {
  id:        string
  level:     'pass' | 'fail' | 'warn' | 'action' | 'test' | 'step' | 'error' | 'info'
  message:   string
  timestamp: string
}

export interface TestStep {
  id:        string
  name:      string
  status:    'running' | 'pass' | 'fail'
  duration?: number
}

// ─── Saved Test Cases ─────────────────────────────────────────────────────

export interface SavedTestCase {
  id:        string
  name:      string
  prompt:    string
  testType:  TestType
  browser:   BrowserType
  code:      string
  status:    'pass' | 'fail' | 'error' | 'idle'
  createdAt: string
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

export interface TestSuite {
  id:          string
  name:        string
  description?: string
  testCaseIds: string[]  // Array of SavedTestCase IDs
  createdAt:   string
  updatedAt:   string
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface HistoryItem {
  id:        string
  prompt:    string
  testType:  TestType
  browser:   BrowserType
  mode:      RunMode
  status:    'pass' | 'fail'
  duration:  string
  timestamp: Date
  passed:    number
  failed:    number
  reportPath?: string  // Path to HTML report if available
  suiteId?:   string  // ID of test suite if run as part of a suite
  suiteName?: string  // Name of test suite if run as part of a suite
}

// ─── Validation Results ──────────────────────────────────────────────────────

export interface ValidationIssue {
  level: 'error' | 'warning' | 'info'
  message: string
  line?: number
  suggestion?: string
}

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  verified: boolean // Whether LLM verified the code
  verificationMessage?: string
}

// ─── WebSocket Messages ──────────────────────────────────────────────────────

export type BrowserAction = {
  type: 'navigate' | 'click' | 'fill' | 'hover' | 'screenshot' | 'wait' | 'evaluate'
  selector?: string
  text?: string
  url?: string
  timestamp: number
  description: string
}

export type WsMessage =
  | { type: 'connected';  message: string }
  | { type: 'status';     status: RunStatus; message: string }
  | { type: 'script';     code: string }
  | { type: 'log';        level: LogEntry['level']; message: string }
  | { type: 'step_start'; stepId: string; name: string }
  | { type: 'step_end';   stepId: string; status: 'pass' | 'fail'; duration: number }
  | { type: 'progress';   percent: number }
  | { type: 'done';       status: RunStatus; passed: number; failed: number; duration: number; screenshots: string[]; reportPath?: string }
  | { type: 'error';      message: string }
  | { type: 'validation'; result: ValidationResult }
  | { type: 'healed';     testCaseId: string; healedScript: string }
  | { type: 'browser_action'; action: BrowserAction }