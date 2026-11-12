
const CART_KEY = 'mr-biriyani-cart'

export const getCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY))
    return Array.isArray(cart) ? cart : []
  } catch {
    return []
  }
}

export const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

export const addToCart = (product) => {
  const cart = getCart()
  const existing = cart.find((item) => item.id === product.id)

  const updatedCart = existing
    ? cart.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    : [...cart, { ...product, quantity: 1 }]

  saveCart(updatedCart)
  return updatedCart
}
