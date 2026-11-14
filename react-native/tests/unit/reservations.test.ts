import { toInstant, validateReservation } from '../../src/features/reservations/rules';

describe('reservation rules', () => {
  const now = new Date('2026-12-01T10:00:00');

  it('accepts a valid future request', () => {
    expect(validateReservation({ date: '2026-12-02', time: '19:00', partySize: 4 }, now)).toBeNull();
  });

  it('rejects party sizes outside 1-20', () => {
    expect(validateReservation({ date: '2026-12-02', time: '19:00', partySize: 0 }, now)).toMatch(/Party size/);
    expect(validateReservation({ date: '2026-12-02', time: '19:00', partySize: 21 }, now)).toMatch(/Party size/);
  });

  it('rejects past times and bookings more than 120 days ahead', () => {
    expect(validateReservation({ date: '2026-11-30', time: '19:00', partySize: 2 }, now)).toMatch(/future/);
    expect(validateReservation({ date: '2027-06-01', time: '19:00', partySize: 2 }, now)).toMatch(/120 days/);
  });

  it('rejects malformed date or time', () => {
    expect(toInstant('2026-1-2', '19:00')).toBeNull();
    expect(toInstant('2026-12-02', '7pm')).toBeNull();
    expect(validateReservation({ date: 'nope', time: '19:00', partySize: 2 }, now)).toMatch(/valid date/);
  });
});
