import {
  AlertTriangle,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Database,
  Gauge,
  Lightbulb,
  Loader2,
  Scale,
  Tag,
  UserCheck,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  getRiskTone,
  getUrgencyScore,
  getUrgencyTone,
  isAutomatedDecision,
  type Diagnosis,
  type Telemetry,
  type UrgencyTone,
} from '@/lib/diagnosis'
import { cn } from '@/lib/utils'

type DiagnosisPanelProps = {
  loading: boolean
  error: string | null
  result: Diagnosis | null
  onDismissError: () => void
}

const URGENCY_STYLES: Record<UrgencyTone, { card: string; badge: string; bar: string }> = {
  vermelho: {
    card: 'border-red-600/60 bg-red-600/10',
    badge: 'bg-red-600 text-white',
    bar: 'bg-red-500',
  },
  amarelo: {
    card: 'border-yellow-500/50 bg-yellow-500/10',
    badge: 'bg-yellow-400 text-zinc-950',
    bar: 'bg-yellow-400',
  },
  verde: {
    card: 'border-emerald-500/50 bg-emerald-500/10',
    badge: 'bg-emerald-500 text-zinc-950',
    bar: 'bg-emerald-500',
  },
  neutro: {
    card: 'border-zinc-800 bg-zinc-950',
    badge: 'bg-zinc-700 text-zinc-100',
    bar: 'bg-zinc-500',
  },
}

export function DiagnosisPanel({ loading, error, result, onDismissError }: DiagnosisPanelProps) {
  return (
    <section
      aria-labelledby="diagnostico-ia"
      aria-busy={loading}
      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-red-600/15 text-red-500">
          <BrainCircuit className="size-5 rotate-90" aria-hidden="true" />
        </div>
        <div>
          <h2 id="diagnostico-ia" className="text-lg font-semibold text-zinc-50">
            Diagnóstico de IA
          </h2>
          <p className="text-sm text-zinc-400">Classificação automática da ocorrência</p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-xl border border-red-600/50 bg-red-600/10 p-4 text-sm text-red-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold text-red-100">Falha ao analisar a ocorrência</p>
            <p className="mt-1 text-red-200/80">{error}</p>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            className="rounded-md p-1 text-red-300 hover:bg-red-600/20 hover:text-red-100"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Fechar alerta</span>
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col" aria-live="polite">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <Loader2 className="size-10 animate-spin text-red-500" aria-hidden="true" />
            <div>
              <p className="font-medium text-zinc-100">Analisando reclamação...</p>
              <p className="text-sm text-zinc-500">A IA está classificando a ocorrência</p>
            </div>
          </div>
        ) : result ? (
          <ResultCards result={result} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-16 text-center">
            <BrainCircuit className="size-10 rotate-90 text-zinc-700" aria-hidden="true" />
            <p className="max-w-xs text-sm text-zinc-500">
              O diagnóstico aparecerá aqui após você enviar uma reclamação para análise.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function ResultCards({ result }: { result: Diagnosis }) {
  const score = getUrgencyScore(result.urgencia)
  const urgency = URGENCY_STYLES[getUrgencyTone(score)]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InfoCard icon={<Tag className="size-4" />} label="Categoria">
        <p className="text-base font-semibold text-zinc-50">{result.categoria}</p>
      </InfoCard>

      <InfoCard icon={<Gauge className="size-4" />} label="Nível de Urgência" className={urgency.card}>
        <span
          className={cn(
            'inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold',
            urgency.badge,
          )}
        >
          {score != null ? `Nível ${score} de 5` : result.urgencia}
        </span>
        <div
          role="meter"
          aria-label="Nível de urgência"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={score ?? undefined}
          className="flex gap-1.5"
        >
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                score != null && step <= score ? urgency.bar : 'bg-zinc-800',
              )}
            />
          ))}
        </div>
      </InfoCard>

      <InfoCard icon={<Building2 className="size-4" />} label="Setor Responsável">
        <p className="text-base font-semibold text-zinc-50">{result.setor}</p>
      </InfoCard>

      <InfoCard
        icon={<Lightbulb className="size-4" />}
        label="Sugestão de Ação"
        className="sm:col-span-2"
      >
        <p className="text-sm leading-relaxed text-zinc-200">{result.sugestao}</p>
      </InfoCard>

      <DecisionCard decision={result.decisaoAlcada} />

      <TelemetrySection telemetry={result.telemetria} protocolo={result.protocolo} />
    </div>
  )
}

function DecisionCard({ decision }: { decision: string }) {
  const automated = isAutomatedDecision(decision)
  const StatusIcon = automated ? CheckCircle2 : UserCheck

  return (
    <article className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-red-600/60 bg-gradient-to-br from-red-600/20 via-red-600/5 to-zinc-950 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-300">
          <Scale className="size-4 text-red-500" aria-hidden="true" />
          Decisão de Alçada Automática
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            automated ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-400/15 text-yellow-300',
          )}
        >
          <StatusIcon className="size-3.5" aria-hidden="true" />
          {automated ? 'Automatizada' : 'Requer revisão'}
        </span>
      </div>
      <p className="text-lg font-bold leading-snug text-zinc-50 text-pretty">
        {decision || 'Nenhuma decisão de alçada retornada pela IA.'}
      </p>
    </article>
  )
}

const RISK_STYLES: Record<UrgencyTone, string> = {
  vermelho: 'bg-red-600/15 text-red-400 ring-red-600/40',
  amarelo: 'bg-yellow-400/15 text-yellow-300 ring-yellow-400/40',
  verde: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/40',
  neutro: 'bg-zinc-800 text-zinc-300 ring-zinc-700',
}

function TelemetrySection({
  telemetry,
  protocolo,
}: {
  telemetry: Telemetry | null
  protocolo: string
}) {
  const rows: { label: string; value: ReactNode }[] = telemetry
    ? [
        { label: 'Pedido ID', value: <span className="font-mono">{telemetry.pedido_id}</span> },
        { label: 'Restaurante', value: telemetry.restaurante },
        { label: 'Valor', value: <span className="tabular-nums">{telemetry.valor}</span> },
        { label: 'Status Logístico', value: telemetry.status_logistico },
        {
          label: 'Perfil de Risco',
          value: (
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                RISK_STYLES[getRiskTone(telemetry.perfil_risco)],
              )}
            >
              {telemetry.perfil_risco}
            </span>
          ),
        },
      ]
    : []

  return (
    <section
      aria-labelledby="telemetria-pedido"
      className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:col-span-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          id="telemetria-pedido"
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400"
        >
          <Database className="size-4 text-red-500" aria-hidden="true" />
          Telemetria Resgatada via Tool Calling (Banco de Pedidos)
        </h3>
        <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-300">
          Protocolo: <span className="text-zinc-50">{protocolo || '—'}</span>
        </span>
      </div>

      {telemetry ? (
        <dl className="grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1 bg-zinc-950 p-3">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{row.label}</dt>
              <dd className="text-sm font-semibold text-zinc-100">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-zinc-500">Nenhuma telemetria de pedido foi retornada pela IA.</p>
      )}
    </section>
  )
}

function InfoCard({
  icon,
  label,
  children,
  className,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
        <span className="text-red-500" aria-hidden="true">
          {icon}
        </span>
        {label}
      </div>
      {children}
    </article>
  )
}
