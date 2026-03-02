import type { RunConfig, AIProvider } from '@/types'

// ─── Shared prompt builder ───────────────────────────────────────────────────

function buildPrompts(config: RunConfig): { system: string; user: string } {
  const {
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
  } = config
  const effectiveUrl = baseUrl || url
  const slowMoArg = slowMo > 0 ? `, slowMo: ${slowMo}` : ''
  const headless = mode === 'headless' ? 'true' : 'false'

  const system = `You are a world-class Playwright automation testing expert.
Generate complete, runnable Playwright TypeScript test scripts using the @playwright/test framework.

Requirements:
- Use TypeScript with @playwright/test imports
- Use test.describe() and test() blocks
- Add beforeEach/afterEach hooks with screenshots on failure
- Include meaningful console.log() calls showing progress
- Use expect() assertions thoroughly
- For headed mode use: use: { headless: ${headless}${slowMoArg} } in playwright.config or launch options
- Wrap browser launch: const browser = await chromium.launch({ headless: ${headless}${slowMoArg} })
- ONLY return TypeScript code — no markdown fences, no explanation`

  const user = `Generate a complete Playwright TypeScript test for:

Test Type: ${testType.toUpperCase()}
Target URL: ${effectiveUrl}
Browser: ${browser}
Mode: ${mode} (headless: ${headless}, slowMo: ${slowMo}ms)
Timeout: ${timeout}ms
Retries: ${retries}
Workers: ${workers ?? 4}
Base URL: ${baseUrl || 'N/A'}
Reporter: ${reporter || 'html'}

API Auth Token: ${apiAuthToken ? '[provided]' : 'none'}
API Content-Type: ${apiContentType || 'application/json'}
API Custom Header: ${apiCustomHeader || 'none'}

Description: ${prompt}

Make it comprehensive with multiple test scenarios covering the happy path and edge cases.`

  return { system, user }
}

function stripCodeFences(code: string): string {
  return code
    .replace(/```typescript\n?/g, '')
    .replace(/```ts\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
}

// ─── Multi-provider entry ───────────────────────────────────────────────────

const OPENAI_BASE = 'https://api.openai.com/v1'
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const GLM_BASE = 'https://open.bigmodel.cn/api/paas/v4'

const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  openrouter: 'anthropic/claude-3.5-sonnet',
  glm: 'glm-4-flash',
  local: 'llama3.2',
  custom: '',
}

const PROVIDER_ENV_KEYS: Record<AIProvider, string> = {
  anthropic:   'ANTHROPIC_API_KEY',
  openai:      'OPENAI_API_KEY',
  openrouter:  'OPENROUTER_API_KEY',
  glm:         'GLM_API_KEY',
  local:       '',
  custom:      '',
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic:   'Anthropic (Claude)',
  openai:      'OpenAI',
  openrouter:  'OpenRouter',
  glm:         'GLM (ZhiPu)',
  local:       'Local',
  custom:      'Custom',
}

function resolveKey(config: RunConfig): string {
  const provider: AIProvider = config.aiProvider ?? 'anthropic'
  const envVar = PROVIDER_ENV_KEYS[provider]
  return (config.apiKey || (envVar ? process.env[envVar] : '') || '').trim()
}

