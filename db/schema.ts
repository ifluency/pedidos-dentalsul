import { pgTable, uuid, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── units ──────────────────────────────────────────────────────────────────
export const units = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  cnpj: text('cnpj').notNull().unique(),
  responsible: text('responsible'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── products ───────────────────────────────────────────────────────────────
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  brand: text('brand'),
  unitOfMeasure: text('unit_of_measure').notNull(),
  category: text('category'),
  code: text('code').unique(),
  barcode: text('barcode').unique(),
  referenceCode: text('reference_code'),
  ncm: text('ncm'),
  minPackagingUnit: text('min_packaging_unit'),
  isActive: boolean('is_active').notNull().default(true),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── users (read-only reference for admin view) ─────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull(),
  unitId: uuid('unit_id').references(() => units.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── order_cycles ───────────────────────────────────────────────────────────
export const orderCycles = pgTable('order_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: text('status').notNull().default('open'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  closedBy: uuid('closed_by').references(() => users.id),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── orders ─────────────────────────────────────────────────────────────────
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id').notNull().references(() => orderCycles.id),
  unitId: uuid('unit_id').notNull().references(() => units.id),
  createdBy: uuid('created_by').references(() => users.id), // nullable — anonymous orders
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── order_items ────────────────────────────────────────────────────────────
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantityRequested: integer('quantity_requested').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── relations ──────────────────────────────────────────────────────────────
export const orderCyclesRelations = relations(orderCycles, ({ many }) => ({
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  cycle: one(orderCycles, { fields: [orders.cycleId], references: [orderCycles.id] }),
  unit: one(units, { fields: [orders.unitId], references: [units.id] }),
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}))

// ── types ──────────────────────────────────────────────────────────────────
export type Unit = typeof units.$inferSelect
export type Product = typeof products.$inferSelect
export type OrderCycle = typeof orderCycles.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
