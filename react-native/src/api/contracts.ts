import { z } from 'zod';

// Response contracts for the endpoints the app uses. Parsing with these catches backend drift early.
// Money values arrive as JSON numbers with two decimals; they are for display only. The server calculates totals.

export const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable().optional(),
    status: z.string(),
  }),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});
export type Session = z.infer<typeof sessionSchema>;

export const tokenResponseSchema = z.object({
  user: sessionSchema.shape.user,
  accessToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  refreshToken: z.string(),
  refreshExpiresAt: z.string(),
});
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const menuItemSchema = z.object({
  id: z.string(),
  categoryId: z.string().optional(),
  name: z.string(),
  description: z.string().nullish(),
  price: z.union([z.number(), z.string()]),
  taxRate: z.union([z.number(), z.string()]).optional(),
  available: z.boolean().optional().default(true),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const menuSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    items: z.array(menuItemSchema),
  })),
});
export type Menu = z.infer<typeof menuSchema>;

export const branchSchema = z.object({ id: z.string(), code: z.string(), name: z.string() });
export type Branch = z.infer<typeof branchSchema>;

export const orderSchema = z.object({
  id: z.string(),
  branchId: z.string().optional(),
  branch_id: z.string().optional(),
  status: z.string(),
  subtotal: z.union([z.number(), z.string()]).nullish(),
  taxTotal: z.union([z.number(), z.string()]).nullish(),
  tax_total: z.union([z.number(), z.string()]).nullish(),
  total: z.union([z.number(), z.string()]).nullish(),
  tableId: z.string().nullish(),
  table_id: z.string().nullish(),
  tableLabel: z.string().nullish(),
  createdAt: z.string().optional(),
  created_at: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string().nullish(),
    menu_item_id: z.string().nullish(),
    name: z.string().optional(),
    item_name: z.string().optional(),
    unitPrice: z.union([z.number(), z.string()]).nullish(),
    unit_price: z.union([z.number(), z.string()]).nullish(),
    quantity: z.number().optional().default(1),
    lineSubtotal: z.union([z.number(), z.string()]).nullish(),
    line_subtotal: z.union([z.number(), z.string()]).nullish(),
    lineTax: z.union([z.number(), z.string()]).nullish(),
    line_tax: z.union([z.number(), z.string()]).nullish(),
  })).optional().default([]),
}).transform((o) => {
  const items = (o.items ?? []).map((it) => ({
    menuItemId: it.menuItemId ?? it.menu_item_id ?? null,
    name: it.name ?? it.item_name ?? 'Dish Item',
    unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
    quantity: Number(it.quantity ?? 1),
    lineSubtotal: Number(it.lineSubtotal ?? it.line_subtotal ?? 0),
    lineTax: Number(it.lineTax ?? it.line_tax ?? 0),
  }));
  const subtotal = Number(o.subtotal ?? items.reduce((s, it) => s + it.lineSubtotal, 0));
  const taxTotal = Number(o.taxTotal ?? o.tax_total ?? items.reduce((s, it) => s + it.lineTax, 0));
  const total = Number(o.total ?? (subtotal + taxTotal));
  return {
    id: o.id,
    branchId: o.branchId ?? o.branch_id ?? '',
    status: o.status,
    tableId: o.tableId ?? o.table_id ?? null,
    tableLabel: o.tableLabel ?? null,
    subtotal,
    taxTotal,
    total,
    createdAt: o.createdAt ?? o.created_at ?? new Date().toISOString(),
    items,
  };
});
export type Order = z.infer<typeof orderSchema>;

