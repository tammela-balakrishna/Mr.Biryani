
const ACCOUNTS_STORAGE_KEY = 'mrBiriyani_accounts'
const SESSION_STORAGE_KEY = 'mrBiriyani_session'
const REMEMBERED_USER_KEY = 'mrBiriyani_rememberedUser'
const LEGACY_AUTH_KEY = 'mrBiriyani_currentUser'

// Normalize email addresses to avoid duplicate accounts with different casing.
const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase()
}

// Read registered customer accounts.
const getAccounts = () => {
  try {
    const storedAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    const accounts = storedAccounts ? JSON.parse(storedAccounts) : []

    return Array.isArray(accounts) ? accounts : []
  } catch (error) {
    console.error('Error reading customer accounts:', error)
    return []
  }
}

// Save customer accounts.
const saveAccounts = (accounts) => {
  localStorage.setItem(
    ACCOUNTS_STORAGE_KEY,
    JSON.stringify(accounts)
  )
}

// Return customer information without exposing the password.
const getSafeUser = (account) => ({
  name: account.name,
  email: account.email,
})

// Register a new customer.
export const registerUser = ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email)
  const trimmedName = String(name || '').trim()

  if (!trimmedName || !normalizedEmail || !password) {
    throw new Error('Please provide all required registration details.')
  }

  const accounts = getAccounts()

  const existingAccount = accounts.find(
    (account) => normalizeEmail(account.email) === normalizedEmail
  )

  if (existingAccount) {
    throw new Error('An account with this email already exists.')
  }

  const newAccount = {
    name: trimmedName,
    email: normalizedEmail,
    password,
    createdAt: new Date().toISOString(),
  }

  saveAccounts([...accounts, newAccount])

  return getSafeUser(newAccount)
}

// Log in an existing customer.
export const loginUser = (email, password, rememberMe = false) => {
  const normalizedEmail = normalizeEmail(email)

  const accounts = getAccounts()

  const account = accounts.find(
    (item) =>
      normalizeEmail(item.email) === normalizedEmail &&
      item.password === password
  )

  if (!account) {
    throw new Error('Invalid email or password.')
  }

  const user = getSafeUser(account)

  // Clear any previous login session.
  localStorage.removeItem(REMEMBERED_USER_KEY)
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
  localStorage.removeItem(LEGACY_AUTH_KEY)

  // Remember Me keeps the customer logged in across browser sessions.
  if (rememberMe) {
    localStorage.setItem(
      REMEMBERED_USER_KEY,
      JSON.stringify(user)
    )
  } else {
    // Without Remember Me, the login lasts for the current browser session.
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(user)
    )
  }

  return user
}

// Get the currently logged-in customer.
export const getCurrentUser = () => {
  try {
    const rememberedUser = localStorage.getItem(REMEMBERED_USER_KEY)

    if (rememberedUser) {
      return JSON.parse(rememberedUser)
    }

    const sessionUser = sessionStorage.getItem(SESSION_STORAGE_KEY)

    if (sessionUser) {
      return JSON.parse(sessionUser)
    }

    return null
  } catch (error) {
    console.error('Error reading current user:', error)
    return null
  }
}

// Check whether a customer is logged in.
export const isAuthenticated = () => {
  return Boolean(getCurrentUser())
}

// Reset a customer's password using their registered email.
// This is a demo reset and does not send an email verification link.
export const resetPassword = (email, newPassword) => {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !newPassword) {
    throw new Error('Please provide your email and new password.')
  }

  const accounts = getAccounts()

  const accountIndex = accounts.findIndex(
    (account) => normalizeEmail(account.email) === normalizedEmail
  )

  if (accountIndex === -1) {
    throw new Error('No account found with this email address.')
  }

  const updatedAccounts = [...accounts]

  updatedAccounts[accountIndex] = {
    ...updatedAccounts[accountIndex],
    password: newPassword,
  }

  saveAccounts(updatedAccounts)

  return true
}

// Log out the current customer.
export const logoutUser = () => {
  localStorage.removeItem(REMEMBERED_USER_KEY)
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
  localStorage.removeItem(LEGACY_AUTH_KEY)
}
