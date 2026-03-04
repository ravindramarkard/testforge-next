import { WebSocketServer, WebSocket } from 'ws'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { WsMessage, RunConfig, LogEntry, BrowserAction, ValidationIssue, AIProvider } from '@/types'
import { generateScript, generateAndValidateScript, healScript, executeActionsAndGenerateScript } from './generator'
import { getAllEnvironments, loadProjectConfig, type ProjectConfig } from './projects'

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

      // Handle client disconnection gracefully
      ws.on('close', () => {
        console.log('[WS] Client disconnected')
        // Don't kill the running process - let it complete
        // The process will clean up naturally when it finishes
      })

      ws.on('error', (err) => {
        // Log but don't throw - client disconnections are normal
        console.log('[WS] Client connection error (likely disconnected):', err.message)
      })

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString())
          if (msg.type === 'run')  await handleRun(ws, msg.config as RunConfig, 0)
          if (msg.type === 'stop') handleStop()
        } catch (e: any) {
          // Only send error if connection is still open
          if (ws.readyState === WebSocket.OPEN) {
          send(ws, { type: 'error', message: e.message })
          }
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
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  } catch (err) {
    // Silently ignore errors when sending to closed/disconnected clients
    // This prevents server errors when client refreshes during execution
    console.log('[WS] Failed to send message to client (likely disconnected):', err instanceof Error ? err.message : String(err))
  }
}

function broadcast(msg: WsMessage) {
  if (!global.__testforgeWss) return
  
  // Get all connected clients and filter out closed connections
  const connectedClients = Array.from(global.__testforgeWss.clients).filter(
    (ws) => (ws as WebSocket).readyState === WebSocket.OPEN
  )
  
  // Only send if there are connected clients
  if (connectedClients.length === 0) {
    console.log('[WS] No connected clients to broadcast to')
    return
  }
  
  connectedClients.forEach((ws) => {
    try {
      send(ws as WebSocket, msg)
    } catch (err) {
      // Ignore individual client errors
      console.log('[WS] Failed to broadcast to one client:', err instanceof Error ? err.message : String(err))
    }
  })
}

// ─── Run Handler ─────────────────────────────────────────────────────────────

