import Link from 'next/link'
import { db } from '@/lib/db'
import { units, orderCycles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const revalidate = 0

export default async function HomePage() {
  const openCycle = await db.query.orderCycles.findFirst({
    where: eq(orderCycles.status, 'open'),
  })

  const allUnits = await db.select().from(units).orderBy(units.name)

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
              DS
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-none text-lg">DentalSul</h1>
              <p className="text-xs text-slate-500 font-medium">Pedido Mensal de Suprimentos</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Área do Orçamentista →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {!openCycle ? (
          <div className="bg-white border rounded-2xl p-8 text-center space-y-3 shadow-sm max-w-xl mx-auto my-12">
            <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl">
              🕒
            </div>
            <h2 className="text-xl font-bold text-slate-800">Nenhum Pedido Mensal Aberto</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              O período de envio de pedidos está fechado no momento. Aguarde a abertura do próximo ciclo pelo setor de compras/orçamento.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Pedido Mensal Aberto
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Selecione sua Unidade</h2>
              <p className="text-slate-500 text-sm">
                Escolha a unidade da qual você deseja realizar o pedido de suprimentos deste mês.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {allUnits.map((u) => (
                <Link
                  key={u.id}
                  href={`/pedido?unitId=${u.id}`}
                  className="group bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {u.name}
                      </h3>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-500">
                        →
                      </span>
                    </div>
                    {u.address && (
                      <p className="text-xs text-slate-500 line-clamp-2">{u.address}</p>
                    )}
                  </div>
                  {u.responsible && (
                    <div className="pt-4 mt-4 border-t text-xs text-slate-400">
                      Resp: <span className="font-medium text-slate-600">{u.responsible}</span>
                    </div>
                  )}
                </Link>
              ))}

              {allUnits.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 text-sm">
                  Nenhuma unidade cadastrada.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
