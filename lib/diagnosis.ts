// Túnel do Cloudflare apontando para o Webhook do n8n local.
// Para testar na sua máquina, substitua pela URL do seu próprio n8n.
export const WEBHOOK_URL =
  'https://nancy-absorption-spyware-airfare.trycloudflare.com/webhook/a481a66e-e45f-438f-9212-d57f7c028de5'

export const CLOUD_ENDPOINT = '/api/triagem'

export type AnalysisMode = 'cloud' | 'n8n'

export type Telemetry = {
  pedido_id: string
  restaurante: string
  valor: string
  status_logistico: string
  perfil_risco: string
}

export type Diagnosis = {
  categoria: string
  urgencia: string
  setor: string
  sugestao: string
  decisaoAlcada: string
  protocolo: string
  telemetria: Telemetry | null
}

export type TriageRecord = {
  id: string
  analyzedAt: Date
  reclamacao: string
  diagnosis: Diagnosis
  score: number | null
  automated: boolean
}

type UnknownRecord = Record<string, unknown>

const FIELD_ALIASES = {
  categoria: ['categoria', 'category'],
  urgencia: ['urgencia', 'nivel_urgencia', 'nivel_de_urgencia', 'urgency', 'prioridade', 'priority'],
  setor: ['setor', 'setor_responsavel', 'departamento', 'department', 'responsavel'],
  sugestao: ['sugestao_resposta', 'sugestao_acao', 'sugestao', 'sugestao_de_acao', 'acao', 'suggestion'],
  decisaoAlcada: ['decisao_alcada', 'decisao_de_alcada', 'alcada', 'decisao'],
  protocolo: ['protocolo', 'protocol', 'numero_protocolo'],
  telemetria: ['telemetria_pedido', 'telemetria', 'pedido', 'telemetry'],
} as const

const TELEMETRY_ALIASES: Record<keyof Telemetry, string[]> = {
  pedido_id: ['pedido_id', 'id_pedido', 'id', 'order_id'],
  restaurante: ['restaurante', 'restaurant', 'loja'],
  valor: ['valor', 'valor_total', 'total', 'amount'],
  status_logistico: ['status_logistico', 'status', 'status_entrega'],
  perfil_risco: ['perfil_risco', 'risco', 'risk_profile'],
}

const KNOWN_KEYS = Object.values(FIELD_ALIASES).flat()

function normalizeKey(key: string) {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]/g, '_')
}

function tryParseJson(value: string): unknown {
  const cleaned = value.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return value
  }
}

function hasAnyField(record: UnknownRecord) {
  const keys = Object.keys(record).map(normalizeKey)
  return KNOWN_KEYS.some((alias) => keys.includes(alias))
}

function unwrap(payload: unknown): UnknownRecord | null {
  if (typeof payload === 'string') {
    const parsed = tryParseJson(payload)
    return typeof parsed === 'string' ? null : unwrap(parsed)
  }
  if (Array.isArray(payload)) return payload.length ? unwrap(payload[0]) : null
  if (payload && typeof payload === 'object') {
    const record = payload as UnknownRecord
    if (hasAnyField(record)) return record
    for (const wrapper of ['data', 'output', 'json', 'result', 'resposta', 'body', 'text']) {
      if (wrapper in record) {
        const inner = unwrap(record[wrapper])
        if (inner) return inner
      }
    }
    return record
  }
  return null
}

function pickRaw(record: UnknownRecord, aliases: readonly string[]): unknown {
  const entries = Object.entries(record).map(([key, value]) => [normalizeKey(key), value] as const)
  for (const alias of aliases) {
    const match = entries.find(([key, value]) => key === alias && value != null && value !== '')
    if (match) return match[1]
  }
  return undefined
}

function pick(record: UnknownRecord, aliases: readonly string[]) {
  const value = pickRaw(record, aliases)
  if (value == null) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function formatCurrency(value: unknown) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\s*[\d.,]+\s*$/.test(value)
        ? Number(value.replace(/\./g, '').replace(',', '.').trim())
        : NaN
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  return value == null || value === '' ? '' : String(value)
}

function parseTelemetry(raw: unknown): Telemetry | null {
  const record =
    typeof raw === 'string' ? (tryParseJson(raw) as unknown) : raw
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  const r = record as UnknownRecord
  return {
    pedido_id: pick(r, TELEMETRY_ALIASES.pedido_id) || '—',
    restaurante: pick(r, TELEMETRY_ALIASES.restaurante) || '—',
    valor: formatCurrency(pickRaw(r, TELEMETRY_ALIASES.valor)) || '—',
    status_logistico: pick(r, TELEMETRY_ALIASES.status_logistico) || '—',
    perfil_risco: pick(r, TELEMETRY_ALIASES.perfil_risco) || '—',
  }
}

export function parseDiagnosis(payload: unknown): Diagnosis {
  const record = unwrap(payload)
  if (record && typeof record.message === 'string' && /workflow was started/i.test(record.message)) {
    throw new Error(
      'O webhook do n8n respondeu antes de terminar a análise ("Workflow was started"). Configure o nó Webhook para responder "When Last Node Finishes" ou use um nó "Respond to Webhook".',
    )
  }
  if (!record || !hasAnyField(record)) {
    throw new Error('A resposta da IA não está no formato esperado.')
  }
  const telemetryRaw = pickRaw(record, FIELD_ALIASES.telemetria)
  const telemetryRecord =
    telemetryRaw && typeof telemetryRaw === 'object' ? (telemetryRaw as UnknownRecord) : null

  return {
    categoria: pick(record, FIELD_ALIASES.categoria) || 'Não informado',
    urgencia: pick(record, FIELD_ALIASES.urgencia) || 'Não informado',
    setor: pick(record, FIELD_ALIASES.setor) || 'Não informado',
    sugestao: pick(record, FIELD_ALIASES.sugestao) || 'Não informado',
    decisaoAlcada: pick(record, FIELD_ALIASES.decisaoAlcada),
    protocolo:
      pick(record, FIELD_ALIASES.protocolo) ||
      (telemetryRecord ? pick(telemetryRecord, FIELD_ALIASES.protocolo) : ''),
    telemetria: parseTelemetry(telemetryRaw),
  }
}

export type UrgencyTone = 'vermelho' | 'amarelo' | 'verde' | 'neutro'

export function getUrgencyScore(value: string): number | null {
  const numeric = value.match(/[1-5]/)
  if (numeric) return Number(numeric[0])
  const v = normalizeKey(value)
  if (/(critic|urgent|emergen)/.test(v)) return 5
  if (/(alta|alto|high)/.test(v)) return 4
  if (/(medi|moderad|medium)/.test(v)) return 3
  if (/(baix|low)/.test(v)) return 2
  return null
}

export function getUrgencyTone(score: number | null): UrgencyTone {
  if (score == null) return 'neutro'
  if (score >= 4) return 'vermelho'
  if (score === 3) return 'amarelo'
  return 'verde'
}

const ESCALATION_PATTERN = /(escal|human|manual|supervis|revis|analista|bloque|negad|recus|fraude|juridic)/

export function isAutomatedDecision(decision: string) {
  if (!decision.trim()) return false
  return !ESCALATION_PATTERN.test(normalizeKey(decision))
}

export function getRiskTone(risk: string): UrgencyTone {
  const v = normalizeKey(risk)
  if (/(alt|high|fraud|critic|suspeit)/.test(v)) return 'vermelho'
  if (/(medi|moderad)/.test(v)) return 'amarelo'
  if (/(baix|low|confiav|normal)/.test(v)) return 'verde'
  return 'neutro'
}
