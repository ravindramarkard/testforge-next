import { WebSocketServer, WebSocket } from 'ws'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { WsMessage, RunConfig } from '@/types'
import { generateScript } from './generator'

const WS_PORT = parseInt(process.env.TESTFORGE_WS_PORT || '4002', 10)

// ─── Singleton WS Server ────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __testforgeWss: WebSocketServer | undefined
  var __testforgeProc: ChildProcess | undefined
}

export function getWss(): WebSocketServer {
  if (!global.__testforgeWss) {
    const wss = new WebSocketServer({ port: WS_PORT, host: '0.0.0.0' })
    global.__testforgeWss = wss

    wss.on('connection', (ws: WebSocket) => {
      send(ws, { type: 'connected', message: '⚡ TestForge AI connected' })

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString())
          if (msg.type === 'run')  await handleRun(ws, msg.config as RunConfig)
          if (msg.type === 'stop') handleStop()
        } catch (e: any) {
          send(ws, { type: 'error', message: e.message })
        }
      })
    })

    wss.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') console.error('[WS]', err)
    })

    console.log(`[TestForge] WebSocket server on ws://localhost:${WS_PORT}`)
  }
  return global.__testforgeWss
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function send(ws: WebSocket, msg: WsMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

function broadcast(msg: WsMessage) {
  global.__testforgeWss?.clients.forEach((ws) => send(ws as WebSocket, msg))
}

// ─── Run Handler ─────────────────────────────────────────────────────────────

async function handleRun(ws: WebSocket, config: RunConfig) {
  console.log('[TestForge] Run config:', JSON.stringify({
    aiProvider: config.aiProvider, aiModel: config.aiModel,
    aiBaseUrl: config.aiBaseUrl, hasKey: !!config.apiKey,
  }))
  // 1. Generate script via configured AI provider
  const provider = config.aiProvider ?? 'anthropic'
  const providerLabel = provider === 'custom' && config.customProviderName?.trim()
    ? config.customProviderName.trim()
    : { anthropic: 'Claude', openai: 'OpenAI', openrouter: 'OpenRouter', glm: 'GLM', local: 'Local', custom: 'Custom' }[provider]
  send(ws, {
    type: 'status',
    status: 'generating',
    message: `🤖 Generating Playwright script with ${providerLabel}...`,
  })
  send(ws, { type: 'progress', percent: 10 })

  let script: string
  try {
    script = await generateScript(config)
  } catch (e: any) {
    send(ws, { type: 'error', message: `Script generation failed: ${e.message}` })
    return
  }

  send(ws, { type: 'script', code: script })
  send(ws, { type: 'log', level: 'info', message: `✅ Script generated (${script.split('\n').length} lines)` })
  send(ws, { type: 'progress', percent: 35 })

  // 2. Write to temp file (inside project so @playwright/test resolves from node_modules)
  const tmpDir  = path.join(process.cwd(), '.testforge')
  fs.mkdirSync(tmpDir, { recursive: true })
  const tmpFile = path.join(tmpDir, `testforge_${Date.now()}.ts`)
  fs.writeFileSync(tmpFile, script, 'utf8')

  // 3. Ensure screenshots dir
  const ssDir = path.join(process.cwd(), 'public', 'screenshots')
  fs.mkdirSync(ssDir, { recursive: true })

  send(ws, { type: 'status', status: 'running', message: `🚀 Launching ${config.browser} (${config.mode} mode)...` })
  send(ws, { type: 'progress', percent: 50 })

  // 4. Run with ts-node (or node if compiled)
  const start = Date.now()
  let passed = 0
  let failed = 0
  const stepMap = new Map<string, string>()

  // Run with ts-node using dedicated config to avoid TS5109 (module/moduleResolution mismatch)
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.testforge.json')
  const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const proc = spawn(runner, [
    'ts-node',
    '--project',
    tsconfigPath,
    '--transpile-only',
    tmpFile,
  ], {
    cwd: process.cwd(),
    env: process.env, // Use default Playwright cache (~/Library/Caches/ms-playwright)
    shell: false,
  })

  global.__testforgeProc = proc

  const onLine = (line: string) => {
    line = line.trim()
    if (!line) return

    let level: WsMessage['type'] extends 'log' ? any : never = 'info'
    if (line.includes('✅') || line.includes('PASSED'))  { level = 'pass'; passed++ }
    else if (line.includes('❌') || line.includes('FAILED')) { level = 'fail'; failed++ }
    else if (line.includes('⚠️'))   level = 'warn'
    else if (line.includes('🧪'))   level = 'test'
    else if (line.includes('🚀') || line.includes('🌐') || line.includes('🔌')) level = 'action'
    else if (line.includes('📸') || line.includes('🖱️') || line.includes('📝')) level = 'step'

    broadcast({ type: 'log', level, message: line })
  }

  let stdoutBuf = ''
  let stderrBuf = ''

  proc.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString()
    const parts = stdoutBuf.split('\n')
    stdoutBuf = parts.pop() ?? ''
    parts.forEach(onLine)
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString()
    const parts = stderrBuf.split('\n')
    stderrBuf = parts.pop() ?? ''
    parts.forEach((line) => {
      if (line.trim()) broadcast({ type: 'log', level: 'error', message: line.trim() })
    })
  })

  proc.on('close', (code) => {
    if (stdoutBuf.trim()) onLine(stdoutBuf)
    if (stderrBuf.trim()) broadcast({ type: 'log', level: 'error', message: stderrBuf.trim() })

    // Cleanup temp file
    try { fs.unlinkSync(tmpFile) } catch {}

    const duration = (Date.now() - start) / 1000
    const screenshots = fs.readdirSync(ssDir)
      .filter((f) => /\.(png|jpg|webp)$/i.test(f))
      .sort()

    const status = code === 0 ? 'pass' : 'fail'
    send(ws, { type: 'progress', percent: 100 })
    broadcast({
      type: 'done',
      status,
      passed,
      failed,
      duration: Math.round(duration * 10) / 10,
      screenshots,
    })
  })

  proc.on('error', (err) => {
    broadcast({ type: 'log', level: 'error', message: `❌ Spawn error: ${err.message}` })
    broadcast({ type: 'error', message: err.message })
  })
}

function handleStop() {
  global.__testforgeProc?.kill('SIGTERM')
  broadcast({ type: 'log', level: 'warn', message: '⛔ Test run stopped by user' })
}
