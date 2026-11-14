// Client-side checks that match the backend rules (party 1-20, future time, within 120 days).
// The server re-checks everything; these only give quick feedback before a request is sent.

export const MAX_PARTY = 20;
export const MAX_DAYS_AHEAD = 120;

export type ReservationInput = { date: string; time: string; partySize: number };

/** Builds an absolute instant from a local date (YYYY-MM-DD) and time (HH:MM). Returns null when invalid. */
export const toInstant = (date: string, time: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const validateReservation = (input: ReservationInput, now: Date = new Date()): string | null => {
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > MAX_PARTY) {
    return `Party size must be between 1 and ${MAX_PARTY}`;
  }
  const at = toInstant(input.date, input.time);
  if (!at) return 'Choose a valid date and time';
  if (at.getTime() <= now.getTime()) return 'Choose a time in the future';
  const limit = now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
  if (at.getTime() > limit) return `Reservations open at most ${MAX_DAYS_AHEAD} days ahead`;
  return null;
};