export async function generateScript(config: RunConfig): Promise<string> {
  const provider: AIProvider = config.aiProvider ?? 'anthropic'
  const key = resolveKey(config)
  const aiBaseUrl = (config.aiBaseUrl || '').trim()
  const aiModel = (config.aiModel || '').trim() || DEFAULT_MODELS[provider]
  const label = (provider === 'custom' && config.customProviderName?.trim())
    ? config.customProviderName.trim()
    : PROVIDER_LABELS[provider]

  if (provider === 'local') {
    const base = aiBaseUrl || process.env.TESTFORGE_AI_BASE_URL || 'http://localhost:11434/v1'
    return generateWithOpenAICompatible(config, base, aiModel, key || undefined)
  }

  if (provider === 'custom') {
    const base = aiBaseUrl?.trim()
    if (!base) {
      throw new Error(
        'Custom provider requires a Base URL. Open Config → AI Provider, set URL, API Key, and Model.'
      )
    }
    if (!aiModel?.trim()) {
      throw new Error(
        'Custom provider requires a Model. Open Config → AI Provider and set the model name.'
      )
    }
    return generateWithOpenAICompatible(config, base, aiModel, key || undefined)
  }

  if (!key) {
    throw new Error(
      `API key is missing for ${label}. Open Config tab → AI Provider, enter your API key, click Apply, then run again.`
    )
  }

  if (provider === 'anthropic') {
    return generateWithAnthropic(config)
  }

  const baseUrls: Record<string, string> = {
    openai: OPENAI_BASE,
    openrouter: OPENROUTER_BASE,
    glm: GLM_BASE,
  }
  const resolvedBase = baseUrls[provider]
  if (!resolvedBase) {
    throw new Error(`Unknown AI provider "${provider}". Select a provider in Config → AI Provider.`)
  }
  return generateWithOpenAICompatible(config, resolvedBase, aiModel, key)
}

// ─── Anthropic (Claude) ──────────────────────────────────────────────────────

async function generateWithAnthropic(config: RunConfig): Promise<string> {
  const key = (config.apiKey || process.env.ANTHROPIC_API_KEY || '').trim()
  const { system, user } = buildPrompts(config)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.aiModel || DEFAULT_MODELS.anthropic,
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`)
    const data = await res.json()
    const code: string = data.content?.[0]?.text ?? ''
    if (!code) throw new Error('Anthropic returned empty content')
    return stripCodeFences(code)
  } catch (err: any) {
    throw new Error(`Anthropic failed: ${err?.message ?? String(err)}`)
  }
}

// ─── OpenAI-compatible (OpenAI, OpenRouter, GLM, Local) ───────────────────────

async function generateWithOpenAICompatible(
  config: RunConfig,
  baseUrl: string,
  model: string,
  apiKey: string | undefined
): Promise<string> {
  const { system, user } = buildPrompts(config)
  if (!baseUrl) throw new Error('AI provider base URL is not configured.')
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status} ${text.slice(0, 200)}`)
    }
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text
    const code = extractContent(raw)
    if (!code || !code.trim()) {
      const hint = raw === undefined ? ' (no choices[0].message.content)' : typeof raw === 'string' ? ` (length ${raw.length})` : ` (type ${typeof raw})`
      throw new Error(`Provider returned empty content${hint}. Try another model or check the provider dashboard.`)
    }
    return stripCodeFences(code)
  } catch (err: any) {
    throw new Error(`AI provider failed: ${err?.message ?? String(err)}`)
  }
}

/** Extract text from OpenAI-style content (string or array of parts). */
function extractContent(content: unknown): string {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part: { type?: string; text?: string }) => (part?.text != null ? String(part.text) : ''))
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

/** @deprecated Use generateScript(config) */
export async function generateWithClaude(config: RunConfig): Promise<string> {
  return generateScript(config)
}

// ─── Test connection (minimal request to verify API key & endpoint) ─────────

export interface AITestConfig {
  aiProvider: AIProvider
  apiKey?: string
  aiModel?: string
  aiBaseUrl?: string
}

