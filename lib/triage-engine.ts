import 'server-only'

export type OrderRecord = {
  pedido_id: string
  restaurante: string
  valor: number
  status_logistico: string
  perfil_risco: string
}

export type TriageResponse = {
  categoria: string
  urgencia: number
  setor: string
  sugestao_resposta: string
  decisao_alcada: string
  protocolo: string
  telemetria_pedido: OrderRecord | null
  motor: 'gemini' | 'fallback'
}

const mockDatabase: Record<string, OrderRecord> = {
  '9988': {
    pedido_id: '9988',
    restaurante: 'Burger House Paulista',
    valor: 89.9,
    status_logistico: 'Entregue com atraso de 2h14min',
    perfil_risco: 'Baixo (cliente Gold, 0 estornos em 12 meses)',
  },
  '1020': {
    pedido_id: '1020',
    restaurante: 'Sushi Express Moema',
    valor: 154,
    status_logistico: 'Em rota — saiu para entrega há 15 min (dentro do SLA)',
    perfil_risco: 'Alto (4 estornos nos últimos 30 dias)',
  },
}

const FALLBACK_RESTAURANTS = [
  'Pizzaria Bella Napoli',
  'Açaí da Vila',
  'Cantina do Chef',
  'Poke Station',
  'Churrascaria Gaúcha',
  'Padaria Real',
]
const FALLBACK_STATUS = [
  'Entregue no horário previsto',
  'Em preparo no restaurante',
  'Em rota — entregador a 2 km',
  'Entregue com atraso de 35 min',
]
const FALLBACK_RISK = ['Baixo (cliente recorrente)', 'Médio (2 estornos em 90 dias)', 'Baixo (primeiro pedido)']

