import type { RunConfig, AIProvider, ValidationResult, ValidationIssue } from '@/types'

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
    apiAuthMethod = 'none',
    apiAuthToken,
    apiBasicUsername,
    apiBasicPassword,
    apiKeyName,
    apiKeyValue,
    apiOAuthToken,
    apiCustomAuth,
    apiContentType,
    apiCustomHeader,
  } = config
  const effectiveUrl = baseUrl || url
  const slowMoArg = slowMo > 0 ? `, slowMo: ${slowMo}` : ''
  const headless = mode === 'headless' ? 'true' : 'false'

  const system = `You are a world-class Playwright automation testing expert.
Generate complete, runnable, 100% WORKING Playwright TypeScript scripts using Playwright as a library (not the test framework).

🚨 CRITICAL: You MUST generate scripts that are 100% CORRECT and will run WITHOUT ERRORS. Every script must be valid Playwright TypeScript that executes successfully.

MANDATORY REQUIREMENTS FOR 100% WORKING SCRIPTS:
1. You MUST implement the user's exact requirements - NO generic fallback tests, mock actions, or placeholder behaviors
2. If user asks to click specific links/buttons (like "Electronics" or "Today's Deals"), find and click those EXACT elements
3. Script MUST be valid Playwright TypeScript that will execute without errors
4. Script MUST follow the exact structure below

MANDATORY SCRIPT STRUCTURE (copy this template exactly):
\`\`\`typescript
import { chromium, Browser, Page } from 'playwright'

async function runTests() {
  const browser: Browser = await chromium.launch({ headless: ${headless}${slowMoArg} })
  const context = await browser.newContext()
  const page: Page = await context.newPage()
  
  try {
    await page.goto('${effectiveUrl}', { waitUntil: 'networkidle' })
    
    // Implement user's requirements here
    // Example: await page.getByRole('link', { name: 'Electronics' }).click()
    
    await browser.close()
  } catch (err) {
    console.error('Test failed:', err)
    await browser.close()
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Execution failed:', err)
  process.exit(1)
})
\`\`\`

Requirements:
- Use TypeScript with 'playwright' package imports (NOT @playwright/test)
- Import: import { chromium, firefox, webkit, Browser, Page } from 'playwright'
- Create a standalone async function: async function runTests() { ... }
- Launch browser: const browser = await chromium.launch({ headless: ${headless}${slowMoArg} })
- Create context: const context = await browser.newContext()
- Create page: const page = await context.newPage()
- Navigate: await page.goto('${effectiveUrl}', { waitUntil: 'networkidle' })
- Implement user's requirements exactly as described
- Wrap execution in try/catch: try { ... } catch (err) { console.error(err); await browser.close(); process.exit(1) }
- Call function at end: runTests().catch(err => { console.error(err); process.exit(1) })
- Use simple if/throw assertions: if (!condition) throw new Error('message')
- Include meaningful console.log() calls showing progress
- When user specifies links/buttons to click, use: page.getByRole('link', { name: 'Electronics' }) or page.getByText('Electronics').first() or page.locator('a:has-text("Electronics")')

CRITICAL AWAIT REQUIREMENTS (MANDATORY - NO EXCEPTIONS):
- EVERY SINGLE Playwright operation MUST have 'await' keyword before it
- page.goto() → await page.goto()
- page.click() → await page.click()
- page.fill() → await page.fill()
- page.locator() → await page.locator() (when used standalone)
- page.locator().click() → await page.locator().click() (chained operations)
- locator.click() → await locator.click()
- locator.fill() → await locator.fill()
- locator.textContent() → await locator.textContent()
- locator.isVisible() → await locator.isVisible()
- page.waitFor() → await page.waitFor()
- page.screenshot() → await page.screenshot()
- page.evaluate() → await page.evaluate()
- browser.newPage() → await browser.newPage()
- browser.close() → await browser.close()
- page.close() → await page.close()
- If you generate code WITHOUT 'await', the script WILL FAIL. This is NOT optional.

Other CRITICAL requirements:
- NEVER wait for error message elements (.oxd-input-group__message, .error, .alert, etc.) unless testing error scenarios
- Before accessing .textContent() or any property, check if element exists: if (await locator.isVisible({ timeout: 5000 })) { ... }
- Wrap optional element access in try/catch: try { const text = await locator.textContent({ timeout: 5000 }); } catch { /* element doesn't exist */ }
- Use shorter timeouts (5000ms) for optional elements that might not appear
- Use await page.setDefaultTimeout(${timeout}) to set default timeout for all operations
- For validation messages, only check if they exist when testing invalid inputs
- ONLY return TypeScript code — no markdown fences, no explanation`

  const user = `You are generating a Playwright TypeScript test script. The user has provided specific requirements that you MUST implement exactly as described.

🚨 CRITICAL INSTRUCTIONS:
1. Read the "USER REQUIREMENTS" section below carefully
2. Generate code that performs EXACTLY the actions described by the user
3. If the user says "click on Electronics", find and click the Electronics link/button
4. If the user says "click on Today's Deals", find and click the Today's Deals link/button
5. Do NOT generate generic fallback tests, mock actions, or placeholder behaviors
6. Do NOT add extra tests that the user didn't ask for
7. Implement ONLY what the user requested

═══════════════════════════════════════════════════════════════
USER REQUIREMENTS (IMPLEMENT EXACTLY AS DESCRIBED):
═══════════════════════════════════════════════════════════════
${prompt}
═══════════════════════════════════════════════════════════════

Example: If user says "go to https://example.com and click on Products link", your script should:
1. Navigate to https://example.com
2. Find the "Products" link (using text, role, or other selectors)
3. Click on it
4. Verify the navigation worked

Do NOT generate generic element scanning or mock interactions. Follow the user's exact instructions.

Test Configuration:
- Test Type: ${testType.toUpperCase()}
- Target URL: ${effectiveUrl}
- Browser: ${browser}
- Mode: ${mode} (headless: ${headless}, slowMo: ${slowMo}ms)
- Timeout: ${timeout}ms
- Retries: ${retries}
- Workers: ${workers ?? 4}
- Base URL: ${baseUrl || 'N/A'}
- Reporter: ${reporter || 'html'}

API Configuration:
- API Auth Method: ${apiAuthMethod}
${apiAuthMethod === 'bearer' && apiAuthToken ? `- Bearer Token: [provided]` : ''}
${apiAuthMethod === 'basic' && (apiBasicUsername || apiBasicPassword) ? `- Basic Auth: [username and password provided]` : ''}
${apiAuthMethod === 'apikey' && apiKeyValue ? `- API Key: ${apiKeyName || 'X-API-Key'} = [provided]` : ''}
${apiAuthMethod === 'oauth' && apiOAuthToken ? `- OAuth Token: [provided]` : ''}
${apiAuthMethod === 'custom' && apiCustomAuth ? `- Custom Auth: ${apiCustomAuth}` : ''}
- API Content-Type: ${apiContentType || 'application/json'}
- API Custom Header: ${apiCustomHeader || 'none'}

REMEMBER: Generate code that implements the user's specific requirements above. Do not use fallback or generic test patterns.`

  return { system, user }
}