async function handleRun(ws: WebSocket, config: RunConfig, healAttempt = 0) {
  console.log('[TestForge] Run config:', JSON.stringify({
    aiProvider: config.aiProvider, aiModel: config.aiModel,
    aiBaseUrl: config.aiBaseUrl, hasKey: !!config.apiKey,
    hasScript: !!config.script,
    testCaseId: config.testCaseId,
  }))
  
  let script: string
  const isSavedScript = !!(config.script && config.script.trim())
  
  // If script is provided, use it directly (skip AI generation - NO LLM call)
  if (isSavedScript && config.script) {
    script = config.script.trim()
    send(ws, {
      type: 'status',
      status: 'running',
      message: `🚀 Running saved script (no LLM generation)...`,
    })
    send(ws, { type: 'script', code: script })
    send(ws, { type: 'log', level: 'info', message: `✅ Using saved script directly - NO LLM call (${script.split('\n').length} lines)` })
    send(ws, { type: 'progress', percent: 35 })
  } else {
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

    try {
      // For UI tests: Execute actions with LLM FIRST, then generate script from recorded actions
      const effectiveUrl = config.baseUrl || config.url
      let validation: any
      let actionsAlreadyExecuted = false // Flag to track if actions were already executed
      
      if (effectiveUrl && config.testType === 'ui') {
        send(ws, { type: 'log', level: 'info', message: `🤖 Executing actions on browser with LLM...` })
        send(ws, { type: 'status', status: 'generating', message: `🤖 LLM executing actions on browser...` })
        
        // Execute actions with LLM and generate script from recorded actions
        const result = await executeActionsAndGenerateScript(
          config,
          (msg) => send(ws, msg as WsMessage),
          (level, message) => send(ws, { type: 'log', level: level as LogEntry['level'], message })
        )
        script = result.script
        validation = result.validation
        actionsAlreadyExecuted = true // Actions were already executed by Navigate Agent
      } else {
        // For non-UI tests or when URL is not provided, generate script directly
        send(ws, { type: 'log', level: 'info', message: `🔍 Generating script with LLM...` })
        const result = await generateAndValidateScript(config)
        script = result.script
        validation = result.validation
        actionsAlreadyExecuted = false // Script needs to be executed
      }
      
      // Send validation results
      send(ws, { type: 'validation', result: validation })
      
      // Log validation summary
      if (validation.isValid) {
        send(ws, { type: 'log', level: 'info', message: `✅ Code structure validation passed` })
      } else {
        const errorCount = validation.issues.filter((i: ValidationIssue) => i.level === 'error').length
        const warningCount = validation.issues.filter((i: ValidationIssue) => i.level === 'warning').length
        send(ws, { type: 'log', level: 'warn', message: `⚠️ Validation found ${errorCount} error(s) and ${warningCount} warning(s)` })
        validation.issues.forEach((issue: ValidationIssue) => {
          const level = issue.level === 'error' ? 'error' : 'warn'
          const lineInfo = issue.line ? ` (line ${issue.line})` : ''
          send(ws, { type: 'log', level, message: `${level === 'error' ? '❌' : '⚠️'} ${issue.message}${lineInfo}` })
          if (issue.suggestion) {
            send(ws, { type: 'log', level: 'info', message: `   💡 Suggestion: ${issue.suggestion}` })
          }
        })
      }
      
      // Log LLM verification result
      if (validation.verified) {
        send(ws, { type: 'log', level: 'pass', message: `✅ LLM Verification: ${validation.verificationMessage || 'Script confirmed workable'}` })
      } else if (validation.verificationMessage) {
        send(ws, { type: 'log', level: 'warn', message: `⚠️ LLM Verification: ${validation.verificationMessage}` })
      }
      
      // If there are critical errors, warn but don't block
      const criticalErrors = validation.issues.filter((i: ValidationIssue) => i.level === 'error')
      if (criticalErrors.length > 0) {
        send(ws, { type: 'log', level: 'warn', message: `⚠️ Found ${criticalErrors.length} critical error(s). Script may fail. Review validation results above.` })
      }
      
      send(ws, { type: 'script', code: script })
      send(ws, { type: 'log', level: 'info', message: `✅ Script generated (${script.split('\n').length} lines)` })
      send(ws, { type: 'progress', percent: 100 })
      
      // Script generation complete - no need to execute the script
      // The script is saved and can be executed later if needed
      if (actionsAlreadyExecuted) {
        send(ws, { type: 'log', level: 'info', message: `✅ Actions already executed by Navigate Agent. Script saved for future use.` })
      } else {
        send(ws, { type: 'log', level: 'info', message: `✅ Script generated successfully. Script saved for future use.` })
      }
      
      send(ws, { type: 'status', status: 'pass', message: `✅ Script generation completed` })
      send(ws, { 
        type: 'done', 
        status: 'pass', 
        passed: actionsAlreadyExecuted ? 1 : 0, 
        failed: 0, 
        duration: 0,
        screenshots: []
      })
      return // Exit - script generation complete, no execution needed
      
  } catch (e: any) {
    send(ws, { type: 'error', message: `Script generation failed: ${e.message}` })
    return
  }
  }

  // Script execution code below is now unreachable - kept for reference
  // Scripts are only generated, not executed automatically

  // 2. Write to temp file (inside project so @playwright/test resolves from node_modules)
  // For saved test cases, reuse the same file name based on testCaseId to avoid creating duplicates
  const tmpDir  = path.join(process.cwd(), '.testforge')
  fs.mkdirSync(tmpDir, { recursive: true })
  const tmpFile = config.testCaseId 
    ? path.join(tmpDir, `testforge_${config.testCaseId}.ts`) // Reuse same file for saved test cases
    : path.join(tmpDir, `testforge_${Date.now()}.ts`) // New file for new test cases
  
  // Convert standalone script to @playwright/test format if using environment
  const finalScript = config.environment ? convertToPlaywrightTestFormat(script, config) : script
  fs.writeFileSync(tmpFile, finalScript, 'utf8')

  // 3. Ensure screenshots dir
  const ssDir = path.join(process.cwd(), 'public', 'screenshots')
  fs.mkdirSync(ssDir, { recursive: true })

  // 4. Generate playwright.config.ts with projects for each environment if environment is specified
  const environment = config.environment || 'dev'
  const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  let proc: ChildProcess
  const start = Date.now()
  let passed = 0
  let failed = 0
  const stepMap = new Map<string, string>()
  const logLines: string[] = [] // Track all log lines for analysis

  if (config.environment) {
    // Use npx playwright test --project=<env> when environment is specified
    const configFile = path.join(tmpDir, 'playwright.config.ts')
    
    // Get all environments (default to dev/stage/prod if not available)
    const environments = ['dev', 'stage', 'prod'] // Could be loaded from project config
    const playwrightConfig = generatePlaywrightConfig(environments, config)
    fs.writeFileSync(configFile, playwrightConfig, 'utf8')

    send(ws, { type: 'status', status: 'running', message: `🚀 Running tests with environment: ${environment.toUpperCase()} (${config.browser}, ${config.mode} mode)...` })
    send(ws, { type: 'log', level: 'info', message: `📋 Using Playwright project: ${environment}` })
    send(ws, { type: 'progress', percent: 50 })

    // Run with npx playwright test --project=<env>
    // Use relative path from project root: .testforge/filename.ts
    // When --config is used, Playwright resolves test files relative to the PROJECT ROOT (where --config points from)
    const testFileRelative = `.testforge/${path.basename(tmpFile)}`
    const configFileRelative = path.relative(process.cwd(), configFile).replace(/\\/g, '/')
    
    // Verify file exists before running
    if (!fs.existsSync(tmpFile)) {
      send(ws, { type: 'error', message: `Test file not found: ${tmpFile}` })
      return
    }
    
    // CRITICAL: The test file path MUST come BEFORE --project flag
    // Playwright processes arguments in order:
    // 1. Test file patterns (positional args before flags)
    // 2. Flags (--config, --project, etc.)
    // If test file comes after --project, Playwright treats it as a project filter!
    // Use absolute path to ensure Playwright finds the file
    const testFileAbsolute = path.resolve(tmpFile)
    proc = spawn(runner, [
      'playwright',
      'test',
      testFileAbsolute, // Use absolute path to ensure file is found
      '--config',
      configFileRelative,
      '--project',
      environment,
    ], {
      cwd: process.cwd(), // Run from project root so node_modules can be found
      env: process.env,
      shell: false,
    })
    
    // Log the command for debugging
    const cmdStr = [
      'playwright',
      'test',
      testFileRelative,
      '--config',
      configFileRelative,
      '--project',
      environment,
    ].join(' ')
    console.log('[TestForge] Playwright command:', cmdStr)
    console.log('[TestForge] Test file absolute:', tmpFile)
    console.log('[TestForge] Test file relative:', testFileRelative)
    console.log('[TestForge] Config file:', configFileRelative)
    console.log('[TestForge] CWD:', process.cwd())
    console.log('[TestForge] File exists:', fs.existsSync(tmpFile))
  } else {
    // Fallback to ts-node execution (original behavior)
    send(ws, { type: 'status', status: 'running', message: `🚀 Launching ${config.browser} (${config.mode} mode)...` })
    send(ws, { type: 'progress', percent: 50 })

    // Run with ts-node using dedicated config to avoid TS5109 (module/moduleResolution mismatch)
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.testforge.json')
    proc = spawn(runner, [
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
  }

  global.__testforgeProc = proc

  const onLine = (line: string) => {
    line = line.trim()
    if (!line) return

    logLines.push(line) // Track all lines for later analysis
    
    let level: LogEntry['level'] = 'info'
    const upperLine = line.toUpperCase()
    
    // More flexible pattern matching for pass/fail detection (case-insensitive)
    const isPass = line.includes('✅') || 
                   upperLine.includes('PASSED') || 
                   (upperLine.includes('PASS') && !upperLine.includes('FAIL'))
    const isFail = line.includes('❌') || 
                   upperLine.includes('FAILED') || 
                   (upperLine.includes('FAIL') && !upperLine.includes('PASS')) ||
                   upperLine.includes('ERROR') ||
                   upperLine.includes('TIMEOUT')
    
    if (isPass) { 
      level = 'pass'
      passed++
    } else if (isFail) { 
      level = 'fail'
      failed++
    } else if (line.includes('⚠️'))   level = 'warn'
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

  proc.on('close', async (code) => {
    // Check if there are any connected clients before broadcasting
    const hasClients = global.__testforgeWss && Array.from(global.__testforgeWss.clients).some(
      (ws) => (ws as WebSocket).readyState === WebSocket.OPEN
    )
    
    if (stdoutBuf.trim()) onLine(stdoutBuf)
    if (stderrBuf.trim() && hasClients) {
      broadcast({ type: 'log', level: 'error', message: stderrBuf.trim() })
    }

    const duration = (Date.now() - start) / 1000
    const screenshots = fs.readdirSync(ssDir)
      .filter((f) => /\.(png|jpg|webp)$/i.test(f))
      .sort()

    // Final count: if no tests were explicitly counted, infer from exit code and logs
    let finalPassed = passed
    let finalFailed = failed
    
    // If no tests were counted but script ran, try to infer from logs
    if (finalPassed === 0 && finalFailed === 0) {
      // Check logs for test indicators
      const allLogs = logLines.join(' ').toUpperCase()
      const hasTestIndicators = allLogs.includes('TEST') || 
                                allLogs.includes('🧪') ||
                                logLines.some(l => l.toLowerCase().includes('test'))
      
      if (hasTestIndicators) {
        // If we have test logs but no counts, infer from exit code
        if (code === 0) {
          finalPassed = 1 // At least one test passed if exit code is 0
        } else {
          finalFailed = 1 // At least one test failed if exit code is non-zero
        }
      } else {
        // No test indicators - treat as single execution
        finalPassed = code === 0 ? 1 : 0
        finalFailed = code === 0 ? 0 : 1
      }
    }

    const status = code === 0 ? 'pass' : 'fail'
    
    // Auto-healing: if test failed, try to repair (enabled by default for all script executions)
    // Enable auto-healing by default for any script execution (saved or single), unless explicitly disabled
    const maxHealAttempts = config.maxHealAttempts ?? 3
    // Enable auto-healing by default for any script execution, unless explicitly set to false
    // This means: if autoHeal is undefined/null, default to true; only disable if explicitly false
    const shouldAutoHeal = config.autoHeal !== false
    const shouldHeal = shouldAutoHeal && 
                       status === 'fail' && 
                       healAttempt < maxHealAttempts &&
                       code !== 0
    
    if (shouldHeal) {
      // Collect error logs for healer - be more comprehensive
      const errorLogs = logLines.filter(line => {
        const upper = line.toUpperCase()
        return upper.includes('ERROR') || 
               upper.includes('FAIL') || 
               upper.includes('TIMEOUT') ||
               upper.includes('❌') ||
               upper.includes('EXCEPTION') ||
               upper.includes('THROWN') ||
               upper.includes('AT ') ||
               (upper.includes('ERROR:') || upper.includes('ERR '))
      })
      
      // If no specific error logs found, use all log lines (they might contain useful context)
      const logsForHealing = errorLogs.length > 0 ? errorLogs : logLines.slice(-20)
      
      broadcast({ 
        type: 'log', 
        level: 'warn', 
        message: `🔧 Auto-healing attempt ${healAttempt + 1}/${maxHealAttempts}...` 
      })
      broadcast({
        type: 'log',
        level: 'info',
        message: `📋 Analyzing ${logsForHealing.length} error log line(s) for healing`
      })
      
      try {
        // Check if API key is available for healing
        const provider: AIProvider = config.aiProvider ?? 'anthropic'
        const key = config.apiKey || ''
        if (!key && provider !== 'local') {
          throw new Error(`API key not configured for ${provider}. Please configure AI provider settings to enable auto-healing.`)
        }
        
        broadcast({
          type: 'log',
          level: 'info',
          message: `🤖 Calling healer API (${provider})...`
        })
        
        const healedScript = await healScript(
          script,
          logsForHealing,
          {
            exitCode: code,
            duration,
            screenshots,
            passed: finalPassed,
            failed: finalFailed,
          },
          config
        )
        
        if (!healedScript || !healedScript.trim()) {
          throw new Error('Healer returned empty script')
        }
        
        broadcast({ 
          type: 'log', 
          level: 'info', 
          message: `✅ Healer generated fixed script (${healedScript.split('\n').length} lines)` 
        })
        broadcast({ type: 'script', code: healedScript })
        
        // If this is a saved test case, notify frontend to update it with healed script
        if (config.testCaseId) {
          broadcast({
            type: 'healed',
            testCaseId: config.testCaseId,
            healedScript: healedScript,
          })
          broadcast({
            type: 'log',
            level: 'info',
            message: `💾 Healed script will update the existing test case (no new test case created)`
          })
        } else {
          broadcast({
            type: 'log',
            level: 'info',
            message: `💾 Healed script ready for re-run`
          })
        }
        
        // Don't delete temp file - we'll reuse it for the healed script
        // The file will be overwritten with the healed script in the next handleRun call
        
        // Re-run with healed script (preserve testCaseId for subsequent healing attempts)
        // This will reuse the same temp file since testCaseId is preserved
        broadcast({
          type: 'log',
          level: 'info',
          message: `🔄 Re-running test with healed script...`
        })
        await handleRun(ws, { ...config, script: healedScript, testCaseId: config.testCaseId }, healAttempt + 1)
        return // Don't send 'done' message yet, wait for healed run
      } catch (healErr: any) {
        // Provide detailed error information
        const errorDetails = healErr.message || String(healErr)
        const errorStack = healErr.stack ? `\nStack: ${healErr.stack.split('\n').slice(0, 3).join('\n')}` : ''
        
        broadcast({ 
          type: 'log', 
          level: 'error', 
          message: `❌ Auto-healing failed: ${errorDetails}${errorStack}` 
        })
        
        // Log additional context
        if (errorDetails.includes('API key')) {
          broadcast({
            type: 'log',
            level: 'warn',
            message: `💡 Tip: Configure AI provider settings (API key, model) to enable auto-healing`
          })
        } else if (errorDetails.includes('network') || errorDetails.includes('fetch')) {
          broadcast({
            type: 'log',
            level: 'warn',
            message: `💡 Tip: Check your network connection and AI provider API endpoint`
          })
        }
        
        // Continue to send failure status
      }
    } else if (status === 'fail' && !shouldAutoHeal) {
      // Log why auto-healing is disabled
      broadcast({
        type: 'log',
        level: 'info',
        message: `ℹ️ Auto-healing is disabled (autoHeal=${config.autoHeal}, isSavedScript=${isSavedScript})`
      })
    } else if (status === 'fail' && healAttempt >= maxHealAttempts) {
      broadcast({
        type: 'log',
        level: 'warn',
        message: `⚠️ Maximum healing attempts (${maxHealAttempts}) reached. Stopping auto-healing.`
      })
    }

    // Cleanup temp file
    try { fs.unlinkSync(tmpFile) } catch {}
    
    // Only send final messages if client is still connected
    if (ws.readyState === WebSocket.OPEN) {
    send(ws, { type: 'progress', percent: 100 })
    }
    
    // Broadcast final results only if there are connected clients
    const hasConnectedClients = global.__testforgeWss && Array.from(global.__testforgeWss.clients).some(
      (ws) => (ws as WebSocket).readyState === WebSocket.OPEN
    )
    
    if (hasConnectedClients) {
    broadcast({
      type: 'done',
      status,
        passed: finalPassed,
        failed: finalFailed,
      duration: Math.round(duration * 10) / 10,
      screenshots,
    })
    } else {
      console.log('[TestForge] Test completed but no clients connected to receive results')
    }
  })

  proc.on('error', (err) => {
    broadcast({ type: 'log', level: 'error', message: `❌ Spawn error: ${err.message}` })
    broadcast({ type: 'error', message: err.message })
  })
}

// ─── Generate Playwright Config ────────────────────────────────────────────────

function generatePlaywrightConfig(environments: string[], config: RunConfig): string {
  const projects = environments.map(env => {
    // Load config for this environment if available
    // For now, use the config from RunConfig
    const timeout = config.timeout || 30000
    const retries = config.retries || 2
    const workers = config.workers || 4
    const baseUrl = config.baseUrl || config.url || 'https://demo.playwright.dev'
    const browser = config.browser || 'chromium'
    
    return `    {
      name: '${env}',
      use: {
        browserName: '${browser}',
        baseURL: '${baseUrl}',
        headless: ${config.mode === 'headless' ? 'true' : 'false'},
        ${config.slowMo && config.slowMo > 0 ? `slowMo: ${config.slowMo},` : ''}
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
      timeout: ${timeout},
      retries: ${retries},
      workers: ${workers},
    }`
  }).join(',\n')

  return `import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.testforge',
  testMatch: '**/*.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: '${config.reporter || 'html'}',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
${projects}
  ],
})
`
}

/**
 * Convert standalone Playwright script to @playwright/test format
 */
function convertToPlaywrightTestFormat(script: string, config: RunConfig): string {
  // Find the main function body - match from function declaration to closing brace
  // Handle both runTest() and runTests() patterns
  const lines = script.split('\n')
  let inFunction = false
  let braceCount = 0
  let functionStart = -1
  let functionEnd = -1
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/async\s+function\s+runTest\w*\(\)\s*{/.test(line)) {
      inFunction = true
      functionStart = i + 1
      braceCount = 1
    } else if (inFunction) {
      braceCount += (line.match(/{/g) || []).length
      braceCount -= (line.match(/}/g) || []).length
      if (braceCount === 0) {
        functionEnd = i
        break
      }
    }
  }
  
  if (functionStart > 0 && functionEnd > functionStart) {
    let testBody = lines.slice(functionStart, functionEnd).join('\n')
    
    // Remove browser launch and setup code
    testBody = testBody.replace(/let\s+\w+:\s*Browser\s*\|\s*undefined\s*/g, '')
    testBody = testBody.replace(/browser\s*=\s*await\s+chromium\.launch\([^)]*\)[\s\S]*?\n/g, '')
    testBody = testBody.replace(/const\s+context\s*=\s*await\s+browser\.newContext\(\)[\s\S]*?\n/g, '')
    testBody = testBody.replace(/const\s+page[:\s\w]*=\s*await\s+context\.newPage\(\)[\s\S]*?\n/g, '')
    
    // Remove browser.close() and cleanup code
    testBody = testBody.replace(/await\s+browser\.close\(\)/g, '')
    testBody = testBody.replace(/if\s*\(browser\)\s*{[\s\S]*?await\s+browser\.close\(\)[\s\S]*?}/g, '')
    
    // Remove outer try/catch wrapper (first try and last catch)
    testBody = testBody.replace(/^\s*try\s*{\s*\n/, '')
    // Remove catch block that handles browser cleanup
    testBody = testBody.replace(/\n\s*}\s*catch\s*\([^)]+\)\s*{[\s\S]*?console\.error\([^)]+\)[\s\S]*?if\s*\(browser\)[\s\S]*?}\s*return\s+\d+\s*$/m, '')
    
    // Clean up extra blank lines
    testBody = testBody.replace(/\n{3,}/g, '\n\n').trim()
    
    const testName = (config.prompt?.slice(0, 50) || 'Test').replace(/'/g, "\\'")
    return `import { test, expect } from '@playwright/test'

test('${testName}', async ({ page }) => {
${testBody}
})`
  }
  
  // Fallback: wrap entire script in test()
  const testName = (config.prompt?.slice(0, 50) || 'Test').replace(/'/g, "\\'")
  return `import { test, expect } from '@playwright/test'

test('${testName}', async ({ page }) => {
${script}
})`
}

function handleStop() {
  global.__testforgeProc?.kill('SIGTERM')
  broadcast({ type: 'log', level: 'warn', message: '⛔ Test run stopped by user' })
}
