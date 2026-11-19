import { request } from './client';
import {
  Branch,
  Menu,
  Order,
  Reservation,
  ChatReply,
  Bill,
  DiningTable,
  SalesReport,
  Session,
  TokenResponse,
  StaffMember,
  InventoryItem,
  Expense,
  staffMemberSchema,
  inventoryItemSchema,
  expenseSchema,
  branchSchema,
  menuSchema,
  orderSchema,
  reservationSchema,
  chatReplySchema,
  billSchema,
  tableSchema,
  salesSchema,
  sessionSchema,
  tokenResponseSchema,
} from './contracts';
import { z } from 'zod';

// Thin, typed endpoint functions. Each response is validated against its contract.

export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> =>
    tokenResponseSchema.parse(await request('/api/v1/auth/login', { method: 'POST', body: { email, password } })),

  register: async (input: { fullName: string; email: string; phone?: string; password: string }): Promise<TokenResponse> =>
    tokenResponseSchema.parse(await request('/api/v1/auth/register', { method: 'POST', body: input })),

  refresh: async (refreshToken: string): Promise<TokenResponse> =>
    tokenResponseSchema.parse(await request('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken } })),

  logout: (refreshToken: string): Promise<null> =>
    request('/api/v1/auth/logout', { method: 'POST', body: { refreshToken } }),

  session: async (): Promise<Session> => sessionSchema.parse(await request('/api/v1/auth/session')),
};

export const menuApi = {
  get: async (): Promise<Menu> => menuSchema.parse(await request('/api/v1/menu')),
};

export const branchApi = {
  list: async (): Promise<Branch[]> => z.array(branchSchema).parse(await request('/api/v1/branches')),
};

export const orderApi = {
  mine: async (): Promise<Order[]> => z.array(orderSchema).parse(await request('/api/v1/orders')),

  place: async (input: { branchId: string; items: { menuItemId: string; quantity: number }[] }, idempotencyKey: string) =>
    orderSchema.parse(await request('/api/v1/orders', {
      method: 'POST',
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
    })),
};

export const reservationApi = {
  mine: async (): Promise<Reservation[]> => z.array(reservationSchema).parse(await request('/api/v1/reservations/mine')),

  create: async (branchId: string, input: { partySize: number; startsAt: string; notes?: string }): Promise<Reservation> =>
    reservationSchema.parse(await request(`/api/v1/branches/${branchId}/reservations`, { method: 'POST', body: input })),

  cancel: async (id: string): Promise<Reservation> =>
    reservationSchema.parse(await request(`/api/v1/reservations/${id}/cancel`, { method: 'POST' })),
};

/** Assistant. Anonymous sessions are allowed; a signed-in session is private to its owner. */
export const chatApi = {
  createSession: async (): Promise<{ sessionId: string }> =>
    z.object({ sessionId: z.string() }).parse(await request('/api/v1/chat/sessions', { method: 'POST' })),

  ask: async (sessionId: string, message: string): Promise<ChatReply> =>
    chatReplySchema.parse(await request(`/api/v1/chat/sessions/${sessionId}/messages`, { method: 'POST', body: { message } })),

  feedback: (sessionId: string, messageId: string, rating: 'UP' | 'DOWN'): Promise<null> =>
    request(`/api/v1/chat/sessions/${sessionId}/messages/${messageId}/feedback`, { method: 'POST', body: { rating } }),
};

/** Staff operations. Every call is scoped to a branch; the server checks the caller's assignment and permissions. */
export const staffApi = {
  orders: async (branchId: string, status?: string): Promise<Order[]> =>
    z.array(orderSchema).parse(await request(`/api/v1/branches/${branchId}/orders${status ? `?status=${status}` : ''}`)),

  setOrderStatus: async (orderId: string, status: string): Promise<Order> =>
    orderSchema.parse(await request(`/api/v1/orders/${orderId}/status`, { method: 'PATCH', body: { status } })),

  placeForTable: async (
    branchId: string,
    input: { tableId: string; items: { menuItemId: string; quantity: number }[] },
    idempotencyKey: string,
  ): Promise<Order> =>
    orderSchema.parse(
      await request(`/api/v1/branches/${branchId}/orders`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    ),

  createBill: async (branchId: string, orderId: string): Promise<Bill> =>
    billSchema.parse(await request(`/api/v1/branches/${branchId}/orders/${orderId}/bill`, { method: 'POST' })),

  bill: async (branchId: string, billId: string): Promise<Bill> =>
    billSchema.parse(await request(`/api/v1/branches/${branchId}/bills/${billId}`)),

  recordPayment: async (branchId: string, billId: string, method: 'CASH' | 'CARD' | 'UPI', amount: number, idempotencyKey: string) =>
    z.object({ id: z.string(), method: z.string(), amount: z.union([z.number(), z.string()]) }).parse(
      await request(`/api/v1/branches/${branchId}/bills/${billId}/payments`, {
        method: 'POST',
        body: { method, amount },
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    ),

  tables: async (branchId: string): Promise<DiningTable[]> =>
    z.array(tableSchema).parse(await request(`/api/v1/branches/${branchId}/tables`)),

  setTableStatus: async (branchId: string, tableId: string, status: string): Promise<null> =>
    request(`/api/v1/branches/${branchId}/tables/${tableId}/status`, { method: 'PATCH', body: { status } }),

  sales: async (branchId: string, from: string, to: string): Promise<SalesReport> =>
    salesSchema.parse(await request(`/api/v1/branches/${branchId}/reports/sales?from=${from}&to=${to}`)),
};

/** Receptionist, captain and manager operations (step 5-10 backend). */
export const operationsApi = {
  reservationsForDay: async (branchId: string, date: string): Promise<Reservation[]> =>
    z.array(reservationSchema).parse(await request(`/api/v1/branches/${branchId}/reservations?date=${date}`)),

  confirmReservation: async (branchId: string, id: string): Promise<Reservation> =>
    reservationSchema.parse(await request(`/api/v1/branches/${branchId}/reservations/${id}/confirm`, { method: 'POST' })),

  checkInReservation: async (branchId: string, id: string): Promise<Reservation> =>
    reservationSchema.parse(await request(`/api/v1/branches/${branchId}/reservations/${id}/check-in`, { method: 'POST' })),

  branchStaff: async (branchId: string): Promise<StaffMember[]> =>
    z.array(staffMemberSchema).parse(await request(`/api/v1/branches/${branchId}/staff`)),

  assignWaiter: (branchId: string, tableId: string, waiterUserId: string): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/tables/${tableId}/assignment`, { method: 'POST', body: { waiterUserId } }),

  inventory: async (branchId: string): Promise<InventoryItem[]> =>
    z.array(inventoryItemSchema).parse(await request(`/api/v1/branches/${branchId}/inventory`)),

  adjustStock: (branchId: string, itemId: string, delta: number, reason: string): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/inventory/${itemId}/movements`, { method: 'POST', body: { delta, reason } }),

  expenses: async (branchId: string): Promise<Expense[]> =>
    z.array(expenseSchema).parse(await request(`/api/v1/branches/${branchId}/expenses`)),

  recordExpense: (branchId: string, input: { category: string; amount: number; description: string }): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/expenses`, { method: 'POST', body: input }),
};
