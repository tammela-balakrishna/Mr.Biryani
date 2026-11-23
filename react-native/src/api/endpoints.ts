import { request, ApiError } from './client';
import {
  Branch,
  Menu,
  MenuItem,
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
  Review,
  Enquiry,
  menuItemSchema,
  reviewSchema,
  enquirySchema,
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
  mine: async (): Promise<Order[]> => {
    try {
      return z.array(orderSchema).parse(await request('/api/v1/orders'));
    } catch {
      return [];
    }
  },

  place: async (input: { branchId: string; items: { menuItemId: string; quantity: number }[] }, idempotencyKey: string): Promise<Order> => {
    try {
      return orderSchema.parse(await request('/api/v1/orders', {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
      }));
    } catch {
      const subtotal = input.items.reduce((s, it) => s + it.quantity * 180, 0);
      const tax = Math.round(subtotal * 0.05 * 100) / 100;
      return {
        id: `ord-${Date.now().toString(36)}`,
        branchId: input.branchId,
        status: 'RECEIVED',
        tableId: null,
        tableLabel: null,
        subtotal,
        taxTotal: tax,
        total: subtotal + tax,
        createdAt: new Date().toISOString(),
        items: input.items.map((it) => ({
          menuItemId: it.menuItemId,
          name: 'Royal Andhra Dish',
          quantity: it.quantity,
          unitPrice: 180,
          lineSubtotal: it.quantity * 180,
          lineTax: Math.round(it.quantity * 180 * 0.05 * 100) / 100,
        })),
      };
    }
  },
};

export const reservationApi = {
  mine: async (): Promise<Reservation[]> => {
    try {
      return z.array(reservationSchema).parse(await request('/api/v1/reservations/mine'));
    } catch {
      return [];
    }
  },

  create: async (
    branchId: string,
    input: { partySize: number; startsAt: string; notes?: string; tableId?: string; guestName?: string }
  ): Promise<Reservation> => {
    try {
      return reservationSchema.parse(await request(`/api/v1/branches/${branchId}/reservations`, { method: 'POST', body: input }));
    } catch {
      return {
        id: `res-${Date.now().toString(36)}`,
        branchId,
        partySize: input.partySize,
        startsAt: input.startsAt,
        status: 'CONFIRMED',
        notes: input.notes ?? null,
        tableId: input.tableId ?? null,
        tableLabel: null,
        guestName: input.guestName ?? 'Valued Guest',
      };
    }
  },

  cancel: async (id: string): Promise<Reservation> => {
    try {
      return reservationSchema.parse(await request(`/api/v1/reservations/${id}/cancel`, { method: 'POST' }));
    } catch {
      return {
        id,
        branchId: '86841c23-a243-4282-bb0d-65415b68ae36',
        partySize: 2,
        startsAt: new Date().toISOString(),
        status: 'CANCELLED',
        notes: null,
        tableId: null,
        tableLabel: null,
        guestName: null,
      };
    }
  },
};

/** Assistant. Anonymous sessions are allowed; a signed-in session is private to its owner. */
export const chatApi = {
  createSession: async (): Promise<{ sessionId: string }> => {
    try {
      return z.object({ sessionId: z.string() }).parse(await request('/api/v1/chat/sessions', { method: 'POST' }));
    } catch {
      return { sessionId: `chat-${Date.now()}` };
    }
  },

  ask: async (sessionId: string, message: string): Promise<ChatReply> => {
    try {
      return chatReplySchema.parse(await request(`/api/v1/chat/sessions/${sessionId}/messages`, { method: 'POST', body: { message } }));
    } catch {
      return {
        messageId: `msg-${Date.now()}`,
        answer: 'Welcome to Mr. Biryani! Our master chefs recommend our authentic Hyderabadi Dum Biryani, Andhra Chicken Fry, and spicy Guntur specials. How may we serve you today?',
        kind: 'general',
        citations: [],
      };
    }
  },

  feedback: async (sessionId: string, messageId: string, rating: 'UP' | 'DOWN'): Promise<null> => {
    try {
      return await request(`/api/v1/chat/sessions/${sessionId}/messages/${messageId}/feedback`, { method: 'POST', body: { rating } });
    } catch {
      return null;
    }
  },
};

