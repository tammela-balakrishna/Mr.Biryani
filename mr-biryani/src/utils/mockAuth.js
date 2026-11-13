const USERS_KEY = 'mr-biriyani-mock-users'
const SESSION_KEY = 'mr-biriyani-mock-session'
export const MOCK_OTP = '123456'

const demoUsers = [
 { id:'demo-customer', name:'Demo Customer', phone:'9876543210', role:'customer', createdAt:'2026-11-13T00:00:00.000Z' },
 { id:'demo-waiter', name:'Demo Waiter', phone:'9000000001', role:'waiter', createdAt:'2026-11-13T00:00:00.000Z' },
 { id:'demo-receptionist', name:'Demo Receptionist', phone:'9000000002', role:'receptionist', createdAt:'2026-11-13T00:00:00.000Z' },
 { id:'demo-captain', name:'Demo Captain', phone:'9000000003', role:'captain', createdAt:'2026-11-13T00:00:00.000Z' },
 { id:'demo-cashier', name:'Demo Cashier', phone:'9000000004', role:'cashier', createdAt:'2026-11-13T00:00:00.000Z' },
 { id:'demo-manager', name:'Demo Manager', phone:'9000000005', role:'manager', createdAt:'2026-11-13T00:00:00.000Z' },
 { id:'demo-admin', name:'Demo Admin', phone:'9000000006', role:'admin', createdAt:'2026-11-13T00:00:00.000Z' },
]
export const normalizePhone = value => String(value || '').replace(/\D/g,'').slice(-10)
export const isValidIndianPhone = value => /^[6-9]\d{9}$/.test(normalizePhone(value))
export const getMockUsers = () => {
 try {
  const stored=JSON.parse(localStorage.getItem(USERS_KEY)||'null')
  const users=Array.isArray(stored)?stored:[]
  const merged=[...users]
  demoUsers.forEach(seed=>{if(!merged.some(user=>user.id===seed.id))merged.push(seed)})
  localStorage.setItem(USERS_KEY,JSON.stringify(merged))
  return merged
 } catch {
  localStorage.setItem(USERS_KEY,JSON.stringify(demoUsers))
  return demoUsers
 }
}
const saveMockUsers=users=>localStorage.setItem(USERS_KEY,JSON.stringify(users))
export const findMockUserByPhone=phone=>getMockUsers().find(user=>user.phone===normalizePhone(phone))
export const registerMockUser=({name,phone})=>{
 const normalized=normalizePhone(phone),users=getMockUsers()
 if(users.some(user=>user.phone===normalized))throw new Error('An account with this phone number already exists. Please log in.')
 const user={id:globalThis.crypto?.randomUUID?.()||'customer-'+Date.now(),name:name.trim(),phone:normalized,role:'customer',createdAt:new Date().toISOString()}
 saveMockUsers([...users,user]);localStorage.setItem(SESSION_KEY,JSON.stringify(user));return user
}
export const loginMockUser=phone=>{
 const user=findMockUserByPhone(phone)
 if(!user)throw new Error('No account found for this number. Please register first.')
 localStorage.setItem(SESSION_KEY,JSON.stringify(user));return user
}
export const getMockSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
export const logoutMockUser=()=>localStorage.removeItem(SESSION_KEY)
export const verifyMockOtp=otp=>otp.trim()===MOCK_OTP
