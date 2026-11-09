'use client'

import { Activity } from 'lucide-react'
import { useState } from 'react'
import { DiagnosisPanel } from '@/components/diagnosis-panel'
import { HistoryTable } from '@/components/history-table'
import { KpiBar } from '@/components/kpi-bar'
import { OccurrenceForm } from '@/components/occurrence-form'
import {
  CLOUD_ENDPOINT,
  WEBHOOK_URL,
  type AnalysisMode,
  getUrgencyScore,
  isAutomatedDecision,
  parseDiagnosis,
  type Diagnosis,
  type TriageRecord,
} from '@/lib/diagnosis'

export function OperationsDashboard() {
  const [complaint, setComplaint] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Diagnosis | null>(null)
  const [history, setHistory] = useState<TriageRecord[]>([])
  const [mode, setMode] = useState<AnalysisMode>('cloud')

  async function analyze() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch(mode === 'cloud' ? CLOUD_ENDPOINT : WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reclamacao: complaint }),
      })
      const text = await response.text()
      if (!response.ok) {
        let detail = ''
        try {
          detail = (JSON.parse(text) as { error?: string }).error ?? ''
        } catch {}
        throw new Error(detail || `O servidor respondeu com status ${response.status}.`)
      }
      let payload: unknown = text
      try {
        payload = JSON.parse(text)
      } catch {}
      const diagnosis = parseDiagnosis(payload)
      setResult(diagnosis)
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          analyzedAt: new Date(),
          reclamacao: complaint,
          diagnosis,
          score: getUrgencyScore(diagnosis.urgencia),
          automated: isAutomatedDecision(diagnosis.decisaoAlcada),
        },
        ...prev,
      ])
    } catch (err) {
      const message =
        err instanceof TypeError
          ? mode === 'n8n'
            ? 'Não foi possível conectar ao webhook do n8n. Verifique se ele está online e permite CORS.'
            : 'Não foi possível conectar à API de triagem.'
          : err instanceof Error
            ? err.message
            : 'Erro desconhecido.'
      setError(message)
      window.alert(`Erro ao analisar a ocorrência: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-600 text-white">
              <Activity className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-50">Central de Operações</h1>
              <p className="text-xs text-zinc-500">Triagem inteligente de ocorrências</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
            <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
            IA ativa
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
        <KpiBar history={history} />
        <div className="grid gap-6 lg:grid-cols-2">
          <OccurrenceForm value={complaint} onChange={setComplaint} onSubmit={analyze}
            loading={loading}
            mode={mode}
            onModeChange={setMode}
          />
          <DiagnosisPanel
            loading={loading}
            error={error}
            result={result}
            onDismissError={() => setError(null)}
          />
        </div>
        <HistoryTable history={history} />
      </main>
    </div>
  )
}
