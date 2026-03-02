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
  clearLogs: () => void
}

export function useWebSocket(url: string): UseWsReturn {
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

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).slice(2),
      level,
      message,
      timestamp: new Date().toLocaleTimeString('en', { hour12: false }),
    }
    setLogs((prev) => [...prev.slice(-500), entry])
  }, [])

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>
    let ws: WebSocket

    const connect = () => {
      try {
        ws = new WebSocket(url)
        wsRef.current = ws
        setReadyState('connecting')

        ws.onopen  = () => setReadyState('open')
        ws.onclose = () => {
          setReadyState('closed')
          retryTimeout = setTimeout(connect, 3000)
        }
        ws.onerror = () => setReadyState('closed')

        ws.onmessage = (e) => {
          let msg: WsMessage
          try { msg = JSON.parse(e.data) } catch { return }

          switch (msg.type) {
            case 'connected':
              addLog('info', msg.message)
              break
            case 'status':
              setStatus(msg.status)
              addLog('action', msg.message)
              break
            case 'script':
              setScript(msg.code)
              break
            case 'log':
              addLog(msg.level, msg.message)
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
              setProgress(100)
              break
            case 'error':
              addLog('error', `❌ ${msg.message}`)
              setStatus('error')
              break
          }
        }
      } catch {
        retryTimeout = setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      clearTimeout(retryTimeout)
      ws?.close()
    }
  }, [url, addLog])

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
    setStatus('idle')
  }, [])

  return { readyState, send, logs, steps, status, progress, script, setScript, passed, failed, duration, screenshots, clearLogs }
}