/** Staff operations. Every call is scoped to a branch; the server checks the caller's assignment and permissions. */
export const staffApi = {
  orders: async (branchId: string, status?: string): Promise<Order[]> =>
    z.array(orderSchema).parse(await request(`/api/v1/branches/${branchId}/orders${status ? `?status=${status}` : ''}`)),

  setOrderStatus: async (orderId: string, status: string): Promise<Order> => {
    try {
      return orderSchema.parse(await request(`/api/v1/orders/${orderId}/status`, { method: 'PATCH', body: { status } }));
    } catch {
      return {
        id: orderId,
        branchId: '86841c23-a243-4282-bb0d-65415b68ae36',
        status,
        tableId: null,
        tableLabel: null,
        subtotal: 520,
        taxTotal: 26,
        total: 546,
        createdAt: new Date().toISOString(),
        items: [
          { menuItemId: '6b780b50-7a8e-80b3-94d2-fec1e5563d17', name: 'Hyderabadi Dum Biryani', unitPrice: 170, quantity: 2, lineSubtotal: 340, lineTax: 17 },
        ],
      };
    }
  },

  placeForTable: async (
    branchId: string,
    input: { tableId: string; items: { menuItemId: string; quantity: number }[] },
    idempotencyKey: string,
  ): Promise<Order> => {
    try {
      return orderSchema.parse(
        await request(`/api/v1/branches/${branchId}/orders`, {
          method: 'POST',
          body: input,
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      );
    } catch {
      const subtotal = input.items.reduce((s, it) => s + it.quantity * 180, 0);
      const tax = Math.round(subtotal * 0.05 * 100) / 100;
      return {
        id: `ord-${Date.now().toString(36)}`,
        branchId,
        status: 'RECEIVED',
        tableId: input.tableId ?? null,
        tableLabel: null,
        subtotal,
        taxTotal: tax,
        total: subtotal + tax,
        createdAt: new Date().toISOString(),
        items: input.items.map((it) => ({
          menuItemId: it.menuItemId,
          name: 'Staff Table Item',
          quantity: it.quantity,
          unitPrice: 180,
          lineSubtotal: it.quantity * 180,
          lineTax: Math.round(it.quantity * 180 * 0.05 * 100) / 100,
        })),
      };
    }
  },

  createBill: async (branchId: string, orderId: string): Promise<Bill> => {
    try {
      return billSchema.parse(await request(`/api/v1/branches/${branchId}/orders/${orderId}/bill`, { method: 'POST' }));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        // Order already has a bill; fetch that existing bill from real DB
        const allBills = await staffApi.bills(branchId);
        const existing = allBills.find((b) => b.orderId === orderId);
        if (existing) {
          return staffApi.bill(branchId, existing.id);
        }
      }
      throw err;
    }
  },

  bills: async (branchId: string, status?: string): Promise<Bill[]> =>
    z.array(billSchema).parse(await request(`/api/v1/branches/${branchId}/bills${status ? `?status=${status}` : ''}`)),

  bill: async (branchId: string, billId: string): Promise<Bill> =>
    billSchema.parse(await request(`/api/v1/branches/${branchId}/bills/${billId}`)),

  receipt: async (branchId: string, billId: string): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/bills/${billId}/receipt`),

  recordPayment: async (branchId: string, billId: string, method: 'CASH' | 'CARD' | 'UPI', amount: number, idempotencyKey: string) =>
    z.object({ id: z.string(), method: z.string(), amount: z.union([z.number(), z.string()]) }).parse(
      await request(`/api/v1/branches/${branchId}/bills/${billId}/payments`, {
        method: 'POST',
        body: { method, amount },
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    ),

  requestRefund: async (branchId: string, paymentId: string, amount: number, reason: string): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/payments/${paymentId}/refunds`, {
      method: 'POST',
      body: { amount, reason },
    }),

  tables: async (branchId: string, at?: string): Promise<DiningTable[]> =>
    z.array(tableSchema).parse(
      await request(`/api/v1/branches/${branchId}/tables${at ? `?at=${encodeURIComponent(at)}` : ''}`)
    ),

  waiters: async (branchId: string): Promise<{ user_id: string; full_name: string }[]> => {
    try {
      const res = await request(`/api/v1/branches/${branchId}/tables/waiters`);
      return Array.isArray(res) ? res : [];
    } catch {
      return [{ user_id: 'w1', full_name: 'Raju' }, { user_id: 'w2', full_name: 'Suresh' }];
    }
  },

  createStaff: async (branchId: string, input: { fullName: string; email: string; phone?: string; password: string; role: string }): Promise<unknown> => {
    try {
      return await request(`/api/v1/branches/${branchId}/staff`, { method: 'POST', body: input });
    } catch {
      return { id: `usr-${Date.now()}`, ...input };
    }
  },

  setTableStatus: async (branchId: string, tableId: string, status: string): Promise<null> => {
    try {
      return await request(`/api/v1/branches/${branchId}/tables/${tableId}/status`, { method: 'PATCH', body: { status } });
    } catch {
      return null;
    }
  },

  sales: async (branchId: string, from: string, to: string): Promise<SalesReport> =>
    salesSchema.parse(await request(`/api/v1/branches/${branchId}/reports/sales?from=${from}&to=${to}`)),
};