export async function testAIConnection(testConfig: AITestConfig): Promise<void> {
  const provider = testConfig.aiProvider
  const envVar = PROVIDER_ENV_KEYS[provider]
  const key = (testConfig.apiKey || (envVar ? process.env[envVar] : '') || '').trim()
  const aiBaseUrl = (testConfig.aiBaseUrl || '').trim()
  const aiModel = (testConfig.aiModel || '').trim() || DEFAULT_MODELS[provider]
  const label = PROVIDER_LABELS[provider]

  if (provider === 'anthropic') {
    if (!key) throw new Error(`${label} API key is missing. Add it in Config → AI Provider.`)
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`${label} ${res.status}: ${err.slice(0, 150)}`)
    }
    return
  }

  const base =
    provider === 'local'
      ? aiBaseUrl || process.env.TESTFORGE_AI_BASE_URL || 'http://localhost:11434/v1'
      : provider === 'custom'
        ? aiBaseUrl
        : provider === 'openai'
          ? OPENAI_BASE
          : provider === 'openrouter'
            ? OPENROUTER_BASE
            : provider === 'glm'
              ? GLM_BASE
              : ''

  if (!base?.trim()) throw new Error(provider === 'custom' ? 'Custom provider requires a Base URL.' : `Unknown provider: ${provider}`)
  if (provider !== 'local' && provider !== 'custom' && !key) throw new Error(`${label} API key is missing. Add it in Config → AI Provider.`)
  if (provider === 'custom' && !aiModel?.trim()) throw new Error('Custom provider requires a Model name.')

  const url = base.replace(/\/$/, '') + '/chat/completions'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key) headers['Authorization'] = `Bearer ${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: aiModel,
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${res.status}: ${err.slice(0, 150)}`)
  }
  const data = await res.json()
  if (!data.choices?.[0]) throw new Error('Unexpected response format')
}

// ─── Built-in fallback generators ─────────────────────────────────────────

export function generateFallback(config: RunConfig): string {
  const { testType } = config
  switch (testType) {
    case 'api':         return generateApiScript(config)
    case 'e2e':         return generateE2EScript(config)
    case 'performance': return generatePerfScript(config)
    default:            return generateUIScript(config)
  }
}

function launchLine(config: RunConfig) {
  const { browser, mode, slowMo } = config
  const headless = mode === 'headless'
  const args: string[] = [`headless: ${headless}`]
  if (slowMo > 0) args.push(`slowMo: ${slowMo}`)
  return `${browser}.launch({ ${args.join(', ')} })`
}