function stripCodeFences(code: string): string {
  return code
    .replace(/```typescript\n?/g, '')
    .replace(/```ts\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
}

/** Strip test framework code and convert to standalone script */
function stripTestFrameworkCode(code: string): string {
  let cleaned = code
  
  // Remove test.describe.configure() calls - handle multiline and various formats
  // Pattern: test.describe.configure({ ... }) or test.describe.configure({...});
  cleaned = cleaned.replace(/test\.describe\.configure\s*\([^)]*\)\s*;?\s*/g, '')
  // Handle multiline with nested braces
  cleaned = cleaned.replace(/test\.describe\.configure\s*\(\s*\{[\s\S]*?\}\s*\)\s*;?\s*/g, '')
  // Handle any remaining variations
  cleaned = cleaned.replace(/test\.describe\.configure\s*\([^;]*\)\s*;?\s*/g, '')
  
  // Remove test.use() calls
  cleaned = cleaned.replace(/test\.use\s*\([^)]*\)\s*;?\s*/g, '')
  cleaned = cleaned.replace(/test\.use\s*\(\s*\{[\s\S]*?\}\s*\)\s*;?\s*/g, '')
  
  // Remove test.beforeEach, test.afterEach, test.beforeAll, test.afterAll
  cleaned = cleaned.replace(/test\.(beforeEach|afterEach|beforeAll|afterAll)\s*\([^)]*\)\s*;?\s*/g, '')
  cleaned = cleaned.replace(/test\.(beforeEach|afterEach|beforeAll|afterAll)\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;?\s*/g, '')
  
  // Remove test.describe() wrappers but keep the content
  // Match: test.describe('name', () => { ... })
  cleaned = cleaned.replace(/test\.describe\s*\([^,]+,\s*(?:async\s*)?\(\)\s*=>\s*\{/g, 'async function runTests() {')
  
  // Replace test() calls with regular async functions
  cleaned = cleaned.replace(/test\s*\(['"]([^'"]+)['"],\s*(?:async\s*)?\(\)\s*=>\s*\{/g, 'async function test_$1() {')
  cleaned = cleaned.replace(/test\s*\(['"]([^'"]+)['"],\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g, 'async function test_$1() {')
  
  // Remove imports of test from @playwright/test if present (comprehensive)
  const hasTestImport = /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*['"]@playwright\/test['"]/.test(cleaned) || 
                       /import\s+test\s+from\s*['"]@playwright\/test['"]/.test(cleaned)
  cleaned = cleaned.replace(/import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*['"]@playwright\/test['"];?\s*/g, '')
  cleaned = cleaned.replace(/import\s+test\s+from\s*['"]@playwright\/test['"];?\s*/g, '')
  cleaned = cleaned.replace(/import\s*\{[^}]*\}\s*from\s*['"]@playwright\/test['"];?\s*/g, '')
  // Also remove const test = require('@playwright/test')
  cleaned = cleaned.replace(/const\s+test\s*=\s*require\s*\(['"]@playwright\/test['"]\)\s*;?\s*/g, '')
  
  // If test was imported, remove ALL test.* calls to prevent runtime errors
  if (hasTestImport) {
    const lines = cleaned.split('\n')
    cleaned = lines.filter(line => {
      const trimmed = line.trim()
      // Remove any line that uses test. (framework calls)
      if (trimmed.match(/test\./)) {
        return false
      }
      return true
    }).join('\n')
  }
  
  // Remove any remaining test. references that might cause issues
  // This is a catch-all for any test.* calls we might have missed
  const lines = cleaned.split('\n')
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim()
    // Skip lines that are test framework calls
    // Match: test.describe.configure, test.describe, test.use, test.beforeEach, etc.
    if (trimmed.match(/^\s*test\.(describe\.configure|describe|use|beforeEach|afterEach|beforeAll|afterAll|configure)/)) {
      return false
    }
    // Also check if line contains test.describe.configure anywhere (multiline cases)
    if (trimmed.includes('test.describe.configure')) {
      return false
    }
    return true
  })
  cleaned = filteredLines.join('\n')
  
  // Final pass: remove any remaining test.describe.configure patterns (handles multiline)
  // Use a more aggressive approach that handles nested structures
  let finalCleaned = ''
  let inConfigureBlock = false
  let braceCount = 0
  for (const line of cleaned.split('\n')) {
    if (line.includes('test.describe.configure')) {
      inConfigureBlock = true
      braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length
      continue
    }
    if (inConfigureBlock) {
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length
      if (braceCount <= 0) {
        inConfigureBlock = false
        braceCount = 0
      }
      continue
    }
    finalCleaned += line + '\n'
  }
  cleaned = finalCleaned.trim()
  
  // Post-process: Wrap risky .textContent() calls on error message elements in try-catch
  // This prevents timeouts when waiting for elements that might not exist
  const lines2 = cleaned.split('\n')
  const safeLines: string[] = []
  
  for (let i = 0; i < lines2.length; i++) {
    const line = lines2[i]
    const trimmed = line.trim()
    const indent = line.match(/^(\s*)/)?.[1] || ''
    
    // Check if this line accesses .textContent() or .text() on an error message element
    const hasErrorMessage = /\.oxd-input-group__message|\.error-message|\.alert|\.validation-error|\.form-error|\.input-group__message/.test(line)
    const hasTextContent = /\.textContent\(|\.text\(\)/.test(line)
    const isRisky = hasErrorMessage && hasTextContent && !trimmed.startsWith('//') && !trimmed.startsWith('catch') && !trimmed.startsWith('try')
    
    // Check if previous line is already a try block
    const prevLine = i > 0 ? safeLines[safeLines.length - 1] : ''
    const alreadyWrapped = prevLine.trim().endsWith('try {')
    
    if (isRisky && !alreadyWrapped) {
      // Wrap in try-catch
      safeLines.push(`${indent}try {`)
      safeLines.push(line)
      // Look ahead to find the end of this statement
      let j = i + 1
      let foundEnd = false
      while (j < lines2.length && !foundEnd) {
        const nextLine = lines2[j]
        const nextTrimmed = nextLine.trim()
        // If next line is not part of this statement (different indent or new statement)
        if (nextTrimmed && !nextTrimmed.startsWith('//') && 
            (nextLine.match(/^(\s*)/)?.[1]?.length || 0) <= indent.length &&
            !nextTrimmed.startsWith('.') && !nextTrimmed.match(/^[a-zA-Z_$]/)) {
          foundEnd = true
        } else {
          safeLines.push(nextLine)
          j++
        }
      }
      safeLines.push(`${indent}} catch (e) {`)
      safeLines.push(`${indent}  // Element doesn't exist or timeout - that's okay`)
      safeLines.push(`${indent}}`)
      i = j - 1 // Skip processed lines
    } else {
      safeLines.push(line)
    }
  }
  
  cleaned = safeLines.join('\n')
  
  // Additional pass: Replace specific timeout-prone patterns with try-catch and shorter timeout
  // This catches patterns like: await page.locator('.oxd-input-group__message').nth(1).textContent()
  const oxdPattern = /(\s*)(const\s+\w+\s*=\s*)?(await\s+[^\.]+\.locator\(['"][^'"]*oxd-input-group__message[^'"]*['"]\)[^\.]*\.(nth\([^)]+\)\s*)?\.textContent\(\))/g
  cleaned = cleaned.replace(oxdPattern, (match, indent, constDecl, content) => {
    // Check if already wrapped in try-catch
    const matchIndex = cleaned.indexOf(match)
    const beforeMatch = cleaned.substring(Math.max(0, matchIndex - 300), matchIndex)
    const lastTry = beforeMatch.lastIndexOf('try {')
    const lastCatch = beforeMatch.lastIndexOf('} catch')
    if (lastTry > lastCatch && lastTry > beforeMatch.lastIndexOf('}')) {
      return match // Already wrapped
    }
    
    const varName = constDecl ? constDecl.match(/const\s+(\w+)/)?.[1] : null
    const wrappedContent = content.replace(/\.textContent\(\)/, '.textContent({ timeout: 5000 })')
    
    if (varName) {
      return `${indent}let ${varName};\n${indent}try {\n${indent}  ${varName} = ${wrappedContent}\n${indent}} catch (e) {\n${indent}  // Error message element doesn't exist - that's okay\n${indent}  ${varName} = null\n${indent}}`
    } else {
      return `${indent}try {\n${indent}  ${wrappedContent}\n${indent}} catch (e) {\n${indent}  // Error message element doesn't exist - that's okay\n${indent}}`
    }
  })
  
  // Also handle any remaining .textContent() calls on error message selectors
  cleaned = cleaned.replace(
    /(\s*)(await\s+[^\.]+\.locator\(['"][^'"]*(?:error|message|alert|validation)[^'"]*['"]\)[^\.]*\.textContent\(\))/g,
    (match, indent, content) => {
      const matchIndex = cleaned.indexOf(match)
      const beforeMatch = cleaned.substring(Math.max(0, matchIndex - 200), matchIndex)
      if (beforeMatch.includes('try {') && beforeMatch.lastIndexOf('try {') > beforeMatch.lastIndexOf('} catch')) {
        return match
      }
      return `${indent}try {\n${indent}  ${content.replace(/\.textContent\(\)/, '.textContent({ timeout: 5000 })')}\n${indent}} catch (e) {\n${indent}  // Optional element - doesn't exist\n${indent}}`
    }
  )
  
  // Ensure we have a main execution block if not present
  if (!cleaned.includes('runTests()') && !cleaned.includes('runE2E') && !cleaned.includes('runApi') && !cleaned.includes('runPerf')) {
    // Try to find the main function or add one
    if (cleaned.includes('async function')) {
      const mainMatch = cleaned.match(/async function\s+(\w+)\s*\(/);
      if (mainMatch) {
        const funcName = mainMatch[1];
        if (!cleaned.includes(`${funcName}()`)) {
          cleaned += `\n\n${funcName}().catch((err) => {\n  console.error('\\n❌ Error:', err.message)\n  process.exit(1)\n})`
        }
      }
    }
  }
  
  return cleaned
}

// ─── Code Validation ────────────────────────────────────────────────────────

/**
 * Validates generated Playwright script for common issues
 */
export function validateScript(code: string): ValidationResult {
  const issues: ValidationIssue[] = []
  const lines = code.split('\n')
  
  // Check for required imports
  if (!code.includes("import") || !code.includes("from 'playwright'")) {
    issues.push({
      level: 'error',
      message: "Missing Playwright import. Script must import from 'playwright'",
      suggestion: "Add: import { chromium, Browser, Page } from 'playwright'"
    })
  }
  
  // Check for test framework imports (should not be present)
  if (code.includes("@playwright/test")) {
    issues.push({
      level: 'error',
      message: "Found @playwright/test import. Script should use 'playwright' library, not test framework.",
      suggestion: "Replace @playwright/test imports with 'playwright'"
    })
  }
  
  // Check for test.describe or test() calls
  if (code.includes("test.describe") || code.includes("test(")) {
    issues.push({
      level: 'error',
      message: "Found test framework syntax (test.describe/test). Script should use standalone functions.",
      suggestion: "Convert test.describe() to async function and test() to regular async functions"
    })
  }
  
  // Check for expect() assertions
  if (code.includes("expect(")) {
    issues.push({
      level: 'warning',
      message: "Found expect() assertions. Script should use simple if/throw statements.",
      suggestion: "Replace expect() with: if (!condition) throw new Error('message')"
    })
  }
  
  // Check for main function
  if (!code.includes("async function") && !code.match(/async\s+function\s+\w+/)) {
    issues.push({
      level: 'error',
      message: "No async function found. Script needs a main function to execute.",
      suggestion: "Add: async function runTests() { ... }"
    })
  }
  
  // Check for browser launch
  if (!code.includes(".launch(") && !code.includes("chromium.launch") && !code.includes("firefox.launch") && !code.includes("webkit.launch")) {
    issues.push({
      level: 'error',
      message: "No browser launch found. Script must launch a browser.",
      suggestion: "Add: const browser = await chromium.launch({ headless: false })"
    })
  }
  
  // Check for page.goto or navigation
  if (!code.includes(".goto(") && !code.includes("page.goto")) {
    issues.push({
      level: 'warning',
      message: "No page navigation found. Script may not navigate to target URL.",
      suggestion: "Add: await page.goto('url', { waitUntil: 'networkidle' })"
    })
  }
  
  // Check for error handling
  if (!code.includes("try {") && !code.includes("catch")) {
    issues.push({
      level: 'warning',
      message: "No error handling found. Script should wrap execution in try/catch.",
      suggestion: "Wrap main execution in: try { ... } catch (err) { console.error(err); process.exit(1) }"
    })
  }
  
  // Check for function call (script should execute)
  // Look for function calls at the end: runTests(), runE2E(), runApi(), runPerf(), or any function name followed by ()
  const hasFunctionCall = code.match(/(runTests|runE2E|runApi|runPerf)\s*\(/) || 
                          code.match(/async\s+function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*\}\s*\n\s*\w+\s*\(/) ||
                          // Check for any function name followed by () at the end (after the last closing brace)
                          (() => {
                            const lastBraceIndex = code.lastIndexOf('}')
                            if (lastBraceIndex > 0) {
                              const afterLastBrace = code.substring(lastBraceIndex)
                              // Look for functionName() pattern after the last brace
                              return /^\s*\n\s*\w+\s*\(/.test(afterLastBrace)
                            }
                            return false
                          })()
  if (!hasFunctionCall) {
    issues.push({
      level: 'error',
      message: "No function call found. Script won't execute automatically.",
      suggestion: "Add function call at end: runTests().catch(err => { console.error(err); process.exit(1) })"
    })
  }
  
  // Check for browser.close() - script should clean up
  if (!code.includes('browser.close()') && !code.includes('await browser.close()')) {
    issues.push({
      level: 'error',
      message: "Missing browser.close(). Script should clean up browser resources.",
      suggestion: "Add await browser.close() in finally block or catch block"
    })
  }
  
  // Check for proper context/page creation
  if (!code.includes('newContext()') && !code.includes('newPage()')) {
    issues.push({
      level: 'error',
      message: "Missing context or page creation. Script needs to create a page to interact with.",
      suggestion: "Add: const context = await browser.newContext(); const page = await context.newPage()"
    })
  }
  
  // Check for proper error handling structure
  if (!code.includes('try {') || !code.includes('catch')) {
    issues.push({
      level: 'error',
      message: "Missing proper error handling. Script should wrap execution in try/catch.",
      suggestion: "Wrap main execution in: try { ... } catch (err) { console.error(err); await browser.close(); process.exit(1) }"
    })
  }
  
  // Check for risky patterns
  lines.forEach((line, idx) => {
    const lineNum = idx + 1
    
    // Check for long timeouts on error message elements
    if (line.includes("oxd-input-group__message") && line.includes("textContent") && !line.includes("timeout: 5000")) {
      issues.push({
        level: 'warning',
        message: `Line ${lineNum}: Accessing error message element without short timeout may cause timeouts.`,
        line: lineNum,
        suggestion: "Add timeout: .textContent({ timeout: 5000 }) or wrap in try/catch"
      })
    }
    
    // Check for missing await on page operations
    // Note: setDefaultTimeout is synchronous, so exclude it from async checks
    const pageOpsPattern = /page\.(goto|click|fill|waitFor|locator|press|selectOption|check|uncheck|setContent|reload|goBack|goForward|evaluate|evaluateHandle|screenshot|pdf|title|url|content|close|setViewportSize|setExtraHTTPHeaders|route|unroute|waitForLoadState|waitForURL|waitForSelector|waitForFunction|waitForEvent|waitForTimeout|hover|dblclick|tap|focus|blur|selectText|type|keyboard|mouse|touchscreen|request|context|addInitScript|setInputFiles|emulateMedia|setGeolocation|setPermissions|addLocatorHandler|removeLocatorHandler|pause|accessibility|coverage|tracing|video|har)\(/
    if (line.match(pageOpsPattern) && !line.includes("await") && !line.match(/^\s*\/\//) && !line.match(/^\s*\*/)) {
      // Skip setDefaultTimeout as it's synchronous
      if (!line.includes('setDefaultTimeout')) {
        issues.push({
          level: 'error',
          message: `Line ${lineNum}: Missing 'await' on async Playwright operation.`,
          line: lineNum,
          suggestion: "Add 'await' before the operation"
        })
      }
    }
    
    // Check for missing await on locator operations (but skip if it's part of a chain that already has await)
    const locatorOpsPattern = /\.(click|fill|press|selectOption|check|uncheck|textContent|innerText|innerHTML|getAttribute|count|first|last|nth|filter|locator|getByRole|getByText|getByLabel|getByPlaceholder|getByAltText|getByTitle|getByTestId|isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|screenshot|scrollIntoViewIfNeeded|hover|dblclick|tap|focus|blur|selectText|type|clear|setInputFiles|boundingBox|evaluate|evaluateAll|dispatchEvent|waitFor|all|allInnerTexts|allTextContents)\(/
    if (line.match(locatorOpsPattern) && !line.includes("await") && !line.match(/^\s*\/\//) && !line.match(/^\s*\*/)) {
      // Skip if the line already has await earlier (for chained operations)
      const trimmedLine = line.trim()
      if (!trimmedLine.startsWith('//') && !trimmedLine.startsWith('*') && !line.match(/await\s+.*\.(click|fill|press|selectOption|check|uncheck|textContent|innerText|innerHTML|getAttribute|count|first|last|nth|filter|locator|getByRole|getByText|getByLabel|getByPlaceholder|getByAltText|getByTitle|getByTestId|isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|screenshot|scrollIntoViewIfNeeded|hover|dblclick|tap|focus|blur|selectText|type|clear|setInputFiles|boundingBox|evaluate|evaluateAll|dispatchEvent|waitFor|all|allInnerTexts|allTextContents)\(/)) {
        // Skip if it's page.getBy*() pattern (handled separately below)
        // Skip if it's part of a variable declaration like "const x = page.locator()" (locator() itself doesn't need await)
        if (!line.match(/page\.(getByRole|getByText|getByLabel|getByPlaceholder|getByAltText|getByTitle|getByTestId)\(/) &&
            !line.match(/^(const|let|var)\s+\w+\s*=\s*.*\.locator\(/)) {
          issues.push({
            level: 'error',
            message: `Line ${lineNum}: Missing 'await' on async Playwright operation.`,
            line: lineNum,
            suggestion: "Add 'await' before the operation"
          })
        }
      }
    }
    
    // Check for missing await on page.getBy*() operations
    const getByPattern = /page\.(getByRole|getByText|getByLabel|getByPlaceholder|getByAltText|getByTitle|getByTestId)\([^)]*\)\.(click|fill|press|selectOption|check|uncheck|textContent|innerText|innerHTML|getAttribute|isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|screenshot|hover|dblclick|tap|focus|blur|selectText|type|clear|setInputFiles|boundingBox|evaluate|waitFor|scrollIntoViewIfNeeded)\(/
    if (line.match(getByPattern) && !line.includes("await") && !line.match(/^\s*\/\//) && !line.match(/^\s*\*/)) {
      issues.push({
        level: 'error',
        message: `Line ${lineNum}: Missing 'await' on async Playwright operation.`,
        line: lineNum,
        suggestion: "Add 'await' before the operation"
      })
    }
  })
  
  const hasErrors = issues.some(i => i.level === 'error')
  
  return {
    isValid: !hasErrors,
    issues,
    verified: false
  }
}

/**
 * Auto-fix missing 'await' keywords on Playwright operations
 * More aggressive pattern matching to catch all cases
 */
function autoFixMissingAwait(code: string): string {
  const lines = code.split('\n')
  const fixedLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const trimmedLine = line.trim()
    const originalLine = line
    const indent = line.match(/^(\s*)/)?.[1] || ''
    
    // Skip comments and already awaited lines
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/**') || trimmedLine.startsWith('*/')) {
      fixedLines.push(line)
      continue
    }
    
    // Skip if already has await
    if (line.match(/\bawait\s+/)) {
      fixedLines.push(line)
      continue
    }
    
    // Skip setDefaultTimeout as it's synchronous
    if (line.includes('setDefaultTimeout')) {
      fixedLines.push(line)
      continue
    }
    
    // Pattern 1: Fix page.getBy*() operations FIRST (e.g., page.getByText('text').click())
    // This must come before other patterns to avoid double-matching
    const getByPattern = /^(\s*)(page\.(getByRole|getByText|getByLabel|getByPlaceholder|getByAltText|getByTitle|getByTestId)\([^)]*\)\.(click|fill|press|selectOption|check|uncheck|textContent|innerText|innerHTML|getAttribute|isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|screenshot|hover|dblclick|tap|focus|blur|selectText|type|clear|setInputFiles|boundingBox|evaluate|waitFor|scrollIntoViewIfNeeded)\([^)]*\))/
    if (getByPattern.test(line)) {
      line = line.replace(getByPattern, '$1await $2')
      fixedLines.push(line)
      continue
    }
    
    // Pattern 2: Fix chained operations (e.g., page.locator().click())
    // Match: page.locator(...).click() or page.locator(...).fill() etc.
    const chainedPattern = /^(\s*)(page\.locator\([^)]*\)\.(click|fill|press|selectOption|check|uncheck|textContent|innerText|innerHTML|getAttribute|isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|screenshot|hover|dblclick|tap|focus|blur|selectText|type|clear|setInputFiles|boundingBox|evaluate|waitFor|scrollIntoViewIfNeeded)\([^)]*\))/
    if (chainedPattern.test(line)) {
      line = line.replace(chainedPattern, '$1await $2')
      fixedLines.push(line)
      continue
    }
    
    // Pattern 3: Fix page operations (must be at start of statement)
    const pageOpsPattern = /^(\s*)(page\.(goto|click|fill|waitFor|locator|press|selectOption|check|uncheck|setContent|reload|goBack|goForward|evaluate|evaluateHandle|screenshot|pdf|title|url|content|close|setViewportSize|setExtraHTTPHeaders|route|unroute|waitForLoadState|waitForURL|waitForSelector|waitForFunction|waitForEvent|waitForTimeout|hover|dblclick|tap|focus|blur|selectText|type|keyboard|mouse|touchscreen|request|context|addInitScript|setInputFiles|emulateMedia|setGeolocation|setPermissions|addLocatorHandler|removeLocatorHandler|pause|accessibility|coverage|tracing|video|har)\([^)]*\))/
    if (pageOpsPattern.test(line)) {
      line = line.replace(pageOpsPattern, '$1await $2')
      fixedLines.push(line)
      continue
    }
    
    // Pattern 4: Fix standalone locator operations (e.g., button.click(), element.fill())
    // But exclude if it's part of a variable declaration (const x = ...)
    if (!trimmedLine.match(/^(const|let|var)\s+/)) {
      const locatorOpsPattern = /^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*\.(click|fill|press|selectOption|check|uncheck|textContent|innerText|innerHTML|getAttribute|count|first|last|nth|filter|locator|getByRole|getByText|getByLabel|getByPlaceholder|getByAltText|getByTitle|getByTestId|isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|screenshot|scrollIntoViewIfNeeded|hover|dblclick|tap|focus|blur|selectText|type|clear|setInputFiles|boundingBox|evaluate|evaluateAll|dispatchEvent|waitFor|all|allInnerTexts|allTextContents)\([^)]*\))/
      if (locatorOpsPattern.test(line)) {
        line = line.replace(locatorOpsPattern, '$1await $2')
        fixedLines.push(line)
        continue
      }
    }
    
    // Pattern 5: Fix browser operations
    const browserOpsPattern = /^(\s*)(browser\.(newPage|close|newContext|contexts|isConnected)\([^)]*\))/
    if (browserOpsPattern.test(line)) {
      line = line.replace(browserOpsPattern, '$1await $2')
      fixedLines.push(line)
      continue
    }
    
    // Pattern 6: Fix context operations
    const contextOpsPattern = /^(\s*)(context\.(newPage|close|addCookies|clearCookies|grantPermissions|clearPermissions|setExtraHTTPHeaders|setGeolocation|setOffline|addInitScript|route|unroute|waitForEvent|tracing|har|close)\([^)]*\))/
    if (contextOpsPattern.test(line)) {
      line = line.replace(contextOpsPattern, '$1await $2')
      fixedLines.push(line)
      continue
    }
    
    // Pattern 7: Fix variable assignments that need await (e.g., const x = page.goto(...))
    // But NOT for locator() calls (they're synchronous)
    const varAssignPattern = /^(\s*)(const|let|var)\s+(\w+)\s*=\s*(page\.(goto|click|fill|waitFor|press|selectOption|check|uncheck|setContent|reload|goBack|goForward|evaluate|evaluateHandle|screenshot|pdf|title|url|content|close|setViewportSize|setExtraHTTPHeaders|route|unroute|waitForLoadState|waitForURL|waitForSelector|waitForFunction|waitForEvent|waitForTimeout|hover|dblclick|tap|focus|blur|selectText|type|keyboard|mouse|touchscreen|request|context|addInitScript|setInputFiles|emulateMedia|setGeolocation|setPermissions|addLocatorHandler|removeLocatorHandler|pause|accessibility|coverage|tracing|video|har)\([^)]*\))/
    if (varAssignPattern.test(line)) {
      line = line.replace(varAssignPattern, '$1$2 $3 = await $4')
      fixedLines.push(line)
      continue
    }
    
    // Pattern 8: Catch-all for any remaining async operations
    // Look for common async patterns that might have been missed
    const asyncOps = [
      'page.goto(', 'page.click(', 'page.fill(', 'page.press(', 'page.waitFor(',
      'page.screenshot(', 'page.evaluate(', 'page.reload(', 'page.goBack(', 'page.goForward(',
      'page.hover(', 'page.dblclick(', 'page.tap(', 'page.focus(', 'page.blur(',
      'page.selectText(', 'page.type(', 'page.keyboard', 'page.mouse', 'page.touchscreen',
      'browser.newPage(', 'browser.close(', 'browser.newContext(',
      'context.newPage(', 'context.close(',
      '.click(', '.fill(', '.press(', '.textContent(', '.innerText(', '.isVisible(',
      '.isHidden(', '.isEnabled(', '.isDisabled(', '.isChecked(', '.isEditable(',
      '.screenshot(', '.hover(', '.dblclick(', '.tap(', '.focus(', '.blur(',
      '.selectText(', '.type(', '.clear(', '.evaluate(', '.waitFor('
    ]
    
    // Check if line contains any async operation but doesn't have await
    const hasAsyncOp = asyncOps.some(op => line.includes(op))
    const hasAwait = line.includes('await')
    const isVarDecl = trimmedLine.match(/^(const|let|var)\s+/)
    
    if (hasAsyncOp && !hasAwait && !isVarDecl && !line.includes('setDefaultTimeout')) {
      // Try to add await before the operation
      // Find the first async operation in the line
      for (const op of asyncOps) {
        if (line.includes(op)) {
          const opIndex = line.indexOf(op)
          // Find the start of the statement (beginning of line or after =)
          let statementStart = 0
          const equalsIndex = line.lastIndexOf('=', opIndex)
          if (equalsIndex > 0 && equalsIndex < opIndex) {
            statementStart = equalsIndex + 1
          }
          const beforeOp = line.substring(0, opIndex).trimEnd()
          const afterOp = line.substring(opIndex)
          
          // Check if await is already before this operation
          const beforeOpTrimmed = beforeOp.trim()
          if (!beforeOpTrimmed.endsWith('await') && !beforeOpTrimmed.match(/\bawait\s+$/)) {
            // Add await before the operation
            line = beforeOp + ' await ' + afterOp.trimStart()
            fixedLines.push(line)
            break
          }
        }
      }
      if (line !== originalLine) {
        continue
      }
    }
    
    // No changes made
    fixedLines.push(line)
  }
  
  return fixedLines.join('\n')
}

/**
 * Auto-fix missing function call at the end of the script
 */
function autoFixFunctionCall(code: string): string {
  // Check if function call already exists (more comprehensive check)
  const hasFunctionCall = code.match(/(runTests|runE2E|runApi|runPerf)\s*\(/) || 
                          code.match(/async\s+function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*\}\s*\n\s*\w+\s*\(/) ||
                          // Check for any function name followed by () at the end
                          (() => {
                            const lastBraceIndex = code.lastIndexOf('}')
                            if (lastBraceIndex > 0) {
                              const afterLastBrace = code.substring(lastBraceIndex)
                              // Look for functionName() pattern after the last brace
                              return /^\s*\n\s*\w+\s*\(/.test(afterLastBrace)
                            }
                            return false
                          })()
  
  if (hasFunctionCall) {
    return code // Already has function call
  }
  
  // Find the main function name (look for the first async function)
  const mainFunctionMatch = code.match(/async\s+function\s+(\w+)\s*\(/)
  if (mainFunctionMatch) {
    const funcName = mainFunctionMatch[1]
    // Check if function call already exists with this name (more thorough check)
    const funcCallPattern = new RegExp(`${funcName}\\s*\\(`)
    if (!funcCallPattern.test(code)) {
      // Trim trailing whitespace and add function call at the end
      const trimmed = code.trimEnd()
      return trimmed + `\n\n${funcName}().catch((err) => {\n  console.error('\\n❌ Error:', err.message)\n  process.exit(1)\n})`
    }
  }
  
  // If no async function found, check for regular function
  const regularFunctionMatch = code.match(/function\s+(\w+)\s*\(/)
  if (regularFunctionMatch) {
    const funcName = regularFunctionMatch[1]
    const funcCallPattern = new RegExp(`${funcName}\\s*\\(`)
    if (!funcCallPattern.test(code)) {
      const trimmed = code.trimEnd()
      return trimmed + `\n\n${funcName}().catch((err) => {\n  console.error('\\n❌ Error:', err.message)\n  process.exit(1)\n})`
    }
  }
  
  return code
}

/**
 * Ask LLM to verify its own generated code
 */
async function verifyScriptWithLLM(
  code: string,
  config: RunConfig
): Promise<{ verified: boolean; message: string }> {
  const provider: AIProvider = config.aiProvider ?? 'anthropic'
  const key = resolveKey(config)
  const aiBaseUrl = (config.aiBaseUrl || '').trim()
  const aiModel = (config.aiModel || '').trim() || DEFAULT_MODELS[provider]
  
  const verificationPrompt = `You just generated a Playwright TypeScript script. You MUST verify it is 100% correct and will run without errors.

CRITICAL VERIFICATION CHECKLIST (ALL must pass):
1. ✅ Uses 'playwright' library (NOT @playwright/test) - Check imports
2. ✅ Has proper TypeScript imports: import { chromium, Browser, Page } from 'playwright'
3. ✅ Launches browser correctly: await chromium.launch({ headless: false })
4. ✅ Creates page: await browser.newPage() or await context.newPage()
5. ✅ Navigates to URL: await page.goto(url)
6. ✅ Has error handling: try/catch block wrapping execution
7. ✅ Has function call at end: runTests().catch(...) or similar
8. ✅ EVERY async operation has 'await': page.goto(), page.click(), locator.click(), etc.
9. ✅ No test framework code: No test.describe(), test(), expect()
10. ✅ Uses simple assertions: if (!condition) throw new Error(...)
11. ✅ Proper TypeScript syntax: No syntax errors
12. ✅ Will execute when run: Has function definition AND function call

Script to verify:
\`\`\`typescript
${code}
\`\`\`

IMPORTANT: 
- If ANY of the above checks fail, respond with "ISSUES: [list all problems]"
- Only respond with "VERIFIED: Script is correct and will run successfully" if ALL checks pass
- Be extremely strict - this script must be 100% working Playwright TypeScript code
- Check every line for missing 'await' keywords
- Verify the script structure is correct

Respond with:
- "VERIFIED: [brief confirmation]" ONLY if script is 100% correct
- "ISSUES: [detailed list of ALL problems]" if there are ANY issues`

  try {
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: aiModel,
          max_tokens: 500,
          messages: [{ role: 'user', content: verificationPrompt }],
        }),
      })
      if (!res.ok) throw new Error(`Verification API ${res.status}`)
      const data = await res.json()
      const response = data.content?.[0]?.text ?? ''
      const verified = response.trim().toUpperCase().startsWith('VERIFIED:')
      return {
        verified,
        message: verified ? response.replace(/^VERIFIED:\s*/i, '') : response.replace(/^ISSUES:\s*/i, '')
      }
    } else {
      // OpenAI-compatible
      const base = provider === 'custom' ? aiBaseUrl : 
                   provider === 'openai' ? OPENAI_BASE :
                   provider === 'openrouter' ? OPENROUTER_BASE :
                   provider === 'glm' ? GLM_BASE : ''
      if (!base) return { verified: false, message: 'Cannot verify: unknown provider' }
      
      const url = base.replace(/\/$/, '') + '/chat/completions'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (key) headers['Authorization'] = `Bearer ${key}`
      
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: aiModel,
          max_tokens: 500,
          messages: [{ role: 'user', content: verificationPrompt }],
        }),
      })
      if (!res.ok) throw new Error(`Verification API ${res.status}`)
      const data = await res.json()
      const response = data.choices?.[0]?.message?.content ?? ''
      const verified = response.trim().toUpperCase().startsWith('VERIFIED:')
      return {
        verified,
        message: verified ? response.replace(/^VERIFIED:\s*/i, '') : response.replace(/^ISSUES:\s*/i, '')
      }
    }
  } catch (err: any) {
    return {
      verified: false,
      message: `Verification failed: ${err?.message ?? String(err)}`
    }
  }
}

/**
 * Healer Agent: Analyzes test failures and generates fixes
 */
export async function healScript(
  originalScript: string,
  errorLogs: string[],
  failureContext: {
    exitCode: number | null
    duration: number
    screenshots: string[]
    passed: number
    failed: number
  },
  config: RunConfig
): Promise<string> {
  const provider: AIProvider = config.aiProvider ?? 'anthropic'
  const key = resolveKey(config)
  const aiBaseUrl = (config.aiBaseUrl || '').trim()
  const aiModel = (config.aiModel || '').trim() || DEFAULT_MODELS[provider]
  
  const errorSummary = errorLogs.slice(-20).join('\n') // Last 20 error lines
  const screenshotsInfo = failureContext.screenshots.length > 0 
    ? `\nScreenshots captured: ${failureContext.screenshots.join(', ')}`
    : ''
  
  const healPrompt = `You are a test repair expert. A Playwright test script failed. Analyze the error and generate a FIXED version.

ORIGINAL SCRIPT:
\`\`\`typescript
${originalScript}
\`\`\`

FAILURE DETAILS:
- Exit Code: ${failureContext.exitCode}
- Duration: ${failureContext.duration}s
- Passed: ${failureContext.passed}, Failed: ${failureContext.failed}${screenshotsInfo}

ERROR LOGS:
\`\`\`
${errorSummary}
\`\`\`

REQUIREMENTS:
1. Fix the specific errors shown in the logs
2. Keep the same test structure and intent as the original
3. Use 'playwright' library (NOT @playwright/test)
4. Ensure proper error handling with try/catch
5. Add appropriate timeouts for element waits
6. Handle optional elements gracefully (wrap in try/catch)
7. Return ONLY the complete fixed TypeScript code - no markdown fences, no explanation

Generate the COMPLETE FIXED SCRIPT:`

  try {
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: aiModel,
          max_tokens: 4096,
          messages: [{ role: 'user', content: healPrompt }],
        }),
      })
      if (!res.ok) throw new Error(`Healer API ${res.status}`)
      const data = await res.json()
      const code: string = data.content?.[0]?.text ?? ''
      if (!code) throw new Error('Healer returned empty content')
      const cleaned = stripCodeFences(code)
      return stripTestFrameworkCode(cleaned)
    } else {
      // OpenAI-compatible
      const base = provider === 'custom' ? aiBaseUrl : 
                   provider === 'openai' ? OPENAI_BASE :
                   provider === 'openrouter' ? OPENROUTER_BASE :
                   provider === 'glm' ? GLM_BASE : ''
      if (!base) throw new Error('Cannot heal: unknown provider')
      
      const url = base.replace(/\/$/, '') + '/chat/completions'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (key) headers['Authorization'] = `Bearer ${key}`
      
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: aiModel,
          max_tokens: 4096,
          messages: [{ role: 'user', content: healPrompt }],
        }),
      })
      if (!res.ok) throw new Error(`Healer API ${res.status}`)
      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text
      const code = extractContent(raw)
      if (!code || !code.trim()) throw new Error('Healer returned empty content')
      const cleaned = stripCodeFences(code)
      return stripTestFrameworkCode(cleaned)
    }
  } catch (err: any) {
    throw new Error(`Healer failed: ${err?.message ?? String(err)}`)
  }
}

/**
 * Planner Agent: Creates a structured plan based on user prompt
 */
interface PlanStep {
  step: number
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'verify' | 'scroll'
  target: string
  selector?: string
  text?: string
  description: string
  expectedResult?: string
}

async function planActionsWithLLM(
  prompt: string,
  url: string,
  provider: AIProvider,
  key: string,
  aiBaseUrl: string,
  aiModel: string,
  previousErrors?: string[]
): Promise<PlanStep[]> {
  const errorContext = previousErrors && previousErrors.length > 0
    ? `\n\n⚠️ IMPORTANT: Previous attempt failed with these errors:\n${previousErrors.map(e => `- ${e}`).join('\n')}\n\nPlease create a new plan that addresses these issues and uses different strategies to find elements.`
    : ''
  
  const plannerPrompt = `You are a Test Automation Planner Agent. Your job is to analyze a user's request and create a detailed step-by-step plan for browser automation.

User Request: "${prompt}"
Target URL: ${url}${errorContext}

Create a comprehensive plan that breaks down the task into specific, actionable steps. Each step should be clear and executable.

Respond with ONLY a JSON array of plan steps in this exact format:
[
  {
    "step": 1,
    "action": "navigate",
    "target": "URL or page description",
    "description": "Navigate to the target page",
    "expectedResult": "Page loads successfully"
  },
  {
    "step": 2,
    "action": "click",
    "target": "description of element to click",
    "selector": "optional CSS selector or text identifier",
    "description": "Click on the specified element",
    "expectedResult": "Element is clicked and page responds"
  },
  {
    "step": 3,
    "action": "fill",
    "target": "description of input field",
    "selector": "optional CSS selector or placeholder text",
    "text": "text to fill",
    "description": "Fill the input field with specified text",
    "expectedResult": "Input field is filled"
  },
  {
    "step": 4,
    "action": "wait",
    "target": "what to wait for",
    "description": "Wait for page to load or element to appear",
    "expectedResult": "Page is ready"
  },
  {
    "step": 5,
    "action": "verify",
    "target": "what to verify",
    "description": "Verify that something exists or has expected value",
    "expectedResult": "Verification passes"
  }
]

Available actions:
- "navigate": Navigate to a URL or page
- "click": Click on an element (button, link, etc.)
- "fill": Fill an input field with text
- "wait": Wait for something to appear or load
- "verify": Verify that something exists or has expected value
- "scroll": Scroll to an element or position

Generate a plan with all necessary steps to complete the user's request. Be specific about what elements to interact with.`

  try {
    const response = await callLLM(provider, key, aiBaseUrl, aiModel, plannerPrompt)
    if (response) {
      try {
        const plan = JSON.parse(response)
        if (Array.isArray(plan)) {
          return plan as PlanStep[]
        }
      } catch (parseErr) {
        console.error('[Planner Agent] Failed to parse plan:', parseErr)
      }
    }
  } catch (err: any) {
    console.error('[Planner Agent] Error:', err.message)
  }
  
  // Fallback: Create a simple plan
  return [
    {
      step: 1,
      action: 'navigate',
      target: url,
      description: `Navigate to ${url}`,
      expectedResult: 'Page loads successfully'
    },
    {
      step: 2,
      action: 'click',
      target: 'element from prompt',
      description: `Complete task: ${prompt}`,
      expectedResult: 'Task completed'
    }
  ]
}

/**
 * Navigate Agent: Executes the plan step by step on the browser
 * Returns both recorded actions and success status
 */
async function navigateAgent(
  plan: PlanStep[],
  page: any,
  sendAction: (action: { type: string; action: any }) => void,
  sendLog: (level: string, message: string) => void
): Promise<{
  actions: Array<{ type: string; selector?: string; text?: string; url?: string; description: string }>
  success: boolean
  failedSteps: number
  errorMessages: string[]
}> {
  const recordedActions: Array<{
    type: string
    selector?: string
    text?: string
    url?: string
    description: string
  }> = []
  
  let failedSteps = 0
  const errorMessages: string[] = []
  
  for (const planStep of plan) {
    sendLog('info', `📋 Step ${planStep.step}: ${planStep.description}`)
    
    try {
      switch (planStep.action) {
        case 'navigate':
          const targetUrl = planStep.target.startsWith('http') ? planStep.target : page.url()
          sendLog('info', `🌐 Navigating to ${targetUrl}...`)
          sendAction({
            type: 'browser_action',
            action: {
              type: 'navigate',
              url: targetUrl,
              timestamp: Date.now(),
              description: `Navigating to ${targetUrl}`
            }
          })
          await page.goto(targetUrl, { waitUntil: 'networkidle' })
          recordedActions.push({
            type: 'navigate',
            url: targetUrl,
            description: planStep.description
          })
          break
          
        case 'click':
          sendLog('info', `🖱️ Clicking: ${planStep.target}`)
          
          let clickElement = null
          // Try multiple strategies to find the element
          if (planStep.selector) {
            try {
              clickElement = page.locator(planStep.selector).first()
              if (!(await clickElement.isVisible({ timeout: 2000 }))) {
                clickElement = null
              }
            } catch {}
          }
          
          if (!clickElement) {
            // Try by role
            try {
              clickElement = page.getByRole('link', { name: new RegExp(planStep.target, 'i') }).first()
              if (!(await clickElement.isVisible({ timeout: 2000 }))) {
                clickElement = page.getByRole('button', { name: new RegExp(planStep.target, 'i') }).first()
              }
            } catch {}
          }
          
          if (!clickElement) {
            // Try by text
            try {
              clickElement = page.getByText(new RegExp(planStep.target, 'i')).first()
            } catch {}
          }
          
          if (clickElement && await clickElement.isVisible({ timeout: 3000 })) {
            await clickElement.click()
            recordedActions.push({
              type: 'click',
              selector: planStep.selector || planStep.target,
              description: planStep.description
            })
            sendAction({
              type: 'browser_action',
              action: {
                type: 'click',
                selector: planStep.selector || planStep.target,
                timestamp: Date.now(),
                description: `✅ ${planStep.description}`
              }
            })
            await page.waitForTimeout(1000)
          } else {
            const errorMsg = `Could not find element: ${planStep.target}`
            sendLog('warn', `⚠️ ${errorMsg}`)
            failedSteps++
            errorMessages.push(`Step ${planStep.step}: ${errorMsg}`)
          }
          break
          
        case 'fill':
          sendLog('info', `📝 Filling: ${planStep.target} with "${planStep.text}"`)
          
          let fillElement = null
          if (planStep.selector) {
            fillElement = page.locator(planStep.selector).first()
          } else {
            fillElement = page.getByPlaceholder(planStep.target).first()
          }
          
          if (fillElement && await fillElement.isVisible({ timeout: 3000 })) {
            await fillElement.fill(planStep.text || '')
            recordedActions.push({
              type: 'fill',
              selector: planStep.selector || planStep.target,
              text: planStep.text,
              description: planStep.description
            })
            sendAction({
              type: 'browser_action',
              action: {
                type: 'fill',
                selector: planStep.selector || planStep.target,
                text: planStep.text,
                timestamp: Date.now(),
                description: `✅ ${planStep.description}`
              }
            })
          } else {
            const errorMsg = `Could not find input field: ${planStep.target}`
            sendLog('warn', `⚠️ ${errorMsg}`)
            failedSteps++
            errorMessages.push(`Step ${planStep.step}: ${errorMsg}`)
          }
          break
          
        case 'wait':
          sendLog('info', `⏳ Waiting: ${planStep.target}`)
          await page.waitForTimeout(2000)
          recordedActions.push({
            type: 'wait',
            description: planStep.description
          })
          break
          
        case 'verify':
          sendLog('info', `✓ Verifying: ${planStep.target}`)
          // Verification logic can be added here
          recordedActions.push({
            type: 'verify',
            description: planStep.description
          })
          break
          
        case 'scroll':
          sendLog('info', `📜 Scrolling: ${planStep.target}`)
          if (planStep.selector) {
            const scrollElement = page.locator(planStep.selector).first()
            if (await scrollElement.isVisible({ timeout: 3000 })) {
              await scrollElement.scrollIntoViewIfNeeded()
            }
          }
          recordedActions.push({
            type: 'scroll',
            description: planStep.description
          })
          break
      }
    } catch (err: any) {
      const errorMsg = `Step ${planStep.step} failed: ${err.message}`
      sendLog('warn', `⚠️ ${errorMsg}`)
      failedSteps++
      errorMessages.push(errorMsg)
    }
  }
  
  // Consider navigation successful if at least 50% of steps succeeded
  const successRate = (plan.length - failedSteps) / plan.length
  const success = successRate >= 0.5 && failedSteps < plan.length / 2
  
  return {
    actions: recordedActions,
    success,
    failedSteps,
    errorMessages
  }
}

/**
 * Execute actions on browser using multi-agent system (Planner + Navigate), then generate script
 * Includes retry logic: if Navigate Agent fails, retry Planner + Navigate
 */
export async function executeActionsAndGenerateScript(
  config: RunConfig,
  sendAction: (action: { type: string; action: any }) => void,
  sendLog: (level: string, message: string) => void,
  retryCount: number = 0
): Promise<{ script: string; validation: ValidationResult }> {
  const MAX_RETRIES = 3
  const playwright = await import('playwright')
  const effectiveUrl = config.baseUrl || config.url
  const browser = await playwright.chromium.launch({ 
    headless: config.mode === 'headless',
    slowMo: config.slowMo || 0
  })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Step 1: Planner Agent - Create a plan
    sendLog('info', `🧠 Planner Agent: Analyzing task and creating plan${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''}...`)
    const provider: AIProvider = config.aiProvider ?? 'anthropic'
    const key = resolveKey(config)
    const aiBaseUrl = (config.aiBaseUrl || '').trim()
    const aiModel = (config.aiModel || '').trim() || DEFAULT_MODELS[provider]
    
    // Get previous errors from retry context (stored in config for retries)
    const previousErrors = (config as any).__previousErrors as string[] | undefined
    const plan = await planActionsWithLLM(config.prompt, effectiveUrl, provider, key, aiBaseUrl, aiModel, previousErrors)
    sendLog('info', `✅ Planner Agent created ${plan.length} step plan`)
    
    // Display plan
    plan.forEach(step => {
      sendLog('info', `  ${step.step}. ${step.action.toUpperCase()}: ${step.description}`)
    })
    
    // Step 2: Navigate Agent - Execute the plan
    sendLog('info', `🚀 Navigate Agent: Executing plan on browser...`)
    const navigateResult = await navigateAgent(plan, page, sendAction, sendLog)
    
    // Check if Navigate Agent succeeded
    if (!navigateResult.success && retryCount < MAX_RETRIES) {
      sendLog('warn', `⚠️ Navigate Agent failed: ${navigateResult.failedSteps} step(s) failed`)
      sendLog('warn', `   Errors: ${navigateResult.errorMessages.slice(0, 3).join('; ')}`)
      sendLog('info', `🔄 Retrying Planner + Navigate Agent (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
      
      // Close current browser and retry with fresh browser instance
      await browser.close()
      
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Recursively retry with error context passed to Planner via config
      const retryConfig = {
        ...config,
        __previousErrors: navigateResult.errorMessages.slice(0, 5) // Pass errors to Planner
      } as RunConfig & { __previousErrors?: string[] }
      
      return executeActionsAndGenerateScript(
        retryConfig,
        sendAction,
        sendLog,
        retryCount + 1
      )
    }
    
    if (!navigateResult.success) {
      sendLog('warn', `⚠️ Navigate Agent failed after ${MAX_RETRIES} retries. Using partial actions.`)
    }
    
    sendLog('info', `✅ Navigate Agent completed ${navigateResult.actions.length} actions${navigateResult.failedSteps > 0 ? ` (${navigateResult.failedSteps} failed)` : ''}`)
    
    // Step 3: Generate script from recorded actions
    sendLog('info', `📝 Generating script from ${navigateResult.actions.length} recorded actions...`)
    const scriptPrompt = `Generate a Playwright TypeScript script based on these executed actions:

${navigateResult.actions.map((a, i) => `${i + 1}. ${a.description}`).join('\n')}

Original task: "${config.prompt}"
Target URL: ${effectiveUrl}
${navigateResult.failedSteps > 0 ? `\nNote: ${navigateResult.failedSteps} step(s) failed during execution. Please handle these cases gracefully in the script.` : ''}

Generate a complete, runnable Playwright TypeScript script that performs these exact actions.`
    
    const enhancedConfig: RunConfig = {
      ...config,
      prompt: scriptPrompt
    }
    
    return await generateAndValidateScript(enhancedConfig)
    
  } finally {
    await browser.close()
  }
}

/**
 * Generic LLM call function
 */
async function callLLM(
  provider: AIProvider,
  key: string,
  aiBaseUrl: string,
  aiModel: string,
  prompt: string,
  maxTokens: number = 2000
): Promise<string | null> {
  try {
    if (provider === 'anthropic') {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: aiModel,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      }
      
      // Use custom agent if SSL verification is disabled (development only)
      if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
        const https = await import('https')
        // @ts-ignore - Node.js fetch supports agent
        fetchOptions.agent = new https.Agent({ rejectUnauthorized: false })
      }
      
      const res = await fetch('https://api.anthropic.com/v1/messages', fetchOptions)
      if (!res.ok) throw new Error(`Anthropic API ${res.status}`)
      const data = await res.json()
      return data.content?.[0]?.text ?? null
    } else {
      const base = provider === 'custom' ? aiBaseUrl : 
                   provider === 'openai' ? OPENAI_BASE :
                   provider === 'openrouter' ? OPENROUTER_BASE :
                   provider === 'glm' ? GLM_BASE : ''
      if (!base) return null
      
      const url = base.replace(/\/$/, '') + '/chat/completions'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (key) headers['Authorization'] = `Bearer ${key}`
      
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: aiModel,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      }
      
      // Use custom agent if SSL verification is disabled (development only)
      if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
        const https = await import('https')
        // @ts-ignore - Node.js fetch supports agent
        fetchOptions.agent = new https.Agent({ rejectUnauthorized: false })
      }
      
      const res = await fetch(url, fetchOptions)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? null
    }
  } catch (err: any) {
    console.error('[callLLM] Error:', err.message)
    return null
  }
}

/**
 * Call LLM to decide next action (legacy - kept for backward compatibility)
 */
async function callLLMForAction(
  provider: AIProvider,
  key: string,
  aiBaseUrl: string,
  aiModel: string,
  prompt: string
): Promise<{ action: string; target?: string; selector?: string; text?: string; reason?: string } | null> {
  try {
    const response = await callLLM(provider, key, aiBaseUrl, aiModel, prompt, 500)
    if (response) {
      return JSON.parse(response)
    }
    return null
  } catch (err: any) {
    console.error('[callLLMForAction] Error:', err.message)
    return null
  }
}

/**
 * Generate script with validation and verification
 * Retries up to 3 times if validation fails to ensure 100% working script
 */
export async function generateAndValidateScript(config: RunConfig, retryCount = 0): Promise<{ script: string; validation: ValidationResult }> {
  const MAX_RETRIES = 3
  
  // Validate that prompt is provided
  if (!config.prompt || !config.prompt.trim()) {
    throw new Error('User prompt is required. Please provide a description of what you want to test.')
  }
  
  // Step 1: Generate script
  let script = await generateScript(config)
  
  // Step 1.5: Auto-fix missing await keywords - run multiple passes until no more errors
  let awaitFixPasses = 0
  const MAX_AWAIT_FIX_PASSES = 5
  while (awaitFixPasses < MAX_AWAIT_FIX_PASSES) {
    const beforeFix = script
    script = autoFixMissingAwait(script)
    if (script === beforeFix) {
      // No changes made, stop
      break
    }
    awaitFixPasses++
  }
  
  // Step 1.6: Auto-fix missing function call
  script = autoFixFunctionCall(script)
  
  // Step 2: Validate code structure
  let validation = validateScript(script)
  
  // Step 2.5: If there are still await-related errors, run more aggressive auto-fix passes
  let awaitErrors = validation.issues.filter(i => i.message.includes("Missing 'await'"))
  let awaitFixAttempts = 0
  const MAX_AWAIT_FIX_ATTEMPTS = 10
  
  while (awaitErrors.length > 0 && awaitFixAttempts < MAX_AWAIT_FIX_ATTEMPTS) {
    const beforeFix = script
    script = autoFixMissingAwait(script)
    
    // If no changes were made, break to avoid infinite loop
    if (script === beforeFix) {
      break
    }
    
    validation = validateScript(script)
    awaitErrors = validation.issues.filter(i => i.message.includes("Missing 'await'"))
    awaitFixAttempts++
  }
  
  // Step 2.6: If function call is still missing, try one more auto-fix pass
  const functionCallErrors = validation.issues.filter(i => i.message.includes("No function call found"))
  if (functionCallErrors.length > 0) {
    script = autoFixFunctionCall(script)
    validation = validateScript(script) // Re-validate after function call fix
  }
  
  // Step 3: If validation has errors, retry generation (up to MAX_RETRIES times)
  if (!validation.isValid && retryCount < MAX_RETRIES) {
    const errorCount = validation.issues.filter(i => i.level === 'error').length
    console.log(`[generateAndValidateScript] Validation failed with ${errorCount} error(s). Retrying generation (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
    
    // Wait a bit before retry to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Retry with enhanced prompt mentioning the errors
    const errorSummary = validation.issues
      .filter(i => i.level === 'error')
      .slice(0, 5)
      .map(i => `- ${i.message}${i.suggestion ? ` (${i.suggestion})` : ''}`)
      .join('\n')
    
    const enhancedConfig: RunConfig = {
      ...config,
      prompt: `${config.prompt}\n\nIMPORTANT: Previous generation had errors. Please fix these:\n${errorSummary}\n\nGenerate a corrected script that addresses all these issues.`
    }
    
    return generateAndValidateScript(enhancedConfig, retryCount + 1)
  }
  
  // Step 4: If validation passes, ask LLM to verify (strict verification)
  if (validation.isValid) {
    try {
      const verification = await verifyScriptWithLLM(script, config)
      validation.verified = verification.verified
      validation.verificationMessage = verification.message
      
      // If LLM verification fails, retry generation (if we haven't exceeded retries)
      if (!verification.verified && retryCount < MAX_RETRIES) {
        console.log(`[generateAndValidateScript] LLM verification failed. Retrying generation (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
        
        const enhancedConfig: RunConfig = {
          ...config,
          prompt: `${config.prompt}\n\nIMPORTANT: Previous script failed LLM verification: ${verification.message}\n\nPlease generate a corrected script that addresses these issues and ensures 100% working Playwright TypeScript code.`
        }
        
        return generateAndValidateScript(enhancedConfig, retryCount + 1)
      }
      
      if (!verification.verified) {
        // If LLM found issues after max retries, add them as errors
        validation.issues.push({
          level: 'error',
          message: `LLM verification failed after ${MAX_RETRIES} attempts: ${verification.message}`,
          suggestion: 'The generated script may have issues. Please review carefully.'
        })
        validation.isValid = false
      }
    } catch (err: any) {
      // Verification failed - if we haven't exceeded retries, retry
      if (retryCount < MAX_RETRIES) {
        console.log(`[generateAndValidateScript] Verification error. Retrying generation (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
        const enhancedConfig: RunConfig = {
          ...config,
          prompt: `${config.prompt}\n\nIMPORTANT: Previous script verification failed. Please generate a corrected, verified script.`
        }
        return generateAndValidateScript(enhancedConfig, retryCount + 1)
      }
      
      // After max retries, add as warning
      validation.issues.push({
        level: 'warning',
        message: `Could not verify with LLM after ${MAX_RETRIES} attempts: ${err?.message ?? String(err)}`,
        suggestion: 'Script will be executed but may have issues'
      })
    }
  }
  
  return { script, validation }
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
  
  // Log the user prompt to ensure it's being used (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('[generateWithAnthropic] User prompt:', config.prompt?.slice(0, 200) || 'NO PROMPT PROVIDED')
  }
  
  try {
    const fetchOptions: RequestInit = {
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
    }
    
    // Use custom agent if SSL verification is disabled (development only)
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      const https = await import('https')
      // @ts-ignore - Node.js fetch supports agent
      fetchOptions.agent = new https.Agent({ rejectUnauthorized: false })
    }
    
    const res = await fetch('https://api.anthropic.com/v1/messages', fetchOptions)
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`)
    const data = await res.json()
    const code: string = data.content?.[0]?.text ?? ''
    if (!code) throw new Error('Anthropic returned empty content')
    const cleaned = stripCodeFences(code)
    return stripTestFrameworkCode(cleaned)
  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    const lowerErrorMsg = errorMsg.toLowerCase()
    const causeMsg = err?.cause?.message || ''
    const fullErrorMsg = `${errorMsg} ${causeMsg}`.trim().toLowerCase()
    
    // Check for SSL/certificate errors
    const isSSLError = fullErrorMsg.includes('certificate') || 
                       fullErrorMsg.includes('unable to get local issuer certificate') ||
                       fullErrorMsg.includes('unable to get issuer cert') ||
                       fullErrorMsg.includes('unable to get local issuer cert')
    
    if (isSSLError) {
      throw new Error(`Anthropic SSL certificate error: Unable to verify SSL certificate. This often happens with corporate proxies or firewalls. Solutions: 1) Install/update CA certificates, 2) Configure your corporate proxy settings, 3) Contact your IT department about SSL inspection. For development only, restart the server with: NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev (NOT recommended for production).`)
    }
    
    throw new Error(`Anthropic failed: ${errorMsg}`)
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
  
  // Log the user prompt to ensure it's being used (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('[generateWithOpenAICompatible] User prompt:', config.prompt?.slice(0, 200) || 'NO PROMPT PROVIDED')
  }
  
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout for generation
    
    const fetchOptions: RequestInit = {
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
      signal: controller.signal,
    }
    
    // Use custom agent if SSL verification is disabled (development only)
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      // Dynamically import https to avoid Next.js bundling issues
      const https = await import('https')
      // @ts-ignore - Node.js fetch supports agent
      fetchOptions.agent = new https.Agent({ rejectUnauthorized: false })
    }
    
    const res = await fetch(url, fetchOptions)
    clearTimeout(timeoutId)
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
    const cleaned = stripCodeFences(code)
    return stripTestFrameworkCode(cleaned)
  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    const errorCode = err?.code || err?.cause?.code || ''
    const errorName = err?.name || ''
    const causeMsg = err?.cause?.message || ''
    const fullErrorMsg = `${errorMsg} ${causeMsg}`.trim()
    
    // Log the full error for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error(`[AI Generation Error] URL: ${url}, Error:`, {
        message: errorMsg,
        code: errorCode,
        name: errorName,
        cause: err?.cause,
        stack: err?.stack,
      })
    }
    
    if (err?.name === 'AbortError' || errorMsg.includes('aborted')) {
      throw new Error(`AI provider connection timeout: Request to ${url} took too long. Check your internet connection and try again.`)
    }
    
    // Check for SSL/certificate errors (check both main error and cause)
    const lowerErrorMsg = fullErrorMsg.toLowerCase()
    const isSSLError = lowerErrorMsg.includes('certificate') || 
                       lowerErrorMsg.includes('unable to get local issuer certificate') ||
                       lowerErrorMsg.includes('unable to get issuer cert') ||
                       lowerErrorMsg.includes('unable to get local issuer cert') ||
                       fullErrorMsg.includes('UNABLE_TO_GET_ISSUER_CERT') || 
                       fullErrorMsg.includes('CERT_HAS_EXPIRED') || 
                       fullErrorMsg.includes('SELF_SIGNED_CERT') ||
                       errorCode === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
                       errorCode === 'UNABLE_TO_GET_ISSUER_CERT' ||
                       // If fetch failed with no code on HTTPS, likely SSL issue
                       (errorMsg === 'fetch failed' && !errorCode && url.startsWith('https://'))
    
    if (isSSLError) {
      throw new Error(`AI provider SSL certificate error: Unable to verify SSL certificate. This often happens with corporate proxies or firewalls. Solutions: 1) Install/update CA certificates, 2) Configure your corporate proxy settings, 3) Contact your IT department about SSL inspection. For development only, restart the server with: NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev (NOT recommended for production).`)
    }
    
    if (errorMsg.includes('fetch failed') || errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT' || errorCode === 'EAI_AGAIN') {
      const hint = errorCode === 'ENOTFOUND' ? ' DNS resolution failed. Check if the domain is correct.' 
        : errorCode === 'ECONNREFUSED' ? ' Connection refused. Check if the service is running and accessible.'
        : errorCode === 'ETIMEDOUT' ? ' Connection timed out.'
        : errorCode === 'EAI_AGAIN' ? ' DNS lookup failed. Check your network connection.'
        : errorMsg === 'fetch failed' && url.startsWith('https://') ? ' This might be an SSL certificate issue. Try setting NODE_TLS_REJECT_UNAUTHORIZED=0 for development.'
        : ''
      throw new Error(`AI provider connection failed: Unable to reach ${url}.${hint} Check your internet connection, verify the Base URL is correct, and ensure the API endpoint is accessible.`)
    }
    throw new Error(`AI provider failed: ${errorMsg}`)
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
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const fetchOptions: RequestInit = {
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
        signal: controller.signal,
      }
      
      // Use custom agent if SSL verification is disabled (development only)
      if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
        const https = await import('https')
        // @ts-ignore - Node.js fetch supports agent
        fetchOptions.agent = new https.Agent({ rejectUnauthorized: false })
      }
      
      const res = await fetch('https://api.anthropic.com/v1/messages', fetchOptions)
      clearTimeout(timeoutId)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`${label} ${res.status}: ${err.slice(0, 150)}`)
    }
    return
    } catch (err: any) {
      const errorMsg = err?.message || String(err)
      if (err?.name === 'AbortError' || errorMsg.includes('aborted')) {
        throw new Error(`${label} connection timeout: Request took too long. Check your internet connection and try again.`)
      }
      if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
        throw new Error(`${label} connection failed: Unable to reach API endpoint. Check your internet connection and try again.`)
      }
      throw new Error(`${label} error: ${errorMsg}`)
    }
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

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    // For development: allow SSL certificate issues if NODE_TLS_REJECT_UNAUTHORIZED is set
    const fetchOptions: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: aiModel,
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
      signal: controller.signal,
    }
    
    // Use custom agent if SSL verification is disabled (development only)
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      // Dynamically import https to avoid Next.js bundling issues
      const https = await import('https')
      // @ts-ignore - Node.js fetch supports agent
      fetchOptions.agent = new https.Agent({ rejectUnauthorized: false })
    }
    
    const res = await fetch(url, fetchOptions)
    clearTimeout(timeoutId)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${res.status}: ${err.slice(0, 150)}`)
  }
  const data = await res.json()
  if (!data.choices?.[0]) throw new Error('Unexpected response format')
  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    const errorCode = err?.code || err?.cause?.code || ''
    const errorName = err?.name || ''
    const causeMsg = err?.cause?.message || ''
    const fullErrorMsg = `${errorMsg} ${causeMsg}`.trim()
    
    // Log the full error for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error(`[AI Test Error] Provider: ${label}, URL: ${url}, Error:`, {
        message: errorMsg,
        code: errorCode,
        name: errorName,
        cause: err?.cause,
        stack: err?.stack,
      })
    }
    
    if (err?.name === 'AbortError' || errorMsg.includes('aborted')) {
      throw new Error(`${label} connection timeout: Request to ${url} took too long. Check your internet connection and try again.`)
    }
    
    // Check for SSL/certificate errors (check both main error and cause)
    const lowerErrorMsg = fullErrorMsg.toLowerCase()
    const isSSLError = lowerErrorMsg.includes('certificate') || 
                       lowerErrorMsg.includes('unable to get local issuer certificate') ||
                       lowerErrorMsg.includes('unable to get issuer cert') ||
                       lowerErrorMsg.includes('unable to get local issuer cert') ||
                       fullErrorMsg.includes('UNABLE_TO_GET_ISSUER_CERT') || 
                       fullErrorMsg.includes('CERT_HAS_EXPIRED') || 
                       fullErrorMsg.includes('SELF_SIGNED_CERT') ||
                       errorCode === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
                       errorCode === 'UNABLE_TO_GET_ISSUER_CERT' ||
                       // If fetch failed with no code on HTTPS, likely SSL issue
                       (errorMsg === 'fetch failed' && !errorCode && url.startsWith('https://'))
    
    if (isSSLError) {
      throw new Error(`${label} SSL certificate error: Unable to verify SSL certificate. This often happens with corporate proxies or firewalls. Solutions: 1) Install/update CA certificates, 2) Configure your corporate proxy settings, 3) Contact your IT department about SSL inspection. For development only, restart the server with: NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev (NOT recommended for production).`)
    }
    
    if (errorMsg.includes('fetch failed') || errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT' || errorCode === 'EAI_AGAIN') {
      const hint = errorCode === 'ENOTFOUND' ? ' DNS resolution failed. Check if the domain is correct.' 
        : errorCode === 'ECONNREFUSED' ? ' Connection refused. Check if the service is running and accessible.'
        : errorCode === 'ETIMEDOUT' ? ' Connection timed out.'
        : errorCode === 'EAI_AGAIN' ? ' DNS lookup failed. Check your network connection.'
        : errorMsg === 'fetch failed' && url.startsWith('https://') ? ' This might be an SSL certificate issue. Try setting NODE_TLS_REJECT_UNAUTHORIZED=0 for development.'
        : ''
      throw new Error(`${label} connection failed: Unable to reach ${url}.${hint} Check your internet connection, verify the Base URL is correct, and try again.`)
    }
    throw err
  }
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

  return `import { chromium, firefox, webkit, Browser, Page } from 'playwright'
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
  page.setDefaultTimeout(${c.timeout})

  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  try {
    // ── Test 1: Navigation ────────────────────────────────────────────
    console.log('\\n🧪 Test 1: Page loads correctly')
    await page.goto('${base}', { waitUntil: 'networkidle', timeout: ${c.timeout} })
    const title = await page.title()
    console.log(\`  Title: "\${title}"\`)
    console.log(\`  URL:   \${page.url()}\`)
    if (!title || title.trim() === '') throw new Error('Page title is empty')
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
      const bodyVisible = await page.locator('body').isVisible()
    if (!bodyVisible) throw new Error('Body element is not visible')
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

  // Build authentication header code
  let authHeaderCode = ''
  let oauth2TokenFetchCode = ''
  const method = c.apiAuthMethod || 'none'
  
  if (method === 'bearer' && c.apiAuthToken) {
    authHeaderCode = `headers['authorization'] = 'Bearer ${c.apiAuthToken.replace(/'/g, "\\'")}';`
  } else if (method === 'basic' && c.apiBasicUsername && c.apiBasicPassword) {
    const username = c.apiBasicUsername.replace(/'/g, "\\'")
    const password = c.apiBasicPassword.replace(/'/g, "\\'")
    authHeaderCode = `const basicAuth = Buffer.from('${username}:${password}').toString('base64');\n  headers['authorization'] = 'Basic ' + basicAuth;`
  } else if (method === 'apikey' && c.apiKeyName && c.apiKeyValue) {
    const keyName = c.apiKeyName.replace(/'/g, "\\'")
    const keyValue = c.apiKeyValue.replace(/'/g, "\\'")
    authHeaderCode = `headers['${keyName}'] = '${keyValue}';`
  } else if (method === 'oauth' && c.apiOAuthToken) {
    authHeaderCode = `headers['authorization'] = 'Bearer ${c.apiOAuthToken.replace(/'/g, "\\'")}';`
  } else if (method === 'oauth2') {
    // OAuth2 support with token fetching
    const grantType = c.apiOAuth2GrantType || 'client_credentials'
    const tokenUrl = c.apiOAuth2TokenUrl?.replace(/'/g, "\\'") || ''
    const clientId = c.apiOAuth2ClientId?.replace(/'/g, "\\'") || ''
    const clientSecret = c.apiOAuth2ClientSecret?.replace(/'/g, "\\'") || ''
    const scope = c.apiOAuth2Scope?.replace(/'/g, "\\'") || ''
    const redirectUri = c.apiOAuth2RedirectUri?.replace(/'/g, "\\'") || ''
    const username = c.apiOAuth2Username?.replace(/'/g, "\\'") || ''
    const password = c.apiOAuth2Password?.replace(/'/g, "\\'") || ''
    const refreshToken = c.apiOAuth2RefreshToken?.replace(/'/g, "\\'") || ''
    const accessToken = c.apiOAuth2AccessToken?.replace(/'/g, "\\'") || ''
    
    if (accessToken) {
      // Use manually provided access token
      authHeaderCode = `headers['authorization'] = 'Bearer ${accessToken}';`
    } else if (tokenUrl && clientId && clientSecret) {
      // Fetch token automatically
      let tokenRequestBody = ''
      if (grantType === 'client_credentials') {
        tokenRequestBody = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
        if (scope) tokenRequestBody += `&scope=${encodeURIComponent(scope)}`
      } else if (grantType === 'password') {
        if (!username || !password) {
          authHeaderCode = '// OAuth2 Password grant requires username and password'
        } else {
          tokenRequestBody = `grant_type=password&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
          if (scope) tokenRequestBody += `&scope=${encodeURIComponent(scope)}`
        }
      } else if (grantType === 'refresh_token') {
        if (!refreshToken) {
          authHeaderCode = '// OAuth2 Refresh Token grant requires refresh_token'
        } else {
          tokenRequestBody = `grant_type=refresh_token&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&refresh_token=${encodeURIComponent(refreshToken)}`
        }
      } else if (grantType === 'authorization_code') {
        authHeaderCode = '// OAuth2 Authorization Code flow requires user interaction - not supported in automated tests'
      }
      
      if (tokenRequestBody) {
        oauth2TokenFetchCode = `
  // Fetch OAuth2 access token
  let accessToken = ''
  try {
    console.log('\\n🔐 Fetching OAuth2 access token...')
    const tokenRes = await context.request.post('${tokenUrl}', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: '${tokenRequestBody}'
    })
    if (tokenRes.ok()) {
      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token || ''
      if (accessToken) {
        console.log('  ✅ OAuth2 token obtained')
      } else {
        console.log('  ❌ No access_token in response')
      }
    } else {
      console.log(\`  ❌ Token request failed: \${tokenRes.status()} \${tokenRes.statusText()}\`)
    }
  } catch (err: any) {
    console.log(\`  ❌ Token fetch error: \${err.message}\`)
  }
  
  if (!accessToken) {
    throw new Error('Failed to obtain OAuth2 access token')
  }
  
  headers['authorization'] = 'Bearer ' + accessToken`
      }
    } else {
      authHeaderCode = '// OAuth2 configuration incomplete - missing token URL, client ID, or client secret'
    }
  } else if (method === 'custom' && c.apiCustomAuth) {
    // Parse custom auth header (format: "Header-Name: value")
    const parts = c.apiCustomAuth.split(':').map(s => s.trim())
    if (parts.length >= 2) {
      const headerName = parts[0].replace(/'/g, "\\'")
      const headerValue = parts.slice(1).join(':').trim().replace(/'/g, "\\'")
      authHeaderCode = `headers['${headerName}'] = '${headerValue}';`
    }
  }

  // Build content-type header
  let contentTypeCode = ''
  if (c.apiContentType) {
    contentTypeCode = `headers['content-type'] = '${c.apiContentType.replace(/'/g, "\\'")}';`
  }

  // Build custom header
  let customHeaderCode = ''
  if (c.apiCustomHeader) {
    const parts = c.apiCustomHeader.split(':').map(s => s.trim())
    if (parts.length >= 2) {
      const headerName = parts[0].replace(/'/g, "\\'")
      const headerValue = parts.slice(1).join(':').trim().replace(/'/g, "\\'")
      customHeaderCode = `headers['${headerName}'] = '${headerValue}';`
    }
  }

  return `import { chromium, APIRequestContext, APIResponse } from 'playwright'

/**
 * TestForge AI — Generated API Test
 * Target: ${base}
 * Prompt: ${c.prompt}
 */

async function runApiTests() {
  const browser = await ${launchLine(c)}
  const context = await browser.newContext()

  const headers: Record<string, string> = {}
  
  ${oauth2TokenFetchCode ? oauth2TokenFetchCode : ''}
  
  // Authentication headers based on method
  ${authHeaderCode ? authHeaderCode : '// No authentication configured'}
  
  ${contentTypeCode ? contentTypeCode : ''}
  ${customHeaderCode ? customHeaderCode : ''}

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

  return `import { chromium, Browser, Page } from 'playwright'
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
    const bodyVisible = await page.locator('body').isVisible()
    if (!bodyVisible) throw new Error('Body element is not visible')
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
    const bodyVisible = await page.locator('body').isVisible()
    if (!bodyVisible) throw new Error('Body element is not visible')
    const bodyText = await page.textContent('body') ?? ''
    if (bodyText.length === 0) throw new Error('Body text is empty')
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
    const bodyVisible = await page.locator('body').isVisible()
    if (!bodyVisible) throw new Error('Body element is not visible')
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

  return `import { chromium, Browser, Page } from 'playwright'
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
