const USERS_KEY = 'mr-biriyani-mock-users'
const SESSION_KEY = 'mr-biriyani-mock-session'

export const MOCK_OTP = '123456'

const demoUser = {
  id: 'demo-customer',
  name: 'Demo Customer',
  phone: '9876543210',
  role: 'customer',
  createdAt: '2026-11-13T00:00:00.000Z',
}

export const normalizePhone = (value) => value.replace(/\D/g, '').slice(-10)
export const isValidIndianPhone = (value) => /^[6-9]\d{9}$/.test(normalizePhone(value))

export const getMockUsers = () => {
  try {
    const storedUsers = localStorage.getItem(USERS_KEY)
    if (storedUsers) {
      const users = JSON.parse(storedUsers)
      return Array.isArray(users) ? users : [demoUser]
    }
    localStorage.setItem(USERS_KEY, JSON.stringify([demoUser]))
    return [demoUser]
  } catch {
    return [demoUser]
  }
}

const saveMockUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users))
export const findMockUserByPhone = (phone) => getMockUsers().find((user) => user.phone === normalizePhone(phone))

export const registerMockUser = ({ name, phone }) => {
  const normalizedPhone = normalizePhone(phone)
  const users = getMockUsers()
  if (users.some((user) => user.phone === normalizedPhone)) {
    throw new Error('An account with this phone number already exists. Please log in.')
  }
  const user = {
    id: (globalThis.crypto?.randomUUID?.() || ('customer-' + Date.now())),
    name: name.trim(),
    phone: normalizedPhone,
    role: 'customer',
    createdAt: new Date().toISOString(),
  }
  saveMockUsers([...users, user])
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return user
}

export const loginMockUser = (phone) => {
  const user = findMockUserByPhone(phone)
  if (!user) throw new Error('No account found for this number. Please register first.')
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return user
}

export const getMockSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') }
  catch { return null }
}
export const logoutMockUser = () => localStorage.removeItem(SESSION_KEY)
export const verifyMockOtp = (otp) => otp.trim() === MOCK_OTP