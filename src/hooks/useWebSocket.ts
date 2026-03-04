'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { WsMessage, LogEntry, TestStep, RunStatus } from '@/types'

export type WsReadyState = 'connecting' | 'open' | 'closed'

interface UseWsReturn {
  readyState: WsReadyState
  send: (msg: object) => void
  logs: LogEntry[]
  steps: TestStep[]
  status: RunStatus
  progress: number
  script: string
  setScript: (code: string) => void
  passed: number
  failed: number
  duration: number
  screenshots: string[]
  reportPath?: string
  clearLogs: () => void
}

export function useWebSocket(url: string | null, onHealed?: (testCaseId: string, healedScript: string) => void): UseWsReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const [readyState, setReadyState] = useState<WsReadyState>('connecting')
  const [logs, setLogs]             = useState<LogEntry[]>([])
  const [steps, setSteps]           = useState<TestStep[]>([])
  const [status, setStatus]         = useState<RunStatus>('idle')
  const [progress, setProgress]     = useState(0)
  const [script, setScript]         = useState('')
  const [passed, setPassed]         = useState(0)
  const [failed, setFailed]         = useState(0)
  const [duration, setDuration]     = useState(0)
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [reportPath, setReportPath] = useState<string | undefined>(undefined)

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).slice(2),
      level,
      message,
      timestamp: new Date().toLocaleTimeString('en', { hour12: false }),
    }
    setLogs((prev) => [...prev.slice(-500), entry])
  }, [])

  // Use refs to track if we've already initialized to prevent re-initialization
  const initializedRef = useRef<string | null>(null)
  const retryCountRef = useRef(0)
  const isConnectingRef = useRef(false)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addLogRef = useRef(addLog)
  const onHealedRef = useRef(onHealed)

  // Update refs when callbacks change (without triggering effect)
  useEffect(() => {
    addLogRef.current = addLog
    onHealedRef.current = onHealed
  }, [addLog, onHealed])

  useEffect(() => {
    console.log('[useWebSocket] URL changed:', url, 'Previous URL:', initializedRef.current)
    
    // Prevent re-initialization if URL hasn't actually changed
    if (initializedRef.current === url) {
      console.log('[useWebSocket] URL unchanged, skipping re-initialization')
      return
    }
    
    if (!url) {
      console.log('[useWebSocket] No URL provided, setting state to connecting')
      setReadyState('connecting')
      initializedRef.current = null
      return
    }

    // Mark as initialized with this URL
    initializedRef.current = url

    // Reset retry count when URL changes (new connection attempt)
    retryCountRef.current = 0
    isConnectingRef.current = false

    // Reset state when URL changes
    console.log('[useWebSocket] Starting connection to:', url)
    setReadyState('connecting')

    let ws: WebSocket | null = null
    const MAX_RETRIES = 5

    const connect = () => {
      // Prevent multiple simultaneous connection attempts
      if (isConnectingRef.current) {
        console.log('[WebSocket] Already connecting, skipping...')
        return
      }

      // Stop retrying after max attempts
      if (retryCountRef.current >= MAX_RETRIES) {
        console.error('[WebSocket] Max retries reached, giving up')
        setReadyState('closed')
        isConnectingRef.current = false
        return
      }

      try {
        isConnectingRef.current = true
        retryCountRef.current++
        console.log(`[WebSocket] Attempting connection (${retryCountRef.current}/${MAX_RETRIES})...`)
        
        console.log('[WebSocket] Creating WebSocket instance for:', url)
        ws = new WebSocket(url)
        wsRef.current = ws
        setReadyState('connecting')
        
        // Add immediate state check
        console.log('[WebSocket] WebSocket created, initial readyState:', ws.readyState)

        ws.onopen = () => {
          isConnectingRef.current = false
          retryCountRef.current = 0 // Reset on success
          setReadyState('open')
          console.log('[WebSocket] ✅ Connected successfully to', url)
        }

        ws.onclose = (event) => {
          isConnectingRef.current = false
          ws = null
          wsRef.current = null
          
          console.log('[WebSocket] ❌ Closed', { code: event.code, reason: event.reason, wasClean: event.wasClean })
          
          // Don't retry on normal closure (code 1000) or if max retries reached
          if (event.code === 1000 || retryCountRef.current >= MAX_RETRIES) {
            console.log('[WebSocket] Stopping retries', { code: event.code, retryCount: retryCountRef.current, maxRetries: MAX_RETRIES })
            setReadyState('closed')
            return
          }
          
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 16000)
          console.log(`[WebSocket] 🔄 Retrying in ${delay}ms... (attempt ${retryCountRef.current}/${MAX_RETRIES})`)
          retryTimeoutRef.current = setTimeout(connect, delay)
        }

        ws.onerror = (error) => {
          isConnectingRef.current = false
          console.error('[WebSocket] ⚠️ Connection error:', error)
          console.error('[WebSocket] URL was:', url)
          console.error('[WebSocket] Error details:', {
            type: error.type,
            target: error.target,
            currentTarget: error.currentTarget
          })
          // Try to get more error info from the WebSocket
          if (ws && ws.readyState !== WebSocket.OPEN) {
            console.error('[WebSocket] ReadyState:', ws.readyState, {
              0: 'CONNECTING',
              1: 'OPEN',
              2: 'CLOSING',
              3: 'CLOSED'
            }[ws.readyState])
          }
          // Don't set state here - let onclose handle it
          // This prevents double state updates
        }

        ws.onmessage = (e) => {
          let msg: WsMessage
          try { msg = JSON.parse(e.data) } catch { return }

          switch (msg.type) {
            case 'connected':
              addLogRef.current('info', msg.message)
              break
            case 'status':
              setStatus(msg.status)
              addLogRef.current('action', msg.message)
              break
            case 'script':
              setScript(msg.code)
              break
            case 'log':
              addLogRef.current(msg.level, msg.message)
              break
            case 'step_start':
              setSteps((prev) => [...prev, { id: msg.stepId, name: msg.name, status: 'running' }])
              break
            case 'step_end':
              setSteps((prev) => prev.map((s) =>
                s.id === msg.stepId ? { ...s, status: msg.status, duration: msg.duration } : s
              ))
              break
            case 'progress':
              setProgress(msg.percent)
              break
            case 'done':
              setStatus(msg.status)
              setPassed(msg.passed)
              setFailed(msg.failed)
              setDuration(msg.duration)
              setScreenshots(msg.screenshots)
              setReportPath(msg.reportPath)
              setProgress(100)
              break
            case 'error':
              addLogRef.current('error', `❌ ${msg.message}`)
              setStatus('error')
              break
            case 'validation':
              // Validation results from script generation
              if (msg.result.issues.length > 0) {
                msg.result.issues.forEach((issue) => {
                  const level = issue.level === 'error' ? 'error' : issue.level === 'warning' ? 'warn' : 'info'
                  addLogRef.current(level, `${issue.level.toUpperCase()}: ${issue.message}${issue.suggestion ? ` - ${issue.suggestion}` : ''}`)
                })
              }
              if (msg.result.verificationMessage) {
                addLogRef.current('info', `✓ ${msg.result.verificationMessage}`)
              }
              break
            case 'healed':
              // Healed script ready - notify Dashboard to update test case
              if (onHealedRef.current) {
                onHealedRef.current(msg.testCaseId, msg.healedScript)
              }
              break
            case 'browser_action':
              // Browser action during script generation - log it
              addLogRef.current('action', `🌐 ${msg.action.description}`)
              break
          }
        }
      } catch (err) {
        isConnectingRef.current = false
        console.error('[WebSocket] Connection exception', err)
        
        // Only retry if we haven't exceeded max retries
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 16000)
          retryTimeoutRef.current = setTimeout(connect, delay)
        } else {
          setReadyState('closed')
        }
      }
    }

    connect()
    return () => {
      console.log('[useWebSocket] Cleaning up connection for URL:', url)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      isConnectingRef.current = false
      retryCountRef.current = 0 // Reset retry count on cleanup
      if (ws) {
        ws.onclose = null // Prevent retry on cleanup
        ws.onerror = null
        ws.onopen = null // Prevent state updates after cleanup
        ws.close()
      }
      wsRef.current = null
      // Don't reset initializedRef here - let it persist to prevent re-init
    }
  }, [url]) // Only depend on URL - callbacks are stored in refs

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
    setSteps([])
    setProgress(0)
    setPassed(0)
    setFailed(0)
    setDuration(0)
    setScreenshots([])
    setReportPath(undefined)
    setStatus('idle')
  }, [])

  return { readyState, send, logs, steps, status, progress, script, setScript, passed, failed, duration, screenshots, reportPath, clearLogs }
}
