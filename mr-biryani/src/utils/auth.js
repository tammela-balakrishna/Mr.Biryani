
const AUTH_STORAGE_KEY = 'mrBiriyani_currentUser'

const DEMO_USER = {
  email: 'customer@mrbiriyani.com',
  password: 'Biryani@123',
  name: 'Mr. Biryani Customer',
}

export const loginUser = (email, password) => {
  if (
    email.trim().toLowerCase() !== DEMO_USER.email ||
    password !== DEMO_USER.password
  ) {
    throw new Error('Invalid email or password.')
  }

  const user = {
    email: DEMO_USER.email,
    name: DEMO_USER.name,
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))

  return user
}

export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem(AUTH_STORAGE_KEY)
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

export const isAuthenticated = () => {
  return Boolean(getCurrentUser())
}

export const logoutUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
