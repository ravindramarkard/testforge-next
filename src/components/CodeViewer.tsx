'use client'
import { useState, useCallback } from 'react'

interface Props {
  code: string
}

function syntaxHighlight(code: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const raw = esc(code)

  return raw
    // Comments (must come first)
    .replace(/(\/\/[^\n]*)/g, '<span class="tok-cmt">$1</span>')
    // Template literals (basic)
    .replace(/(`[^`]*`)/g, '<span class="tok-str">$1</span>')
    // Single & double quoted strings
    .replace(/(&#x27;(?:[^&#x27;\\]|\\.)*&#x27;|&quot;(?:[^&quot;\\]|\\.)*&quot;)/g, '<span class="tok-str">$1</span>')
    // Keywords
    .replace(/\b(import|export|from|const|let|var|function|async|await|return|new|if|else|for|of|in|class|interface|type|extends|implements|throw|try|catch|finally|void|null|undefined|true|false|break|continue|switch|case|default|typeof|instanceof)\b/g,
      '<span class="tok-kw">$1</span>')
    // Playwright built-ins
    .replace(/\b(test|expect|describe|beforeEach|afterEach|beforeAll|afterAll|page|browser|context|request|chromium|firefox|webkit)\b/g,
      '<span class="tok-fn">$1</span>')
    // Numbers
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>')
    // Decorators / types
    .replace(/\b([A-Z][a-zA-Z]+(?:Type|Config|Result|Context|Response|Request)?)\b/g,
      '<span class="tok-cls">$1</span>')
}

export default function CodeViewer({ code }: Props) {
  const [copied, setCopied] = useState(false)

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [code])

  const download = useCallback(() => {
    const blob = new Blob([code], { type: 'text/typescript' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `testforge_${Date.now()}.spec.ts`
    a.click()
  }, [code])

  const lines = code.split('\n').length

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-forge-muted">
        <div className="w-20 h-20 rounded-2xl bg-forge-surface border border-forge-border
          flex items-center justify-center text-3xl">
          ⚡
        </div>
        <div className="text-center">
          <p className="text-forge-text font-bold text-base mb-1">Ready to generate</p>
          <p className="text-sm max-w-sm leading-relaxed">
            Enter a test description above, select headed mode, and click{' '}
            <strong className="text-forge-accent">Run Test</strong> — a real browser will open.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-forge-surface border-b border-forge-border shrink-0">
        <span className="text-[10px] font-mono text-forge-muted mr-auto">
          playwright · typescript · {lines} lines
        </span>
        <ToolBtn onClick={copyCode}>{copied ? '✅ Copied' : '📋 Copy'}</ToolBtn>
        <ToolBtn onClick={download}>⬇ Download .spec.ts</ToolBtn>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto bg-forge-bg">
        <style>{`
          .tok-kw  { color: #c792ea; }
          .tok-fn  { color: #82aaff; }
          .tok-str { color: #c3e88d; }
          .tok-cmt { color: #4a6278; font-style: italic; }
          .tok-num { color: #f78c6c; }
          .tok-cls { color: #ffcb6b; }
        `}</style>
        <pre
          className="p-5 font-mono text-[11.5px] leading-[1.8] text-forge-text whitespace-pre overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: syntaxHighlight(code) }}
        />
      </div>
    </div>
  )
}

function ToolBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-forge-border
        bg-forge-surface2 text-forge-muted text-[10px] font-mono cursor-pointer
        hover:text-forge-text hover:border-forge-accent transition-all duration-150"
    >
      {children}
    </button>
  )
}