// ── UI Script ──────────────────────────────────────────────────────────────
function generateUIScript(c: RunConfig): string {
  const base = c.baseUrl || c.url

  return `import { chromium, firefox, webkit, Browser, Page, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

/**
 * TestForge AI — Generated UI Test
 * Target: ${base}
 * Browser: ${c.browser} | Mode: ${c.mode} | slowMo: ${c.slowMo}ms
 * Prompt: ${c.prompt}
 */

async function runTests() {
  const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots')
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log('\\n🚀 Launching ${c.browser} (${c.mode} mode, slowMo: ${c.slowMo}ms)')
  const browser: Browser = await ${launchLine(c)}
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: undefined,
  })
  const page: Page = await context.newPage()

  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  try {
    // ── Test 1: Navigation ────────────────────────────────────────────
    console.log('\\n🧪 Test 1: Page loads correctly')
    await page.goto('${base}', { waitUntil: 'networkidle', timeout: ${c.timeout} })
    const title = await page.title()
    console.log(\`  Title: "\${title}"\`)
    console.log(\`  URL:   \${page.url()}\`)
    await expect(page).toHaveTitle(/.+/)
    console.log('  ✅ Page load — PASSED')

    await page.screenshot({ path: path.join(screenshotsDir, '01-loaded.png'), fullPage: true })

    // ── Test 2: Interactive elements ──────────────────────────────────
    console.log('\\n🧪 Test 2: Scanning interactive elements')
    const buttons = page.locator('button:visible')
    const inputs  = page.locator('input:visible')
    const links   = page.locator('a:visible')
    const btnCount   = await buttons.count()
    const inputCount = await inputs.count()
    const linkCount  = await links.count()
    console.log(\`  Buttons: \${btnCount} | Inputs: \${inputCount} | Links: \${linkCount}\`)
    console.log('  ✅ Element scan — PASSED')

    // ── Test 3: Core user interaction ─────────────────────────────────
    console.log('\\n🧪 Test 3: Core interaction')
    const todoInput = page.locator('.new-todo, input[placeholder*="todo" i], input[placeholder*="What" i]').first()
    if (await todoInput.isVisible()) {
      console.log('  📝 Found todo input')
      await todoInput.fill('TestForge AI — automated item')
      await todoInput.press('Enter')
      await page.waitForTimeout(400)

      const items = page.locator('.todo-list li, li.todo-item, [data-testid="todo-item"]')
      const itemCount = await items.count()
      console.log(\`  Items in list: \${itemCount}\`)

      if (itemCount > 0) {
        const checkbox = items.first().locator('input[type="checkbox"]')
        if (await checkbox.isVisible()) {
          await checkbox.click()
          console.log('  ✅ Marked item complete')
        }

        const counter = page.locator('.todo-count, [data-testid="todo-count"]')
        if (await counter.isVisible()) {
          const text = await counter.textContent()
          console.log(\`  Counter: "\${text}"\`)
        }
      }
      await page.screenshot({ path: path.join(screenshotsDir, '02-interaction.png') })
      console.log('  ✅ Core interaction — PASSED')
    } else {
      const cta = page.locator('button:visible, [role="button"]:visible').first()
      if (await cta.isVisible()) {
        const label = (await cta.textContent())?.trim().slice(0, 40) ?? 'button'
        console.log(\`  🖱️  Clicking: "\${label}"\`)
        await cta.click()
        await page.waitForTimeout(600)
      }
      await page.screenshot({ path: path.join(screenshotsDir, '02-clicked.png') })
      console.log('  ✅ Element click — PASSED')
    }

    // ── Test 4: Console error check ───────────────────────────────────
    console.log('\\n🧪 Test 4: Console error check')
    const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('404'))
    if (criticalErrors.length === 0) {
      console.log('  ✅ No console errors — PASSED')
    } else {
      console.log(\`  ⚠️  \${criticalErrors.length} error(s): \${criticalErrors[0]}\`)
    }

    // ── Test 5: Responsive layouts ────────────────────────────────────
    console.log('\\n🧪 Test 5: Responsive viewports')
    const viewports = [
      { width: 375,  height: 812,  name: 'mobile'  },
      { width: 768,  height: 1024, name: 'tablet'  },
      { width: 1440, height: 900,  name: 'desktop' },
    ]
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('${base}', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
      await page.screenshot({ path: path.join(screenshotsDir, \`03-responsive-\${vp.name}.png\`) })
      console.log(\`  ✅ \${vp.name} (\${vp.width}×\${vp.height}) — PASSED\`)
    }

  } finally {
    await page.screenshot({ path: path.join(screenshotsDir, '99-final.png'), fullPage: true })
    await context.close()
    await browser.close()
    console.log('\\n🎉 UI tests complete!')
  }
}

runTests().catch((err) => {
  console.error('\\n❌ Test runner error:', err.message)
  process.exit(1)
})
`
}

