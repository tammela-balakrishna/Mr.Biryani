import { api, newIdempotencyKey } from './client'

// Staff and admin operations for the website. Every call is checked by the server against the signed-in
// account's permissions and branch assignment. The browser never decides access on its own.

const b = (branchId) => `/api/v1/branches/${branchId}`

export const branchApi = {
  list: () => api.get('/api/v1/branches'),
}

export const floorApi = {
  tables: (branchId) => api.get(`${b(branchId)}/tables`),
  setTableStatus: (branchId, tableId, status) => api.patch(`${b(branchId)}/tables/${tableId}/status`, { status }),
  assignWaiter: (branchId, tableId, waiterUserId) => api.post(`${b(branchId)}/tables/${tableId}/assignment`, { waiterUserId }),
  staff: (branchId) => api.get(`${b(branchId)}/staff`),
}

export const ordersApi = {
  list: (branchId, status) => api.get(`${b(branchId)}/orders${status ? `?status=${status}` : ''}`),
  setStatus: (orderId, status) => api.patch(`/api/v1/orders/${orderId}/status`, { status }),
  bills: (branchId, status) => api.get(`${b(branchId)}/bills${status ? `?status=${status}` : ''}`),
  createBill: (branchId, orderId) => api.post(`${b(branchId)}/orders/${orderId}/bill`),
  bill: (branchId, billId) => api.get(`${b(branchId)}/bills/${billId}`),
  receipt: (branchId, billId) => api.get(`${b(branchId)}/bills/${billId}/receipt`),
  pay: (branchId, billId, method, amount) =>
    api.post(`${b(branchId)}/bills/${billId}/payments`, { method, amount }, { 'Idempotency-Key': newIdempotencyKey() }),
  requestRefund: (branchId, paymentId, amount, reason) =>
    api.post(`${b(branchId)}/payments/${paymentId}/refunds`, { amount, reason }),
}

export const receptionApi = {
  day: (branchId, date) => api.get(`${b(branchId)}/reservations?date=${date}`),
  confirm: (branchId, id) => api.post(`${b(branchId)}/reservations/${id}/confirm`),
  checkIn: (branchId, id) => api.post(`${b(branchId)}/reservations/${id}/check-in`),
  walkIn: (branchId, input) => api.post(`${b(branchId)}/walk-ins`, input),
}

export const managerApi = {
  inventory: (branchId) => api.get(`${b(branchId)}/inventory`),
  addItem: (branchId, input) => api.post(`${b(branchId)}/inventory`, input),
  adjustStock: (branchId, itemId, delta, reason) => api.post(`${b(branchId)}/inventory/${itemId}/movements`, { delta, reason }),
  expenses: (branchId) => api.get(`${b(branchId)}/expenses`),
  recordExpense: (branchId, input) => api.post(`${b(branchId)}/expenses`, input),
  decideExpense: (branchId, id, approve) => api.post(`${b(branchId)}/expenses/${id}/decision`, { approve }),
  refundsRequested: (branchId) => api.get(`${b(branchId)}/refunds?status=REQUESTED`),
  decideRefund: (branchId, id, approve) => api.post(`${b(branchId)}/refunds/${id}/decision`, { approve }),
  createStaff: (branchId, input) => api.post(`${b(branchId)}/staff`, input),
  disableStaff: (branchId, userId) => api.del(`${b(branchId)}/staff/${userId}`),
  sales: (branchId, from, to) => api.get(`${b(branchId)}/reports/sales?from=${from}&to=${to}`),
}

export const adminApi = {
  roles: () => api.get('/api/v1/roles'),
  permissions: () => api.get('/api/v1/permissions'),
  updateRolePermissions: (code, permissions) => api.put(`/api/v1/roles/${code}/permissions`, { permissions }),
}

export const feedbackApi = {
  reviews: (status) => api.get(`/api/v1/feedback/reviews?status=${status}`),
  decideReview: (id, approve) => api.post(`/api/v1/feedback/reviews/${id}/decision`, { approve }),
  enquiries: () => api.get('/api/v1/feedback/enquiries'),
  publishedReviews: () => api.get('/api/v1/reviews'),
}
