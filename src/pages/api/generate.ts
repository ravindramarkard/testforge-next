import type { NextApiRequest, NextApiResponse } from 'next'
import { generateWithClaude } from '@/lib/generator'
import type { RunConfig } from '@/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const config = req.body as RunConfig
    const code   = await generateWithClaude(config)
    res.status(200).json({ code })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
