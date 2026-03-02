// ─── Domain Types ────────────────────────────────────────────────────────────

export type TestType    = 'ui' | 'api' | 'e2e' | 'performance'
export type BrowserType = 'chromium' | 'firefox' | 'webkit'
export type RunMode     = 'headed' | 'headless'
export type RunStatus   = 'idle' | 'generating' | 'running' | 'pass' | 'fail' | 'error'

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
  apiAuthToken?:   string
  apiContentType?: string
  apiCustomHeader?: string
  // AI script generation
  aiProvider?:   AIProvider
  apiKey?:       string   // provider API key (used for selected provider)
  aiModel?:      string   // model name (e.g. gpt-4o, claude-3.5-sonnet)
  aiBaseUrl?:    string   // for local/custom: e.g. http://localhost:8080/v1
  customProviderName?: string   // optional label for custom provider (e.g. "My API")
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
}

// ─── WebSocket Messages ──────────────────────────────────────────────────────

export type WsMessage =
  | { type: 'connected';  message: string }
  | { type: 'status';     status: RunStatus; message: string }
  | { type: 'script';     code: string }
  | { type: 'log';        level: LogEntry['level']; message: string }
  | { type: 'step_start'; stepId: string; name: string }
  | { type: 'step_end';   stepId: string; status: 'pass' | 'fail'; duration: number }
  | { type: 'progress';   percent: number }
  | { type: 'done';       status: RunStatus; passed: number; failed: number; duration: number; screenshots: string[] }
  | { type: 'error';      message: string }