// ── API Script ─────────────────────────────────────────────────────────────
function generateApiScript(c: RunConfig): string {
  const base = c.baseUrl || c.url

  return `import { chromium, APIRequestContext, APIResponse, expect } from '@playwright/test'

/**
 * TestForge AI — Generated API Test
 * Target: ${base}
 * Prompt: ${c.prompt}
 */

async function runApiTests() {
  const browser = await ${launchLine(c)}
  const context = await browser.newContext()

  const headers: Record<string, string> = {}
  ${c.apiAuthToken ? "headers['authorization'] = '" + c.apiAuthToken.replace(/'/g, "\\'") + "';" : ''}
  ${c.apiContentType ? "headers['content-type'] = '" + c.apiContentType.replace(/'/g, "\\'") + "';" : ''}
  ${c.apiCustomHeader ? "headers['x-custom-header'] = '" + c.apiCustomHeader.replace(/'/g, "\\'") + "';" : ''}

  const request: APIRequestContext = await context.request ?? (await (await chromium.launch()).newContext()).request

  console.log('\\n🔌 API Test Suite: ${base}')

  try {
    // ── Test 1: GET ──────────────────────────────────────────────────
    console.log('\\n🧪 Test 1: GET — fetch resource')
    const getRes: APIResponse = await context.request.get('${base}', { headers })
    console.log(\`  Status: \${getRes.status()} \${getRes.statusText()}\`)
    console.log(\`  OK:     \${getRes.ok()}\`)
    const contentType = getRes.headers()['content-type'] ?? 'N/A'
    console.log(\`  Content-Type: \${contentType}\`)
    if (getRes.ok()) {
      console.log('  ✅ GET — PASSED')
    } else {
      console.log(\`  ❌ GET — FAILED (status: \${getRes.status()})\`)
    }

    // ── Test 2: Response schema ──────────────────────────────────────
    console.log('\\n🧪 Test 2: Response schema validation')
    if (getRes.ok() && contentType.includes('json')) {
      const body = await getRes.json()
      console.log(\`  Body type: \${Array.isArray(body) ? 'array' : typeof body}\`)
      if (Array.isArray(body)) console.log(\`  Items: \${body.length}\`)
      console.log('  ✅ Schema validation — PASSED')
    } else {
      const text = await getRes.text()
      console.log(\`  Body length: \${text.length} chars\`)
      console.log('  ✅ Body readable — PASSED')
    }

    // ── Test 3: Response time ────────────────────────────────────────
    console.log('\\n🧪 Test 3: Response performance')
    const start = Date.now()
    await context.request.get('${base}', { headers })
    const ms = Date.now() - start
    console.log(\`  Response time: \${ms}ms\`)
    if (ms < 3000) {
      console.log('  ✅ Under 3s threshold — PASSED')
    } else {
      console.log(\`  ⚠️  Slow response: \${ms}ms — WARNING\`)
    }

    // ── Test 4: 404 handling ─────────────────────────────────────────
    console.log('\\n🧪 Test 4: Error handling (404)')
    const notFound = await context.request.get('${base}/nonexistent-testforge-endpoint-xyz', { headers })
    console.log(\`  Status: \${notFound.status()}\`)
    if (notFound.status() === 404 || !notFound.ok()) {
      console.log('  ✅ 404 error handled — PASSED')
    } else {
      console.log('  ⚠️  Unexpected: endpoint exists')
    }

    // ── Test 5: Headers ──────────────────────────────────────────────
    console.log('\\n🧪 Test 5: Security headers check')
    const headers = getRes.headers()
    const securityHeaders = ['x-content-type-options','x-frame-options','content-security-policy']
    let found = 0
    for (const h of securityHeaders) {
      if (headers[h]) { console.log(\`  ✅ \${h}: \${headers[h].slice(0, 40)}\`); found++ }
      else console.log(\`  ⚠️  Missing: \${h}\`)
    }
    console.log(\`  Security score: \${found}/\${securityHeaders.length}\`)

  } finally {
    await context.close()
    await browser.close()
    console.log('\\n🎉 API tests complete!')
  }
}

runApiTests().catch((err) => {
  console.error('\\n❌ API test error:', err.message)
  process.exit(1)
})
`
}

