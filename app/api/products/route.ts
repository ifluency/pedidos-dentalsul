import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/db/schema'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(products.name)
    return NextResponse.json(rows)
  } catch (error: any) {
    console.error('Error in GET /api/products:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar produtos do banco de dados.' },
      { status: 500 }
    )
  }
}

// POST /api/products → create a new custom product
export async function POST(req: Request) {
  try {
    const bodyText = await req.text()
    let body: any = {}
    try {
      body = bodyText ? JSON.parse(bodyText) : {}
    } catch {}

    const { name, brand, unitOfMeasure, category, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome do produto é obrigatório.' }, { status: 400 })
    }

    const [newProduct] = await db
      .insert(products)
      .values({
        name: name.trim(),
        brand: brand?.trim() || null,
        unitOfMeasure: unitOfMeasure?.trim() || 'UN',
        category: category?.trim() || 'Outros',
        description: description?.trim() || null,
        isActive: true,
      })
      .returning()

    return NextResponse.json(newProduct)
  } catch (error: any) {
    console.error('Error in POST /api/products:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao cadastrar novo produto.' },
      { status: 500 }
    )
  }
}
