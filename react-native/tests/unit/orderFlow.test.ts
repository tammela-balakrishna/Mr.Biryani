import { nextStep } from '../../src/features/staff/orderFlow';

describe('order flow', () => {
  it('walks an order forward one step at a time', () => {
    expect(nextStep('PLACED')?.to).toBe('ACCEPTED');
    expect(nextStep('READY')?.to).toBe('SERVED');
  });

  it('offers no step once an order is completed or cancelled', () => {
    expect(nextStep('COMPLETED')).toBeNull();
    expect(nextStep('CANCELLED')).toBeNull();
  });
});
