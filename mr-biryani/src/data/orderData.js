
const ORDERS_STORAGE_KEY = 'mrBiriyani_orders'

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

export const saveOrder = (order) => {
  if (!order || !order.orderId) {
    throw new Error('Invalid order data')
  }

  const orders = getOrders()

  const existingOrder = orders.some(
    (item) => item.orderId === order.orderId
  )

  if (existingOrder) {
    throw new Error('This order already exists')
  }

  const updatedOrders = [order, ...orders]

  localStorage.setItem(
    ORDERS_STORAGE_KEY,
    JSON.stringify(updatedOrders)
  )

  return order
}

export const updateOrderStatus = (orderId, status) => {
  const orders = getOrders()

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

export const clearOrders = () => {
  localStorage.removeItem(ORDERS_STORAGE_KEY)
}
