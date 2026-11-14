import { z } from 'zod';
import { request } from './client';
import { reservationSchema, type Reservation } from './contracts';

// Walk-ins, refund approvals and expense approvals. The server enforces separation of duties:
// the person who requested a refund or recorded an expense cannot approve it.

export const refundRequestSchema = z.object({
  id: z.string(),
  payment_id: z.string(),
  amount: z.union([z.number(), z.string()]),
  reason: z.string(),
  status: z.string(),
  requested_by: z.string(),
  bill_id: z.string(),
});
export type RefundRequest = z.infer<typeof refundRequestSchema>;

export const approvalsApi = {
  walkIn: async (branchId: string, input: { guestName: string; partySize: number; notes?: string }): Promise<Reservation> =>
    reservationSchema.parse(await request(`/api/v1/branches/${branchId}/walk-ins`, { method: 'POST', body: input })),

  refundsRequested: async (branchId: string): Promise<RefundRequest[]> =>
    z.array(refundRequestSchema).parse(await request(`/api/v1/branches/${branchId}/refunds?status=REQUESTED`)),

  decideRefund: (branchId: string, refundId: string, approve: boolean): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/refunds/${refundId}/decision`, { method: 'POST', body: { approve } }),

  decideExpense: (branchId: string, expenseId: string, approve: boolean): Promise<unknown> =>
    request(`/api/v1/branches/${branchId}/expenses/${expenseId}/decision`, { method: 'POST', body: { approve } }),
};
