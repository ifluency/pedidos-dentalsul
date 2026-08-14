import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, orderCycles } from '@/db/schema'

// GET /api/orders?unitId=xxx  → returns or creates a draft order for the unit in the open cycle
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const unitId = searchParams.get('unitId')
  if (!unitId) return NextResponse.json({ error: 'unitId is required' }, { status: 400 })

  const cycle = await db.query.orderCycles.findFirst({
    where: eq(orderCycles.status, 'open'),
  })
  if (!cycle) return NextResponse.json({ error: 'no_open_cycle' }, { status: 404 })

  const existing = await db.query.orders.findFirst({
    where: and(eq(orders.cycleId, cycle.id), eq(orders.unitId, unitId), eq(orders.status, 'draft')),
    with: { items: { with: { product: true } } },
  })

  if (existing) return NextResponse.json({ cycleId: cycle.id, order: existing })

  const [order] = await db
    .insert(orders)
    .values({ cycleId: cycle.id, unitId, createdBy: null, status: 'draft' })
    .returning()

  return NextResponse.json({ cycleId: cycle.id, order: { ...order, items: [] } })
}

// PUT /api/orders?orderId=xxx  → submits the draft order
export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  const [updated] = await db
    .update(orders)
    .set({ status: 'submitted', updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, 'draft')))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Pedido não encontrado ou já enviado.' }, { status: 404 })
  return NextResponse.json(updated)
}
