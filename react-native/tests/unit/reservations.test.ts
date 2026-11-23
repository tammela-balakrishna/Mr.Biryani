import { toInstant, validateReservation } from '../../src/features/reservations/rules';
import { tableSchema, reservationSchema } from '../../src/api/contracts';

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

  it('parses table schema with slot reservation fields and remaining time buffer', () => {
    const table = tableSchema.parse({
      id: 'a0000000-0000-0000-0000-000000000001',
      label: 'T-01',
      capacity: 4,
      status: 'AVAILABLE',
      waiter: 'Ravi',
      reservation_guest: 'Balakrishna',
      reservation_time: '2026-12-02T19:30:00Z',
      is_slot_reserved: false,
      slot_guest: null,
      slot_starts_at: null,
    });
    expect(table.status).toBe('AVAILABLE');
    expect(table.is_slot_reserved).toBe(false);
  });

  it('parses reservation with allocated table label', () => {
    const res = reservationSchema.parse({
      id: 'b0000000-0000-0000-0000-000000000002',
      branchId: '86841c23-a243-4282-bb0d-65415b68ae36',
      partySize: 4,
      startsAt: '2026-12-02T19:30:00Z',
      status: 'CONFIRMED',
      notes: 'Window seat',
      tableId: 'a0000000-0000-0000-0000-000000000001',
      tableLabel: 'T-01',
      guestName: 'Balakrishna',
    });
    expect(res.tableLabel).toBe('T-01');
    expect(res.status).toBe('CONFIRMED');
  });
});
