import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { units } from '@/db/schema'

export async function GET() {
  const rows = await db.select().from(units).orderBy(units.name)
  return NextResponse.json(rows)
}
