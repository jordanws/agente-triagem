import { History } from 'lucide-react'
import { getUrgencyTone, type TriageRecord, type UrgencyTone } from '@/lib/diagnosis'
import { cn } from '@/lib/utils'

const BADGE: Record<UrgencyTone, string> = {
  vermelho: 'bg-red-600/15 text-red-400 ring-red-600/40',
  amarelo: 'bg-yellow-400/15 text-yellow-300 ring-yellow-400/40',
  verde: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/40',
  neutro: 'bg-zinc-800 text-zinc-300 ring-zinc-700',
}

export function HistoryTable({ history }: { history: TriageRecord[] }) {
  return (
    <section
      aria-labelledby="historico-triagens"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60"
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-red-600/15 text-red-500">
            <History className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="historico-triagens" className="text-lg font-semibold text-zinc-50">
              Histórico de Triagens do Turno
            </h2>
            <p className="text-sm text-zinc-400">Todas as ocorrências analisadas nesta sessão</p>
          </div>
        </div>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs tabular-nums text-zinc-400">
          {history.length} {history.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {history.length === 0 ? (
        <p className="p-10 text-center text-sm text-zinc-500">
          Nenhuma triagem realizada ainda. As análises aparecerão aqui.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th scope="col" className="px-6 py-3 font-medium">Horário</th>
                <th scope="col" className="px-6 py-3 font-medium">Protocolo</th>
                <th scope="col" className="px-6 py-3 font-medium">Pedido</th>
                <th scope="col" className="px-6 py-3 font-medium">Categoria</th>
                <th scope="col" className="px-6 py-3 font-medium">Urgência</th>
                <th scope="col" className="px-6 py-3 font-medium">Setor</th>
                <th scope="col" className="px-6 py-3 font-medium">Decisão de Alçada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {history.map((item) => {
                const tone = getUrgencyTone(item.score)
                return (
                  <tr key={item.id} className="text-zinc-300 transition-colors hover:bg-zinc-800/40">
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-400">
                      {item.analyzedAt.toLocaleTimeString('pt-BR')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-200">
                      {item.diagnosis.protocolo || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs">
                      {item.diagnosis.telemetria?.pedido_id ?? '—'}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-100">{item.diagnosis.categoria}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                          BADGE[tone],
                        )}
                      >
                        {item.score != null ? `Nível ${item.score}` : item.diagnosis.urgencia}
                      </span>
                    </td>
                    <td className="px-6 py-4">{item.diagnosis.setor}</td>
                    <td className="max-w-xs px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'size-2 shrink-0 rounded-full',
                            item.automated ? 'bg-emerald-500' : 'bg-yellow-400',
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate" title={item.diagnosis.decisaoAlcada}>
                          {item.diagnosis.decisaoAlcada || 'Não informado'}
                        </span>
                        <span className="sr-only">
                          {item.automated ? '(automatizada)' : '(requer revisão)'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
