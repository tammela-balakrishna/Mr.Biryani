import { nextStep, isServedAwaitingPayment } from '../../src/features/staff/orderFlow';

describe('order flow', () => {
  it('walks an order forward one step at a time', () => {
    expect(nextStep('PLACED')?.to).toBe('ACCEPTED');
    expect(nextStep('ACCEPTED')?.to).toBe('PREPARING');
    expect(nextStep('PREPARING')?.to).toBe('READY');
    expect(nextStep('READY')?.to).toBe('SERVED');
  });

  it('offers no kitchen step once an order is served, completed or cancelled', () => {
    expect(nextStep('SERVED')).toBeNull();
    expect(isServedAwaitingPayment('SERVED')).toBe(true);
    expect(nextStep('COMPLETED')).toBeNull();
    expect(nextStep('CANCELLED')).toBeNull();
  });
});