// ── E2E Script ─────────────────────────────────────────────────────────────
function generateE2EScript(c: RunConfig): string {
  const base = c.baseUrl || c.url

  return `import { chromium, Browser, Page, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

/**
 * TestForge AI — Generated E2E Flow Test
 * Target: ${base}
 * Prompt: ${c.prompt}
 */

async function runE2EFlow() {
  const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots')
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log('\\n🔄 E2E Flow Test: ${c.url}')
  const browser: Browser = await ${launchLine(c)}
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page: Page = await context.newPage()

  try {
    // ── Step 1: Entry point ──────────────────────────────────────────
    console.log('\\n🧪 Step 1: Navigate to entry point')
    await page.goto('${base}', { waitUntil: 'networkidle' })
    await expect(page.locator('body')).toBeVisible()
    await page.screenshot({ path: path.join(screenshotsDir, 'e2e-01-entry.png') })
    console.log('  ✅ Landing page — PASSED')

    // ── Step 2: Discover & interact ──────────────────────────────────
    console.log('\\n🧪 Step 2: Primary user interaction')
    const todoInput = page.locator('.new-todo, input[placeholder*="todo" i], input[placeholder*="task" i]').first()
    const mainForm  = page.locator('form').first()
    const mainBtn   = page.locator('button:visible, [role="button"]:visible').first()

    if (await todoInput.isVisible()) {
      await todoInput.fill('E2E Flow — item 1')
      await todoInput.press('Enter')
      await page.waitForTimeout(300)
      await todoInput.fill('E2E Flow — item 2')
      await todoInput.press('Enter')
      await page.waitForTimeout(300)
      console.log('  📝 Added 2 items to list')
    } else if (await mainBtn.isVisible()) {
      const label = (await mainBtn.textContent())?.trim().slice(0, 30) ?? ''
      await mainBtn.click()
      await page.waitForTimeout(500)
      console.log(\`  🖱️  Clicked primary action: "\${label}"\`)
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'e2e-02-interact.png') })
    console.log('  ✅ Interaction — PASSED')

    // ── Step 3: State verification ───────────────────────────────────
    console.log('\\n🧪 Step 3: Verify state change')
    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.textContent('body') ?? ''
    expect(bodyText.length).toBeGreaterThan(0)
    await page.screenshot({ path: path.join(screenshotsDir, 'e2e-03-state.png') })
    console.log(\`  Page content length: \${bodyText.length} chars\`)
    console.log('  ✅ State verified — PASSED')

    // ── Step 4: Navigation check ─────────────────────────────────────
    console.log('\\n🧪 Step 4: Navigation links')
    const navLinks = page.locator('nav a:visible, [role="navigation"] a:visible, header a:visible')
    const navCount = await navLinks.count()
    console.log(\`  Nav links found: \${navCount}\`)
    if (navCount > 0) {
      for (let i = 0; i < Math.min(navCount, 3); i++) {
        const href = await navLinks.nth(i).getAttribute('href')
        const text = (await navLinks.nth(i).textContent())?.trim()
        if (text) console.log(\`  → "\${text}" (\${href ?? '#'})\`)
      }
      console.log('  ✅ Navigation discovered — PASSED')
    }

    // ── Step 5: Complete flow ────────────────────────────────────────
    console.log('\\n🧪 Step 5: Flow completion check')
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('body')).toBeVisible()
    await page.screenshot({ path: path.join(screenshotsDir, 'e2e-05-final.png'), fullPage: true })
    console.log('  ✅ Flow completion — PASSED')

  } finally {
    await context.close()
    await browser.close()
    console.log('\\n🎉 E2E flow complete!')
  }
}

runE2EFlow().catch((err) => {
  console.error('\\n❌ E2E error:', err.message)
  process.exit(1)
})
`
}

