import type { NextApiRequest, NextApiResponse } from 'next'
import { getWss } from '@/lib/wsServer'

const WS_PORT = parseInt(process.env.TESTFORGE_WS_PORT || '4002', 10)

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    getWss() // boots the singleton WS server if not already running
    res.status(200).json({ ok: true, port: WS_PORT })
  } catch (err: any) {
    // EADDRINUSE means it's already running — that's fine
    if (err.code === 'EADDRINUSE') {
      res.status(200).json({ ok: true, port: WS_PORT, note: 'already running' })
    } else {
      res.status(500).json({ ok: false, error: err.message })
    }
  }
}
