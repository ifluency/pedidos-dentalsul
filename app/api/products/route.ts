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
