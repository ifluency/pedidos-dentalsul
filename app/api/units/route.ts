import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { units } from '@/db/schema'

export async function GET() {
  try {
    const rows = await db.select().from(units).orderBy(units.name)
    return NextResponse.json(rows)
  } catch (error: any) {
    console.error('Error in GET /api/units:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar unidades do banco de dados.' },
      { status: 500 }
    )
  }
}
