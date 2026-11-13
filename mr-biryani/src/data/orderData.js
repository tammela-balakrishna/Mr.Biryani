
const ORDERS_STORAGE_KEY = 'mrBiriyani_orders'

const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase()
}

// Get all stored orders.
export const getOrders = () => {
  try {
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY)
    const parsedOrders = storedOrders ? JSON.parse(storedOrders) : []

    return Array.isArray(parsedOrders) ? parsedOrders : []
  } catch (error) {
    console.error('Error reading orders:', error)
    return []
  }
}

// Get orders belonging to a specific customer.
export const getOrdersByEmail = (email) => {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) return []

  return getOrders().filter(
    (order) =>
      normalizeEmail(order.customer?.email) === normalizedEmail
  )
}

// Create a new order.
export const createOrder = ({ customer, cartItems, subtotal }) => {
  if (!customer || !Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Invalid order information.')
  }

  if (!normalizeEmail(customer.email)) {
    throw new Error('Customer email is required to place an order.')
  }

  const validItems = cartItems.map((item) => {
    const price = Number(item.price)
    const quantity = Number(item.quantity)

    if (
      !item.id ||
      !item.name ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new Error('Invalid item information in your cart.')
    }

    return {
      productId: item.id,
      name: item.name,
      image: item.image || '',
      price,
      quantity,
      itemTotal: price * quantity,
    }
  })

  const calculatedSubtotal = validItems.reduce(
    (total, item) => total + item.itemTotal,
    0
  )

  const safeSubtotal = Number(subtotal)

  if (
    !Number.isFinite(safeSubtotal) ||
    Math.abs(safeSubtotal - calculatedSubtotal) > 0.01
  ) {
    throw new Error('Order total does not match your cart.')
  }

  return {
    orderId: `MB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    orderStatus: 'Pending',

    customer: {
      name: String(customer.name || '').trim(),
      email: normalizeEmail(customer.email),
      phone: String(customer.phone || '').trim(),
      address: String(customer.address || '').trim(),
    },

    items: validItems,

    pricing: {
      subtotal: calculatedSubtotal,
      deliveryCharge: 0,
      discount: 0,
      total: calculatedSubtotal,
    },

    payment: {
      method: 'Cash on Delivery',
      status: 'Pending',
    },
  }
}

// Save a new order.
export const saveOrder = (order) => {
  if (!order || !order.orderId || !order.customer?.email) {
    throw new Error('Invalid order data or missing customer email.')
  }

  const orders = getOrders()

  const existingOrder = orders.some(
    (item) => item.orderId === order.orderId
  )

  if (existingOrder) {
    throw new Error('This order already exists.')
  }

  const updatedOrders = [order, ...orders]

  localStorage.setItem(
    ORDERS_STORAGE_KEY,
    JSON.stringify(updatedOrders)
  )

  return order
}

// Update an order's status.
export const updateOrderStatus = (orderId, status) => {
  if (!orderId || !status) {
    throw new Error('Order ID and status are required.')
  }

  const orders = getOrders()

  const orderExists = orders.some(
    (order) => order.orderId === orderId
  )

  if (!orderExists) {
    throw new Error('Order not found.')
  }

  const updatedOrders = orders.map((order) =>
    order.orderId === orderId
      ? { ...order, orderStatus: status }
      : order
  )

  localStorage.setItem(
    ORDERS_STORAGE_KEY,
    JSON.stringify(updatedOrders)
  )

  return updatedOrders
}

// Remove all stored orders.
export const clearOrders = () => {
  localStorage.removeItem(ORDERS_STORAGE_KEY)
}
