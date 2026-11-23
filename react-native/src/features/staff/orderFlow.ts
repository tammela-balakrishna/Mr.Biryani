// Kitchen and service flow for an order. Mirrors the backend state machine and shared.js in web.
// Note: COMPLETED is NOT a kitchen or floor action. Orders are completed exclusively upon payment settlement
// at the Cashier till.
const NEXT: Record<string, { to: string; label: string } | undefined> = {
  PLACED: { to: 'ACCEPTED', label: 'Accept' },
  ACCEPTED: { to: 'PREPARING', label: 'Start preparing' },
  PREPARING: { to: 'READY', label: 'Mark ready' },
  READY: { to: 'SERVED', label: 'Mark served' },
};

export const nextStep = (status: string) => NEXT[status] ?? null;

export const isServedAwaitingPayment = (status: string) => status === 'SERVED';
