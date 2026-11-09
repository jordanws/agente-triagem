import { NextResponse } from 'next/server'
import {
  extractOrderId,
  geminiTriage,
  generateProtocol,
  lookupOrder,
  ruleBasedTriage,
  type TriageResponse,
} from '@/lib/triage-engine'

export const maxDuration = 30

const MAX_LENGTH = 5000

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const reclamacao =
    body && typeof body === 'object' && 'reclamacao' in body
      ? String((body as { reclamacao: unknown }).reclamacao ?? '').trim()
      : ''

  if (!reclamacao) {
    return NextResponse.json({ error: 'O campo "reclamacao" é obrigatório.' }, { status: 400 })
  }
  if (reclamacao.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `A reclamação deve ter no máximo ${MAX_LENGTH} caracteres.` },
      { status: 400 },
    )
  }

  const order = lookupOrder(extractOrderId(reclamacao))
  const apiKey = process.env.GEMINI_API_KEY

  let analysis: Omit<TriageResponse, 'protocolo' | 'telemetria_pedido' | 'motor'>
  let motor: TriageResponse['motor'] = 'fallback'

  if (apiKey) {
    try {
      analysis = await geminiTriage(reclamacao, order, apiKey)
      motor = 'gemini'
    } catch (error) {
      console.error('[triagem] Falha no Gemini, usando fallback:', error)
      analysis = ruleBasedTriage(reclamacao, order)
    }
  } else {
    analysis = ruleBasedTriage(reclamacao, order)
  }

  const response: TriageResponse = {
    ...analysis,
    protocolo: generateProtocol(),
    telemetria_pedido: order,
    motor,
  }

  return NextResponse.json(response)
}