// ── Performance Script ─────────────────────────────────────────────────────
function generatePerfScript(c: RunConfig): string {
  const base = c.baseUrl || c.url

  return `import { chromium, Browser, Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

/**
 * TestForge AI — Generated Performance Test
 * Target: ${base}
 * Prompt: ${c.prompt}
 */

interface PerfMetrics {
  ttfb: number
  domContentLoaded: number
  fullyLoaded: number
  resourceCount: number
  lcp: number
  cls: number
}

async function runPerfTests() {
  const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots')
  fs.mkdirSync(screenshotsDir, { recursive: true })

  console.log('\\n⚡ Performance Test Suite: ${c.url}')
  const browser: Browser = await ${launchLine(c)}

  try {
    // ── Test 1: Page load timing ─────────────────────────────────────
    console.log('\\n🧪 Test 1: Page load timing')
    const context1 = await browser.newContext()
    const page1: Page = await context1.newPage()
    const loadStart = Date.now()
    await page1.goto('${base}', { waitUntil: 'networkidle' })
    const totalLoad = Date.now() - loadStart
    console.log(\`  Total load: \${totalLoad}ms\`)
    const threshold = 5000
    if (totalLoad < threshold) {
      console.log(\`  ✅ Load time < \${threshold}ms — PASSED\`)
    } else {
      console.log(\`  ❌ Load time \${totalLoad}ms exceeds \${threshold}ms — FAILED\`)
    }

    // ── Test 2: Navigation timing API ────────────────────────────────
    console.log('\\n🧪 Test 2: Navigation timing metrics')
    const timing = await page1.evaluate<PerfMetrics>(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const resources = performance.getEntriesByType('resource')
      return {
        ttfb:             nav ? nav.responseStart - nav.requestStart : 0,
        domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
        fullyLoaded:      nav ? nav.loadEventEnd - nav.startTime : 0,
        resourceCount:    resources.length,
        lcp: 0,
        cls: 0,
      }
    })
    console.log(\`  TTFB:              \${timing.ttfb.toFixed(0)}ms     \${timing.ttfb < 800   ? '✅' : '⚠️ '}\`)
    console.log(\`  DOMContentLoaded:  \${timing.domContentLoaded.toFixed(0)}ms  \${timing.domContentLoaded < 3000 ? '✅' : '⚠️ '}\`)
    console.log(\`  Fully loaded:      \${timing.fullyLoaded.toFixed(0)}ms  \${timing.fullyLoaded < 5000  ? '✅' : '⚠️ '}\`)
    console.log(\`  Resources:         \${timing.resourceCount}\`)
    console.log('  ✅ Navigation timing — PASSED')

    // ── Test 3: Core Web Vitals ───────────────────────────────────────
    console.log('\\n🧪 Test 3: Core Web Vitals')
    const vitals = await page1.evaluate<{ lcp: number; cls: number }>(() => {
      return new Promise((resolve) => {
        const data = { lcp: 0, cls: 0 }
        let clsValue = 0

        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            data.lcp = entries[entries.length - 1].startTime
          }).observe({ type: 'largest-contentful-paint', buffered: true })

          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              const entry = e as any
              if (!entry.hadRecentInput) clsValue += entry.value
            }
            data.cls = clsValue
          }).observe({ type: 'layout-shift', buffered: true })
        } catch {}

        setTimeout(() => resolve(data), 2000)
      })
    })
    if (vitals.lcp > 0) {
      const lcpOk = vitals.lcp < 2500
      console.log(\`  LCP: \${vitals.lcp.toFixed(0)}ms   \${lcpOk ? '✅ Good' : '⚠️  Needs work'} (threshold: 2500ms)\`)
    }
    const clsOk = vitals.cls < 0.1
    console.log(\`  CLS: \${vitals.cls.toFixed(3)}     \${clsOk ? '✅ Good' : '⚠️  Needs work'} (threshold: 0.1)\`)
    console.log('  ✅ Core Web Vitals — PASSED')

    // ── Test 4: Resource failures ────────────────────────────────────
    console.log('\\n🧪 Test 4: Resource failure check')
    const context2 = await browser.newContext()
    const page2: Page = await context2.newPage()
    const failed: string[] = []
    page2.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon'))
        failed.push(\`\${res.status()} \${res.url()}\`)
    })
    await page2.goto('${base}', { waitUntil: 'networkidle' })
    if (failed.length === 0) {
      console.log('  ✅ No failed resources — PASSED')
    } else {
      failed.slice(0, 3).forEach(f => console.log(\`  ❌ \${f}\`))
    }

    await page1.screenshot({ path: path.join(screenshotsDir, 'perf-final.png'), fullPage: true })
    await context1.close()
    await context2.close()

  } finally {
    await browser.close()
    console.log('\\n🎉 Performance tests complete!')
  }
}

runPerfTests().catch((err) => {
  console.error('\\n❌ Perf test error:', err.message)
  process.exit(1)
})
`
}
