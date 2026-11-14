// Kitchen and service flow for an order. Mirrors the backend state machine in OrderStatus.java.
// The server enforces it; this only chooses which button to show.
const NEXT: Record<string, { to: string; label: string } | undefined> = {
  PLACED: { to: 'ACCEPTED', label: 'Accept' },
  ACCEPTED: { to: 'PREPARING', label: 'Start preparing' },
  PREPARING: { to: 'READY', label: 'Mark ready' },
  READY: { to: 'SERVED', label: 'Mark served' },
  SERVED: { to: 'COMPLETED', label: 'Complete' },
};

export const nextStep = (status: string) => NEXT[status] ?? null;
