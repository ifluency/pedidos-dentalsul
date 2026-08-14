import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { db } from '@/lib/db'
import { orders, orderCycles, units, orderItems, products } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export const revalidate = 0

export default async function AdminPage() {
  const currentCycle = await db.query.orderCycles.findFirst({
    where: eq(orderCycles.status, 'open'),
  })

  let ordersList: any[] = []
  if (currentCycle) {
    ordersList = await db.query.orders.findMany({
      where: eq(orders.cycleId, currentCycle.id),
      with: {
        unit: true,
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: [desc(orders.updatedAt)],
    })
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="h-8 w-8 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center text-sm">
              DS
            </Link>
            <div>
              <h1 className="font-bold text-white text-sm">Área do Orçamentista</h1>
              <p className="text-xs text-slate-400">Acompanhamento dos Pedidos das Unidades</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-slate-300 hover:text-white transition-colors">
              Ver Visão da Unidade
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border p-5 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${currentCycle ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <h2 className="font-bold text-slate-800 text-lg">
                {currentCycle ? 'Ciclo de Pedido Atual: Aberto' : 'Nenhum Ciclo Aberto'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentCycle
                ? `Ciclo criado em ${new Date(currentCycle.createdAt).toLocaleDateString('pt-BR')}`
                : 'Abertura e fechamento de ciclos são realizados no sistema principal DentalSul.'}
            </p>
          </div>

          {currentCycle && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Total de Pedidos na Rodada</p>
              <p className="text-lg font-extrabold text-slate-800">{ordersList.length} Unidades</p>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Pedidos por Unidade</h3>

          {ordersList.length === 0 ? (
            <div className="bg-white border rounded-2xl p-8 text-center text-slate-400 text-sm shadow-sm">
              Nenhum pedido registrado para este ciclo até o momento.
            </div>
          ) : (
            <div className="space-y-4">
              {ordersList.map((order) => {
                const totalItemsCount = order.items.reduce((acc: number, item: any) => acc + item.quantityRequested, 0)
                const isSubmitted = order.status === 'submitted'

                return (
                  <div key={order.id} className="bg-white border rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-base">{order.unit?.name}</h4>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                              isSubmitted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isSubmitted ? '✓ Enviado' : '✏ Rascunho'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Última atualização: {new Date(order.updatedAt).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-700">
                          {order.items.length} produtos ({totalItemsCount} un)
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-slate-50 text-left text-slate-500">
                            <th className="py-2 px-3 font-semibold">Produto</th>
                            <th className="py-2 px-3 font-semibold">Categoria</th>
                            <th className="py-2 px-3 font-semibold">Unidade</th>
                            <th className="py-2 px-3 font-semibold text-right">Qtd. Solicitada</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {order.items.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-800">
                                {item.product?.name}
                                {item.product?.brand && <span className="text-slate-400 ml-1">({item.product.brand})</span>}
                              </td>
                              <td className="py-2 px-3 text-slate-500">{item.product?.category || '—'}</td>
                              <td className="py-2 px-3 text-slate-500">{item.product?.unitOfMeasure}</td>
                              <td className="py-2 px-3 font-bold text-right text-slate-900">
                                {item.quantityRequested}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
