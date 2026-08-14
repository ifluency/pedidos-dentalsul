'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ShoppingBag, ArrowLeft, Check, Plus, Minus, X, LayoutGrid, List } from 'lucide-react'

type Product = {
  id: string
  name: string
  description?: string | null
  brand?: string | null
  unitOfMeasure: string
  category?: string | null
  imageUrl?: string | null
}

type Unit = {
  id: string
  name: string
}

type CartItem = {
  id: string
  productId: string
  quantityRequested: number
  product: Product
}

function PedidoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const unitId = searchParams.get('unitId')

  const [unit, setUnit] = useState<Unit | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<CartItem[]>([])
  const [orderId, setOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null)

  useEffect(() => {
    if (!unitId) {
      router.push('/')
      return
    }

    async function loadData() {
      try {
        setLoading(true)
        // 1. Fetch units to get current unit info
        const resUnits = await fetch('/api/units')
        const unitsList: Unit[] = await resUnits.json()
        const currentUnit = unitsList.find((u) => u.id === unitId)
        if (!currentUnit) {
          setErrorMsg('Unidade não encontrada.')
          setLoading(false)
          return
        }
        setUnit(currentUnit)

        // 2. Fetch active products
        const resProducts = await fetch('/api/products')
        const productsList: Product[] = await resProducts.json()
        setProducts(productsList)

        // 3. Fetch/Create draft order
        const resOrder = await fetch(`/api/orders?unitId=${unitId}`)
        if (!resOrder.ok) {
          const err = await resOrder.json()
          if (err.error === 'no_open_cycle') {
            setErrorMsg('Nenhum pedido mensal aberto no momento.')
          } else {
            setErrorMsg(err.error || 'Erro ao carregar pedido.')
          }
          setLoading(false)
          return
        }

        const dataOrder = await resOrder.json()
        setOrderId(dataOrder.order.id)
        setItems(dataOrder.order.items || [])
      } catch (err: any) {
        setErrorMsg(err?.message || 'Erro ao conectar ao servidor.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [unitId, router])

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean) as string[])
    return Array.from(cats).sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
      const matchCat = !category || p.category === category
      return matchSearch && matchCat
    })
  }, [products, search, category])

  const cartQuantity = (productId: string) => {
    const item = items.find((i) => i.productId === productId)
    return item ? item.quantityRequested : 0
  }

  async function updateQuantity(product: Product, quantity: number) {
    if (!orderId) return
    setLoadingProductId(product.id)

    try {
      if (quantity <= 0) {
        const item = items.find((i) => i.productId === product.id)
        if (item) {
          const res = await fetch(`/api/orders/${orderId}/items`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: item.id }),
          })
          if (res.ok) {
            setItems((prev) => prev.filter((i) => i.productId !== product.id))
          }
        }
      } else {
        const res = await fetch(`/api/orders/${orderId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, quantityRequested: quantity }),
        })
        if (res.ok) {
          const saved = await res.json()
          setItems((prev) => {
            const exists = prev.find((i) => i.productId === product.id)
            if (exists) {
              return prev.map((i) => (i.productId === product.id ? { ...i, ...saved, product } : i))
            }
            return [...prev, { ...saved, product }]
          })
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingProductId(null)
    }
  }

  async function handleSubmitOrder() {
    if (!orderId || items.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/orders?orderId=${orderId}`, {
        method: 'PUT',
      })
      if (res.ok) {
        router.push(`/confirmado?unitName=${encodeURIComponent(unit?.name || '')}`)
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao enviar pedido.')
        setSubmitting(false)
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Carregando catálogo...</p>
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <p className="text-red-500 font-semibold text-base">{errorMsg}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            ← Voltar para seleção de unidade
          </Link>
        </div>
      </div>
    )
  }

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantityRequested, 0)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Trocar unidade"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Unidade
                </span>
                <h1 className="font-bold text-slate-800 text-base">{unit?.name}</h1>
              </div>
              <p className="text-xs text-slate-400">Monte o seu pedido mensal adicionando os produtos abaixo.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Itens no rascunho</p>
              <p className="text-sm font-bold text-slate-800">{items.length} produtos ({totalItemsCount} un)</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Catalog Section */}
          <div className="flex-1 space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between shadow-sm">
              <div className="flex flex-wrap gap-3 flex-1 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar produto por nome ou marca..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Todas as categorias ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setView('cards')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                    view === 'cards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Visualização em Cards"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                    view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Visualização em Lista"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Product Cards */}
            {view === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((p) => {
                  const qty = cartQuantity(p.id)
                  const isLoadingThis = loadingProductId === p.id

                  return (
                    <div
                      key={p.id}
                      className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-800 text-sm leading-snug">{p.name}</h3>
                          {p.category && (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                              {p.category}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
                        )}
                        <div className="text-xs text-slate-500">
                          Unidade: <span className="font-semibold text-slate-700">{p.unitOfMeasure}</span>
                          {p.brand && <span className="ml-2 text-slate-400">• {p.brand}</span>}
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t flex items-center justify-between gap-2">
                        {qty === 0 ? (
                          <button
                            disabled={isLoadingThis}
                            onClick={() => updateQuantity(p, 1)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" /> Adicionar ao Pedido
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-between bg-indigo-50 border border-indigo-200 p-1 rounded-lg">
                            <button
                              disabled={isLoadingThis}
                              onClick={() => updateQuantity(p, qty - 1)}
                              className="p-1 rounded bg-white text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-50"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-sm font-bold text-indigo-950 px-2">
                              {qty} <span className="text-xs font-normal text-indigo-700">{p.unitOfMeasure}</span>
                            </span>
                            <button
                              disabled={isLoadingThis}
                              onClick={() => updateQuantity(p, qty + 1)}
                              className="p-1 rounded bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                    Nenhum produto encontrado com o filtro aplicado.
                  </div>
                )}
              </div>
            )}

            {/* List View */}
            {view === 'list' && (
              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-500 text-xs">
                      <th className="px-4 py-3 font-semibold">Produto</th>
                      <th className="px-4 py-3 font-semibold">Categoria</th>
                      <th className="px-4 py-3 font-semibold">Unidade</th>
                      <th className="px-4 py-3 font-semibold text-right">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProducts.map((p) => {
                      const qty = cartQuantity(p.id)
                      const isLoadingThis = loadingProductId === p.id

                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {p.name}
                            {p.brand && <span className="text-slate-400 text-xs ml-2">({p.brand})</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{p.category || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{p.unitOfMeasure}</td>
                          <td className="px-4 py-3 text-right">
                            {qty === 0 ? (
                              <button
                                disabled={isLoadingThis}
                                onClick={() => updateQuantity(p, 1)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                + Adicionar
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 p-0.5 rounded-lg">
                                <button
                                  disabled={isLoadingThis}
                                  onClick={() => updateQuantity(p, qty - 1)}
                                  className="p-1 rounded bg-white text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-50"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-bold text-indigo-950 px-2">{qty}</span>
                                <button
                                  disabled={isLoadingThis}
                                  onClick={() => updateQuantity(p, qty + 1)}
                                  className="p-1 rounded bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white border rounded-xl p-5 shadow-sm sticky top-20 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-800">Resumo do Pedido</h2>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {items.length} itens
                </span>
              </div>

              {items.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm font-medium text-slate-400">Nenhum item adicionado ainda.</p>
                  <p className="text-xs text-slate-400">Escolha os produtos no catálogo para adicionar ao pedido.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-xs bg-slate-50 border rounded-lg p-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{item.product.name}</p>
                        <p className="text-slate-400 text-[10px]">{item.product.unitOfMeasure}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-slate-900 bg-white border px-2 py-1 rounded">
                          × {item.quantityRequested}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product, 0)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Remover item"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>Total de unidades:</span>
                  <span className="font-bold text-slate-800">{totalItemsCount}</span>
                </div>

                <button
                  disabled={items.length === 0 || submitting}
                  onClick={handleSubmitOrder}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    'Enviando Pedido...'
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Enviar Pedido Final
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PedidoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500">Carregando catálogo...</p>
          </div>
        </div>
      }
    >
      <PedidoContent />
    </Suspense>
  )
}