export function extractOrderId(text: string): string | null {
  const explicit = text.match(/(?:pedido|order|n[º°o.]?|#)\s*(?:n[º°o.]?\s*)?(\d{3,10})/i)
  if (explicit) return explicit[1]
  const loose = text.match(/\b(\d{3,10})\b/)
  return loose ? loose[1] : null
}

export function lookupOrder(orderId: string | null): OrderRecord | null {
  if (!orderId) return null
  if (mockDatabase[orderId]) return mockDatabase[orderId]
  const seed = [...orderId].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7)
  const at = <T,>(list: T[], offset: number) => list[Math.abs(seed + offset) % list.length]
  return {
    pedido_id: orderId,
    restaurante: at(FALLBACK_RESTAURANTS, 0),
    valor: Math.round((30 + (Math.abs(seed) % 17000) / 100) * 100) / 100,
    status_logistico: at(FALLBACK_STATUS, 3),
    perfil_risco: at(FALLBACK_RISK, 5),
  }
}

export function generateProtocol() {
  const digits = Array.from(crypto.getRandomValues(new Uint32Array(1)))[0] % 1_000_000
  return `IFD-${digits.toString().padStart(6, '0')}`
}

export function sanitizeJson(raw: string): Record<string, unknown> {
  const withoutFences = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  const start = withoutFences.indexOf('{')
  const end = withoutFences.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('Resposta da IA não contém JSON.')
  const candidate = withoutFences
    .slice(start, end + 1)
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(candidate) as Record<string, unknown>
}

const ALCADA_RULES = `Regras de alçada (obrigatórias):
- Se o perfil_risco for "Alto" ou houver indício de fraude (ex.: pedido ainda dentro do SLA e cliente exige reembolso total), a decisão deve ser "BLOQUEADO — Escalar para Análise Antifraude (reembolso automático negado)".
- Se urgência >= 4 e perfil_risco "Baixo", a decisão deve ser "APROVADO — Estorno integral automático de R$ <valor>".
- Se urgência == 3, a decisão deve ser "APROVADO — Cupom automático de R$ 20,00".
- Se urgência <= 2, a decisão deve ser "APROVADO — Resposta padrão automática, sem compensação".`

function buildPrompt(complaint: string, order: OrderRecord | null) {
  return `Você é o agente de triagem de ocorrências da Central de Operações de um app de delivery.
Analise a reclamação do cliente usando os dados resgatados do banco de pedidos (Tool Calling).

Reclamação: """${complaint}"""

Telemetria do pedido (banco de pedidos): ${order ? JSON.stringify(order) : 'Nenhum pedido identificado.'}

${ALCADA_RULES}

Responda SOMENTE com um JSON válido, sem markdown, exatamente neste formato:
{
  "categoria": "string curta (ex.: Atraso na Entrega, Produto Danificado, Suspeita de Fraude, Pedido Incorreto)",
  "urgencia": número inteiro de 1 a 5,
  "setor": "Logística | Financeiro | Prevenção a Fraudes | Qualidade | Atendimento",
  "sugestao_resposta": "mensagem empática e objetiva para enviar ao cliente, em português",
  "decisao_alcada": "decisão conforme as regras de alçada"
}`
}

function isHighRisk(order: OrderRecord | null) {
  return !!order && /^alto/i.test(order.perfil_risco)
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function decideAlcada(urgencia: number, order: OrderRecord | null, fraudSignal: boolean) {
  if (isHighRisk(order) || fraudSignal) {
    return 'BLOQUEADO — Escalar para Análise Antifraude (reembolso automático negado)'
  }
  if (urgencia >= 4) {
    return `APROVADO — Estorno integral automático de ${order ? formatBRL(order.valor) : 'valor do pedido'}`
  }
  if (urgencia === 3) return 'APROVADO — Cupom automático de R$ 20,00'
  return 'APROVADO — Resposta padrão automática, sem compensação'
}

export function ruleBasedTriage(complaint: string, order: OrderRecord | null) {
  const text = complaint.toLowerCase()
  const withinSla = !!order && /dentro do sla|em preparo|em rota/i.test(order.status_logistico)
  const demandsFullRefund = /(dinheiro|reembolso|estorno).*(todo|integral|imediat)|(todo|integral).*(dinheiro|reembolso)/.test(text)
  const fraudSignal = isHighRisk(order) || (withinSla && demandsFullRefund)

  let categoria = 'Reclamação Geral'
  let setor = 'Atendimento'
  let urgencia = 2

  if (fraudSignal) {
    categoria = 'Suspeita de Fraude'
    setor = 'Prevenção a Fraudes'
    urgencia = 4
  } else if (/(atras|demor|não chegou|nao chegou|hora)/.test(text)) {
    categoria = 'Atraso na Entrega'
    setor = 'Logística'
    urgencia = /(hora|horas|procon|absurdo)/.test(text) ? 5 : 3
  } else if (/(amass|danific|quebr|vaz|frio|estrag)/.test(text)) {
    categoria = 'Produto Danificado'
    setor = 'Qualidade'
    urgencia = 3
  } else if (/(errad|faltando|incorret|trocad)/.test(text)) {
    categoria = 'Pedido Incorreto'
    setor = 'Qualidade'
    urgencia = 3
  } else if (/(cobran|cobrad|valor|pagamento)/.test(text)) {
    categoria = 'Cobrança Indevida'
    setor = 'Financeiro'
    urgencia = 3
  }

  if (!fraudSignal && /(procon|advogad|processo|reclame aqui|pelo amor de deus)/.test(text)) {
    urgencia = Math.max(urgencia, 5)
  }

  const sugestao_resposta = fraudSignal
    ? 'Olá! Entendemos sua preocupação. Seu pedido ainda está dentro do prazo de entrega e segue em rota. Nossa equipe especializada está acompanhando o caso e retornará em breve com uma atualização.'
    : urgencia >= 4
      ? `Olá! Pedimos sinceras desculpas pela experiência com o pedido${order ? ` #${order.pedido_id}` : ''}. Já aprovamos o estorno integral, que será creditado em até 2 dias úteis. Estamos tratando o ocorrido com o restaurante e a logística.`
      : 'Olá! Sentimos muito pelo ocorrido. Como forma de desculpas, liberamos um cupom de desconto para o seu próximo pedido. Conte com a gente!'

  return {
    categoria,
    urgencia,
    setor,
    sugestao_resposta,
    decisao_alcada: decideAlcada(urgencia, order, fraudSignal),
  }
}

export async function geminiTriage(complaint: string, order: OrderRecord | null, apiKey: string) {
  // Passando a chave direto na URL e usando a versão correta do modelo
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(complaint, order) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
    cache: 'no-store', // Obriga o Next.js a não usar cache da tentativa anterior
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    // Agora ele vai ler a mensagem real de erro do Google para sabermos exatamente o que rolou
    const errorDetail = await response.text();
    console.error('[triagem] Erro detalhado da API do Google:', errorDetail);
    throw new Error(`Gemini respondeu com status ${response.status}: ${errorDetail}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const parsed = sanitizeJson(text);
  const urgencia = Math.min(5, Math.max(1, Math.round(Number(parsed.urgencia) || 3)));
  
  return {
    categoria: String(parsed.categoria ?? 'Reclamação Geral'),
    urgencia,
    setor: String(parsed.setor ?? 'Atendimento'),
    sugestao_resposta: String(parsed.sugestao_resposta ?? parsed.sugestao_acao ?? ''),
    decisao_alcada: String(parsed.decisao_alcada ?? decideAlcada(urgencia, order, false)),
  };
}
