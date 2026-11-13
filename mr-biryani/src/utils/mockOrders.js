const ORDERS_KEY = 'mr-biriyani-mock-orders'
const RESERVATIONS_KEY = 'mr-biriyani-mock-reservations'

const read = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const getOrdersForUser = (userId) => read(ORDERS_KEY).filter((order) => order.userId === userId)
export const createMockOrder = (order) => {
  const saved = { ...order, id: globalThis.crypto?.randomUUID?.() || `order-${Date.now()}`, status: 'Received', createdAt: new Date().toISOString() }
  write(ORDERS_KEY, [...read(ORDERS_KEY), saved])
  return saved
}
export const getReservationsForUser = (userId) => read(RESERVATIONS_KEY).filter((reservation) => reservation.userId === userId)
export const createMockReservation = (reservation) => {
  const saved = { ...reservation, id: globalThis.crypto?.randomUUID?.() || `reservation-${Date.now()}`, status: 'Requested', createdAt: new Date().toISOString() }
  write(RESERVATIONS_KEY, [...read(RESERVATIONS_KEY), saved])
  return saved
}
