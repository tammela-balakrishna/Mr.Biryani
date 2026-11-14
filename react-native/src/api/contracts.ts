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

const menuItemSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.union([z.number(), z.string()]),
  taxRate: z.union([z.number(), z.string()]),
  available: z.boolean(),
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
  branchId: z.string(),
  status: z.string(),
  subtotal: z.union([z.number(), z.string()]),
  taxTotal: z.union([z.number(), z.string()]),
  total: z.union([z.number(), z.string()]),
  createdAt: z.string(),
  items: z.array(z.object({
    menuItemId: z.string().nullable(),
    name: z.string(),
    unitPrice: z.union([z.number(), z.string()]),
    quantity: z.number(),
    lineSubtotal: z.union([z.number(), z.string()]),
    lineTax: z.union([z.number(), z.string()]),
  })),
});
export type Order = z.infer<typeof orderSchema>;

export const reservationSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  partySize: z.number(),
  startsAt: z.string(),
  status: z.enum(['REQUESTED', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED']),
  notes: z.string().nullable().optional(),
});
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
  orderId: z.string(),
  branchId: z.string(),
  subtotal: z.union([z.number(), z.string()]),
  taxTotal: z.union([z.number(), z.string()]),
  total: z.union([z.number(), z.string()]),
  paid: z.union([z.number(), z.string()]),
  due: z.union([z.number(), z.string()]),
  status: z.enum(['OPEN', 'PAID']),
});
export type Bill = z.infer<typeof billSchema>;

export const tableSchema = z.object({
  id: z.string(),
  label: z.string(),
  capacity: z.number(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING']),
  waiter: z.string().nullable().optional(),
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
