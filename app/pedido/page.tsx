'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ShoppingBag, ArrowLeft, Check, X, LayoutGrid, List, Plus, PackagePlus } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { ProductImage } from '@/components/ui/product-image'

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

  // States for custom product creation modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductBrand, setNewProductBrand] = useState('')
  const [newProductCategory, setNewProductCategory] = useState('')
  const [newProductUnit, setNewProductUnit] = useState('UN')
  const [newProductQuantity, setNewProductQuantity] = useState(1)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  useEffect(() => {
    if (!unitId) {
      router.push('/')
      return
    }

    async function loadData() {
      try {
        setLoading(true)
        // 1. Fetch units list to get current unit name
        const resUnits = await fetch('/api/units')
        const unitsText = await resUnits.text()
        let unitsList: Unit[] = []
        try {
          unitsList = unitsText ? JSON.parse(unitsText) : []
        } catch {}

        if (!resUnits.ok) {
          setErrorMsg((unitsList as any)?.error || `Erro ao carregar unidades (Status ${resUnits.status}).`)
          setLoading(false)
          return
        }

        const currentUnit = Array.isArray(unitsList) ? unitsList.find((u) => u.id === unitId) : null
        if (!currentUnit) {
          setErrorMsg('Unidade não encontrada.')
          setLoading(false)
          return
        }
        setUnit(currentUnit)

        // 2. Fetch products
        const resProducts = await fetch('/api/products')
        const productsText = await resProducts.text()
        let productsList: Product[] = []
        try {
          productsList = productsText ? JSON.parse(productsText) : []
        } catch {}

        if (!resProducts.ok) {
          setErrorMsg((productsList as any)?.error || `Erro ao carregar produtos (Status ${resProducts.status}).`)
          setLoading(false)
          return
        }
        setProducts(Array.isArray(productsList) ? productsList : [])

        // 3. Fetch/Create draft order
        const resOrder = await fetch(`/api/orders?unitId=${unitId}`)
        const orderText = await resOrder.text()
        let dataOrder: any = null
        try {
          dataOrder = orderText ? JSON.parse(orderText) : null
        } catch {}

        if (!resOrder.ok) {
          if (dataOrder?.error === 'no_open_cycle') {
            setErrorMsg('Nenhum pedido mensal aberto no momento.')
          } else {
            setErrorMsg(dataOrder?.error || `Erro ao carregar pedido (Status ${resOrder.status}).`)
          }
          setLoading(false)
          return
        }

        if (dataOrder?.order) {
          setOrderId(dataOrder.order.id)
          setItems(dataOrder.order.items || [])
        }
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
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
      const matchCat = !category || p.category === category
      return matchSearch && matchCat
    })
  }, [products, search, category])

  const cartQuantity = (productId: string) => {
    const item = items.find((i) => i.productId === productId)
    return item ? item.quantityRequested : 0
  }

  async function handleConfirmQuantity(product: Product, quantity: number): Promise<boolean> {
    if (!orderId) return false
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
          return res.ok
        }
        return true
      } else {
        const res = await fetch(`/api/orders/${orderId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, quantityRequested: quantity }),
        })
        if (res.ok) {
          const resText = await res.text()
          let saved: any = null
          try {
            saved = resText ? JSON.parse(resText) : null
          } catch {}

          if (saved) {
            setItems((prev) => {
              const exists = prev.find((i) => i.productId === product.id)
              if (exists) {
                return prev.map((i) => (i.productId === product.id ? { ...i, ...saved, product } : i))
              }
              return [...prev, { ...saved, product }]
            })
          }
        }
        return res.ok
      }
    } catch (err) {
      console.error(err)
      return false
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
        const resText = await res.text()
        let err: any = null
        try {
          err = resText ? JSON.parse(resText) : null
        } catch {}
        alert(err?.error || `Erro ${res.status} ao enviar pedido.`)
        setSubmitting(false)
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor.')
      setSubmitting(false)
    }
  }

  async function handleCreateCustomProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!newProductName.trim()) {
      setModalError('O nome do produto é obrigatório.')
      return
    }

    setCreatingProduct(true)
    setModalError(null)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName.trim(),
          brand: newProductBrand.trim() || null,
          category: newProductCategory.trim() || 'Outros',
          unitOfMeasure: newProductUnit.trim() || 'UN',
        }),
      })

      const resText = await res.text()
      let createdProduct: Product | null = null
      try {
        createdProduct = resText ? JSON.parse(resText) : null
      } catch {}

      if (!res.ok || !createdProduct?.id) {
        setModalError((createdProduct as any)?.error || 'Erro ao cadastrar produto.')
        setCreatingProduct(false)
        return
      }

      setProducts((prev) => [createdProduct!, ...prev])

      const added = await handleConfirmQuantity(createdProduct, Math.max(1, newProductQuantity))

      if (added) {
        setNewProductName('')
        setNewProductBrand('')
        setNewProductCategory('')
        setNewProductUnit('UN')
        setNewProductQuantity(1)
        setIsModalOpen(false)
      } else {
        setModalError('Produto cadastrado, mas ocorreu um erro ao adicioná-lo ao pedido.')
      }
    } catch (err) {
      setModalError('Erro de conexão com o servidor.')
    } finally {
      setCreatingProduct(false)
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Navigation */}
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
              <p className="text-xs text-slate-400">Selecione os produtos e envie seu pedido mensal.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <PackagePlus className="h-4 w-4" />
            <span className="hidden sm:inline">+ Produto Não Listado</span>
            <span className="sm:hidden">+ Novo</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Catalog Left Section */}
          <div className="flex-1 space-y-4">
            {/* Filter controls */}
            <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between shadow-sm">
              <div className="flex flex-wrap gap-3 flex-1 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (search) setNewProductName(search)
                    setIsModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs border border-indigo-200 transition-colors"
                >
                  <PackagePlus className="h-4 w-4" />
                  <span>Outro Produto</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setView('cards')}
                  title="Cards"
                  className={`px-3 py-1.5 text-sm rounded-md border font-medium transition-colors ${
                    view === 'cards'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  title="Lista"
                  className={`px-3 py-1.5 text-sm rounded-md border font-medium transition-colors ${
                    view === 'list'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Cards View */}
            {view === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantityInCart={cartQuantity(product.id)}
                    isLoading={loadingProductId === product.id}
                    onConfirm={handleConfirmQuantity}
                  />
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full bg-white border border-dashed rounded-2xl p-8 text-center space-y-3 shadow-sm my-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <PackagePlus className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h3 className="font-bold text-slate-800 text-base">Produto não encontrado?</h3>
                      <p className="text-xs text-slate-500">
                        Não encontrou o item que precisa na lista? Você pode cadastrar e adicioná-lo diretamente ao seu pedido mensal.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (search) setNewProductName(search)
                        setIsModalOpen(true)
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    >
                      <PackagePlus className="h-4 w-4" />
                      Cadastrar & Adicionar Produto
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* List View */}
            {view === 'list' && (
              <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Produto</th>
                      <th className="px-4 py-3 font-medium">Categoria</th>
                      <th className="px-4 py-3 font-medium">Unidade</th>
                      <th className="px-4 py-3 font-medium text-right">Qtd.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProducts.map((product) => {
                      const qty = cartQuantity(product.id)
                      const isLoading = loadingProductId === product.id
                      return (
                        <tr key={product.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{product.name}</td>
                          <td className="px-4 py-3 text-slate-500">{product.category ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{product.unitOfMeasure}</td>
                          <td className="px-4 py-3 text-right">
                            {qty === 0 ? (
                              <button
                                disabled={isLoading}
                                onClick={() => handleConfirmQuantity(product, 1)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium disabled:opacity-50"
                              >
                                + Adicionar
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  disabled={isLoading}
                                  onClick={() => handleConfirmQuantity(product, qty - 1)}
                                  className="w-7 h-7 flex items-center justify-center rounded border bg-white hover:bg-slate-100 disabled:opacity-50 text-xs font-bold"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={qty}
                                  onChange={(e) =>
                                    handleConfirmQuantity(product, parseInt(e.target.value) || 0)
                                  }
                                  className="w-12 text-center border rounded px-1 py-0.5 text-xs font-bold"
                                />
                                <button
                                  disabled={isLoading}
                                  onClick={() => handleConfirmQuantity(product, qty + 1)}
                                  className="w-7 h-7 flex items-center justify-center rounded border bg-white hover:bg-slate-100 disabled:opacity-50 text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center">
                          <div className="space-y-3 max-w-md mx-auto">
                            <PackagePlus className="h-8 w-8 text-indigo-500 mx-auto" />
                            <p className="text-xs text-slate-500">
                              Nenhum produto encontrado para sua busca. Clique abaixo para cadastrar um novo produto.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                if (search) setNewProductName(search)
                                setIsModalOpen(true)
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors inline-flex items-center gap-1.5"
                            >
                              <PackagePlus className="h-4 w-4" />
                              Cadastrar Novo Produto
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cart Right Drawer */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white border rounded-lg p-4 sticky top-20 space-y-4 shadow-sm">
              <h2 className="font-semibold text-slate-800">Meu Pedido</h2>
              {items.length === 0 ? (
                <p className="text-slate-400 text-sm">Nenhum item adicionado.</p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-y-auto pr-1 divide-y divide-slate-100">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm pt-2 first:pt-0">
                      <div className="h-10 w-10 rounded overflow-hidden shrink-0">
                        <ProductImage
                          imageUrl={item.product.imageUrl}
                          name={item.product.name}
                          category={item.product.category}
                          className="h-full w-full"
                        />
                      </div>
                      <span className="text-slate-700 truncate flex-1 text-xs font-medium">
                        {item.product.name}
                      </span>
                      <span className="shrink-0 font-bold text-slate-800 text-xs">
                        × {item.quantityRequested}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConfirmQuantity(item.product, 0)}
                        className="shrink-0 text-slate-400 hover:text-red-500 transition-colors p-1"
                        aria-label={`Remover ${item.product.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs text-slate-500">
                  {items.length} produto(s) — rascunho salvo no banco
                </p>
                <button
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-50"
                  onClick={handleSubmitOrder}
                  disabled={submitting || items.length === 0}
                >
                  {submitting ? 'Enviando...' : 'Enviar Pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Produto Não Listado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border shadow-xl max-w-lg w-full overflow-hidden space-y-0">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                  <PackagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Adicionar Produto Não Listado</h3>
                  <p className="text-xs text-slate-500">Cadastre um item que não está no catálogo para seu pedido.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomProduct} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium">
                  {modalError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Nome do Produto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Luva Nitrílica Rosa P"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Marca / Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ex: Supermax"
                    value={newProductBrand}
                    onChange={(e) => setNewProductBrand(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Categoria</label>
                  <input
                    type="text"
                    list="existing-categories"
                    placeholder="Ex: Descartáveis"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="existing-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Unidade de Medida</label>
                  <select
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="Caixa">Caixa</option>
                    <option value="Pacote">Pacote</option>
                    <option value="Frasco">Frasco</option>
                    <option value="Litro">Litro</option>
                    <option value="Par">Par</option>
                    <option value="Rolo">Rolo</option>
                    <option value="Galão">Galão</option>
                    <option value="Kit">Kit</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Quantidade no Pedido</label>
                  <input
                    type="number"
                    min={1}
                    value={newProductQuantity}
                    onChange={(e) => setNewProductQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={creatingProduct}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct || !newProductName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingProduct ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adicionando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Adicionar ao Pedido</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