export const reservationSchema = z.object({
  id: z.string(),
  branchId: z.string().optional(),
  branch_id: z.string().optional(),
  partySize: z.number().optional(),
  party_size: z.number().optional(),
  startsAt: z.string().optional(),
  starts_at: z.string().optional(),
  status: z.enum(['REQUESTED', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED']),
  notes: z.string().nullable().optional(),
  tableId: z.string().nullable().optional(),
  table_id: z.string().nullable().optional(),
  tableLabel: z.string().nullable().optional(),
  guestName: z.string().nullable().optional(),
  guest_name: z.string().nullable().optional(),
}).transform((r) => ({
  id: r.id,
  branchId: r.branchId ?? r.branch_id ?? '',
  partySize: r.partySize ?? r.party_size ?? 2,
  startsAt: r.startsAt ?? r.starts_at ?? new Date().toISOString(),
  status: r.status,
  notes: r.notes ?? null,
  tableId: r.tableId ?? r.table_id ?? null,
  tableLabel: r.tableLabel ?? null,
  guestName: r.guestName ?? r.guest_name ?? null,
}));
export type Reservation = z.infer<typeof reservationSchema>;

export const chatReplySchema = z.object({
  messageId: z.string(),
  answer: z.string(),
  kind: z.string(),
  citations: z.array(z.object({ chunkId: z.string(), sourceId: z.string(), title: z.string() })),
});
export type ChatReply = z.infer<typeof chatReplySchema>;

export const billSchema = z.object({
  id: z.string(),
  orderId: z.string().optional(),
  order_id: z.string().optional(),
  branchId: z.string().optional(),
  branch_id: z.string().optional(),
  subtotal: z.union([z.number(), z.string()]).nullish(),
  taxTotal: z.union([z.number(), z.string()]).nullish(),
  tax_total: z.union([z.number(), z.string()]).nullish(),
  total: z.union([z.number(), z.string()]),
  paid: z.union([z.number(), z.string()]).nullish(),
  due: z.union([z.number(), z.string()]).nullish(),
  status: z.enum(['OPEN', 'PAID']),
  created_at: z.string().optional(),
  createdAt: z.string().optional(),
}).transform((b) => {
  const tot = Number(b.total || 0);
  const pd = Number(b.paid ?? 0);
  const sub = b.subtotal !== undefined && b.subtotal !== null ? Number(b.subtotal) : Math.round((tot / 1.05) * 100) / 100;
  const tax = b.taxTotal !== undefined && b.taxTotal !== null ? Number(b.taxTotal) : (b.tax_total !== undefined && b.tax_total !== null ? Number(b.tax_total) : Math.round((tot - sub) * 100) / 100);
  const bal = b.due !== undefined && b.due !== null ? Number(b.due) : Math.max(0, Math.round((tot - pd) * 100) / 100);
  return {
    id: b.id,
    orderId: b.orderId ?? b.order_id ?? '',
    branchId: b.branchId ?? b.branch_id ?? '',
    subtotal: sub,
    taxTotal: tax,
    total: tot,
    paid: pd,
    due: bal,
    status: b.status,
    createdAt: b.createdAt ?? b.created_at ?? new Date().toISOString(),
  };
});
export type Bill = z.infer<typeof billSchema>;

export const tableSchema = z.object({
  id: z.string(),
  label: z.string(),
  capacity: z.number(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING']),
  waiter: z.string().nullable().optional(),
  waiter_user_id: z.string().nullable().optional(),
  reservation_guest: z.string().nullable().optional(),
  reservation_time: z.string().nullable().optional(),
  reservation_party_size: z.number().nullable().optional(),
  reservation_status: z.string().nullable().optional(),
  is_slot_reserved: z.boolean().nullable().optional(),
  slot_guest: z.string().nullable().optional(),
  slot_starts_at: z.string().nullable().optional(),
});
export type DiningTable = z.infer<typeof tableSchema>;

export const salesSchema = z.object({
  from: z.string(),
  to: z.string(),
  bills: z.number(),
  gross: z.union([z.number(), z.string()]),
  refunds: z.union([z.number(), z.string()]),
  net: z.union([z.number(), z.string()]),
  byMethod: z.record(z.string(), z.union([z.number(), z.string()])),
});
export type SalesReport = z.infer<typeof salesSchema>;

export const staffMemberSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  email: z.string().nullable().optional(),
  role: z.string(),
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  quantity: z.union([z.number(), z.string()]),
  reorderLevel: z.union([z.number(), z.string()]),
  lowStock: z.boolean(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export const expenseSchema = z.object({
  id: z.string(),
  category: z.string(),
  amount: z.union([z.number(), z.string()]),
  description: z.string(),
  status: z.string(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const reviewSchema = z.object({
  id: z.string(),
  name: z.string().optional().default('Guest'),
  rating: z.number().optional().default(5),
  category: z.string().optional().default('General'),
  comment: z.string().optional().default(''),
  status: z.string().optional().default('PENDING'),
  created_at: z.string().optional(),
});
export type Review = z.infer<typeof reviewSchema>;

export const enquirySchema = z.object({
  id: z.string(),
  name: z.string().optional().default('Visitor'),
  email: z.string().optional().default(''),
  phone: z.string().nullable().optional(),
  message: z.string().optional().default(''),
  createdAt: z.string().optional(),
});
export type Enquiry = z.infer<typeof enquirySchema>;
