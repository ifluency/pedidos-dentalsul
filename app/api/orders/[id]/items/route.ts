import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orderItems } from '@/db/schema'

// POST /api/orders/[id]/items  body: { productId, quantityRequested }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const { productId, quantityRequested } = await req.json()

  if (!productId || quantityRequested == null) {
    return NextResponse.json({ error: 'productId and quantityRequested are required' }, { status: 400 })
  }

  const existing = await db.query.orderItems.findFirst({
    where: and(eq(orderItems.orderId, orderId), eq(orderItems.productId, productId)),
  })

  if (existing) {
    const [updated] = await db
      .update(orderItems)
      .set({ quantityRequested })
      .where(eq(orderItems.id, existing.id))
      .returning()
    return NextResponse.json(updated)
  }

  const [item] = await db
    .insert(orderItems)
    .values({ orderId, productId, quantityRequested })
    .returning()

  return NextResponse.json(item)
}

// DELETE /api/orders/[id]/items  body: { itemId }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const { itemId } = await req.json()

  if (!itemId) {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
  }

  await db.delete(orderItems).where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
  return NextResponse.json({ success: true })
}
