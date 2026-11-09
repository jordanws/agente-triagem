import { Bot, ClipboardList, Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TriageRecord } from '@/lib/diagnosis'

export function KpiBar({ history }: { history: TriageRecord[] }) {
  const total = history.length
  const critical = history.filter((item) => item.score != null && item.score >= 4).length
  const automated = history.filter((item) => item.automated).length
  const automationRate = total ? Math.round((automated / total) * 100) : 0

  return (
    <section aria-label="Indicadores do turno" className="grid gap-4 sm:grid-cols-3">
      <KpiCard
        icon={<ClipboardList className="size-5" />}
        label="Total Analisado"
        value={String(total)}
        hint="Ocorrências triadas neste turno"
      />
      <KpiCard
        icon={<Flame className="size-5" />}
        label="Casos Críticos"
        value={String(critical)}
        hint="Urgência maior ou igual a 4"
        highlight={critical > 0}
      />
      <KpiCard
        icon={<Bot className="size-5" />}
        label="Taxa de Automação"
        value={`${automationRate}%`}
        hint={`${automated} de ${total} decididas sem escalonamento`}
        progress={automationRate}
      />
    </section>
  )
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  highlight,
  progress,
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
  highlight?: boolean
  progress?: number
}) {
  return (
    <article
      className={
        highlight
          ? 'flex flex-col gap-3 rounded-2xl border border-red-600/50 bg-red-600/10 p-5'
          : 'flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5'
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</span>
        <span className="text-red-500" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold tabular-nums tracking-tight text-zinc-50">{value}</p>
      {progress != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
          <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="text-xs text-zinc-500">{hint}</p>
    </article>
  )
}
