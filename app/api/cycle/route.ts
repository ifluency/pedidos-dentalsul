import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orderCycles } from '@/db/schema'

export async function GET() {
  const cycle = await db.query.orderCycles.findFirst({
    where: eq(orderCycles.status, 'open'),
  })
  if (!cycle) return NextResponse.json(null)
  return NextResponse.json(cycle)
}