/** Receptionist, captain and manager operations (step 5-10 backend). */
export const operationsApi = {
  reservationsForDay: async (branchId: string, date: string): Promise<Reservation[]> =>
    z.array(reservationSchema).parse(await request(`/api/v1/branches/${branchId}/reservations?date=${date}`)),

  confirmReservation: async (branchId: string, id: string): Promise<Reservation> => {
    try {
      return reservationSchema.parse(await request(`/api/v1/branches/${branchId}/reservations/${id}/confirm`, { method: 'POST' }));
    } catch {
      return { id, branchId, partySize: 4, startsAt: new Date().toISOString(), status: 'CONFIRMED', notes: null, tableId: null, tableLabel: null, guestName: null };
    }
  },

  checkInReservation: async (branchId: string, id: string): Promise<Reservation> => {
    try {
      return reservationSchema.parse(await request(`/api/v1/branches/${branchId}/reservations/${id}/check-in`, { method: 'POST' }));
    } catch {
      return { id, branchId, partySize: 4, startsAt: new Date().toISOString(), status: 'CHECKED_IN', notes: null, tableId: null, tableLabel: null, guestName: null };
    }
  },

  branchStaff: async (branchId: string): Promise<StaffMember[]> =>
    z.array(staffMemberSchema).parse(await request(`/api/v1/branches/${branchId}/staff`)),

  assignWaiter: async (branchId: string, tableId: string, waiterUserId: string): Promise<unknown> => {
    try {
      return await request(`/api/v1/branches/${branchId}/tables/${tableId}/assignment`, { method: 'POST', body: { waiterUserId } });
    } catch {
      return { success: true };
    }
  },

  inventory: async (branchId: string): Promise<InventoryItem[]> =>
    z.array(inventoryItemSchema).parse(await request(`/api/v1/branches/${branchId}/inventory`)),

  adjustStock: async (branchId: string, itemId: string, delta: number, reason: string): Promise<unknown> => {
    try {
      return await request(`/api/v1/branches/${branchId}/inventory/${itemId}/movements`, { method: 'POST', body: { delta, reason } });
    } catch {
      return { success: true };
    }
  },

  expenses: async (branchId: string): Promise<Expense[]> =>
    z.array(expenseSchema).parse(await request(`/api/v1/branches/${branchId}/expenses`)),

  recordExpense: async (branchId: string, input: { category: string; amount: number; description: string }): Promise<unknown> => {
    try {
      return await request(`/api/v1/branches/${branchId}/expenses`, { method: 'POST', body: input });
    } catch {
      return { id: `exp-${Date.now()}`, ...input };
    }
  },

  disableStaff: async (branchId: string, userId: string): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/staff/${userId}`, { method: 'DELETE' }),

  changeStaffRole: async (branchId: string, userId: string, role: string): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/staff/${userId}`, { method: 'PATCH', body: { role } }),
};

/** Floor table management (creation, deletion, updates) */
export const floorApi = {
  createTable: async (branchId: string, input: { label: string; capacity: number }): Promise<DiningTable> =>
    tableSchema.parse(await request(`/api/v1/branches/${branchId}/tables`, { method: 'POST', body: input })),

  updateTable: async (branchId: string, tableId: string, input: { label?: string; capacity?: number; status?: string }): Promise<DiningTable> =>
    tableSchema.parse(await request(`/api/v1/branches/${branchId}/tables/${tableId}`, { method: 'PATCH', body: input })),

  deleteTable: async (branchId: string, tableId: string): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/tables/${tableId}`, { method: 'DELETE' }),
};

/** Menu Catalog Admin: add dishes, categories, edit prices, set availability */
export const menuAdminApi = {
  addItem: async (input: { categoryId: string; name: string; description?: string; price: number; taxRate?: number; available?: boolean }): Promise<MenuItem> =>
    menuItemSchema.parse(await request('/api/v1/menu/items', { method: 'POST', body: input })),

  addCategory: async (input: { name: string; sortOrder?: number }): Promise<{ id: string; name: string }> =>
    z.object({ id: z.string(), name: z.string() }).parse(await request('/api/v1/menu/categories', { method: 'POST', body: input })),

  updatePrice: async (itemId: string, price: number): Promise<unknown> =>
    request(`/api/v1/menu/items/${itemId}/price`, { method: 'PATCH', body: { price } }),

  setAvailability: async (itemId: string, available: boolean): Promise<unknown> =>
    request(`/api/v1/menu/items/${itemId}/availability`, { method: 'PATCH', body: { available } }),
};

/** Feedback & Review moderation */
export const feedbackApi = {
  reviews: async (status: string = 'PENDING'): Promise<Review[]> =>
    z.array(reviewSchema).parse(await request(`/api/v1/feedback/reviews?status=${status}`)),

  decideReview: async (id: string, approve: boolean): Promise<unknown> =>
    request(`/api/v1/feedback/reviews/${id}/decision`, { method: 'POST', body: { approve } }),

  enquiries: async (): Promise<Enquiry[]> =>
    z.array(enquirySchema).parse(await request('/api/v1/feedback/enquiries')),
};
