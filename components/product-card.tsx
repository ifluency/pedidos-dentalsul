'use client'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
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

type Props = {
  product: Product
  quantityInCart: number
  isLoading: boolean
  onConfirm: (product: Product, quantity: number) => Promise<boolean>
}

export function ProductCard({ product, quantityInCart, isLoading, onConfirm }: Props) {
  const [editing, setEditing] = useState(false)
  const [draftQuantity, setDraftQuantity] = useState(quantityInCart > 0 ? quantityInCart : 1)

  function openEditing() {
    setDraftQuantity(quantityInCart > 0 ? quantityInCart : 1)
    setEditing(true)
  }

  async function handleConfirm() {
    const success = await onConfirm(product, draftQuantity)
    if (success) setEditing(false)
  }

  const canConfirm = quantityInCart > 0 ? draftQuantity >= 0 : draftQuantity >= 1

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative">
        <ProductImage
          imageUrl={product.imageUrl}
          name={product.name}
          category={product.category}
          className="h-44 w-full"
        />
        {!editing && quantityInCart > 0 && (
          <button
            type="button"
            disabled={isLoading}
            onClick={openEditing}
            className="absolute top-2 left-2 bg-indigo-600/90 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            No carrinho: {quantityInCart}
          </button>
        )}
        {!editing && quantityInCart === 0 && (
          <button
            type="button"
            disabled={isLoading}
            onClick={openEditing}
            aria-label={`Adicionar ${product.name}`}
            className="absolute -bottom-5 right-4 h-11 w-11 rounded-full bg-indigo-600 text-white shadow-md flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50 z-10"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="p-4 pt-6 space-y-3">
        <div>
          <p className="font-medium text-slate-800 leading-tight">{product.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {product.category && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{product.category}</span>
            )}
            <span className="text-xs text-slate-400">{product.unitOfMeasure}</span>
          </div>
        </div>
        {editing && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              min={quantityInCart > 0 ? 0 : 1}
              value={draftQuantity}
              onChange={(e) => setDraftQuantity(parseInt(e.target.value) || 0)}
              className="w-20 text-center border rounded-lg h-9 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              autoFocus
            />
            <button
              disabled={isLoading || !canConfirm}
              onClick={handleConfirm}
              className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {quantityInCart > 0 ? 'Atualizar' : 'Adicionar'}
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              onClick={() => setEditing(false)}
              className="h-9 w-9 flex items-center justify-center rounded-lg border text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
