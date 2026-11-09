'use client'

import {
  Cloud,
  FlaskConical,
  Loader2,
  MessageSquareWarning,
  ShieldAlert,
  Siren,
  Sparkles,
  Workflow,
} from 'lucide-react'
import type { AnalysisMode } from '@/lib/diagnosis'

type OccurrenceFormProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
  mode: AnalysisMode
  onModeChange: (mode: AnalysisMode) => void
}

const MODES = [
  { value: 'cloud', label: 'Modo Cloud 24/7 (Vercel + Gemini API)', icon: Cloud },
  { value: 'n8n', label: 'Modo n8n Local (Webhook)', icon: Workflow },
] as const

const TEST_CASES = [
  {
    label: 'Caso Crítico #9988',
    icon: Siren,
    text: 'Pelo amor de Deus, meu pedido 9988 atrasou mais de 2 horas! A caixa veio amassada e quero meu estorno agora ou vou no Procon.',
  },
  {
    label: 'Suspeita de Fraude #1020',
    icon: ShieldAlert,
    text: 'Meu pedido 1020 ainda não chegou, já faz 15 minutos e quero meu dinheiro todo de volta imediatamente!',
  },
]

export function OccurrenceForm({
  value,
  onChange,
  onSubmit,
  loading,
  mode,
  onModeChange,
}: OccurrenceFormProps) {
  const disabled = loading || value.trim().length === 0

  return (
    <section
      aria-labelledby="nova-ocorrencia"
      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
    >
      <div
        role="radiogroup"
        aria-label="Motor de análise"
        className="mb-5 flex flex-wrap gap-1 self-start rounded-lg border border-zinc-800 bg-zinc-950 p-1"
      >
        {MODES.map(({ value: modeValue, label, icon: Icon }) => {
          const active = mode === modeValue
          return (
            <button
              key={modeValue}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={loading}
              onClick={() => onModeChange(modeValue)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`size-3.5 ${active ? 'text-red-500' : ''}`} aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-red-600/15 text-red-500">
          <MessageSquareWarning className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="nova-ocorrencia" className="text-lg font-semibold text-zinc-50">
            Nova Ocorrência
          </h2>
          <p className="text-sm text-zinc-400">Cole a reclamação do cliente para análise</p>
        </div>
      </div>

      <form
        className="flex flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!disabled) onSubmit()
        }}
      >
        <label htmlFor="reclamacao" className="text-sm font-medium text-zinc-300">
          Reclamação do cliente
        </label>
        <textarea
          id="reclamacao"
          name="reclamacao"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: Meu pedido chegou frio e faltando itens. Já faz 2 horas que tento contato com o restaurante..."
          className="min-h-64 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/30"
        />

        <fieldset className="flex flex-col gap-2 rounded-xl border border-dashed border-zinc-800 p-3">
          <legend className="flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <FlaskConical className="size-3.5" aria-hidden="true" />
            Preenchimento Rápido de Teste
          </legend>
          <div className="flex flex-wrap gap-2">
            {TEST_CASES.map(({ label, icon: Icon, text }) => (
              <button
                key={label}
                type="button"
                disabled={loading}
                onClick={() => onChange(text)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-red-600/60 hover:bg-red-600/10 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="size-3.5 text-red-500" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-zinc-500">{value.length} caracteres</span>
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="size-4" aria-hidden="true" />
            )}
            {loading ? 'Analisando...' : 'Analisar com IA'}
          </button>
        </div>
      </form>
    </section>
  )
}
