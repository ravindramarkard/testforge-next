import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TestForge AI — Playwright Automation Studio',
  description: 'AI-powered Playwright test generation and execution with real browser support',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
