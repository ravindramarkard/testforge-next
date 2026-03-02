import type { NextApiRequest, NextApiResponse } from 'next'
import { testAIConnection, type AITestConfig } from '@/lib/generator'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const { aiProvider, apiKey, aiModel, aiBaseUrl } = req.body as AITestConfig
    if (!aiProvider) {
      return res.status(400).json({ ok: false, error: 'aiProvider is required' })
    }
    await testAIConnection({ aiProvider, apiKey, aiModel, aiBaseUrl })
    return res.status(200).json({ ok: true, message: 'Connection successful' })
  } catch (err: any) {
    return res.status(200).json({
      ok: false,
      error: err?.message ?? String(err),
    })
  }
}
