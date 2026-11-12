
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCart, saveCart } from '../utils/cart'
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react'

function Order() {
  const [cart, setCart] = useState(() => getCart())

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    instructions: '',
  })

  const total = useMemo(
    () => cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ),
    [cart]
  )

  const updateQuantity = (product, change) => {
    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      )

      let updatedCart

      if (!existing && change > 0) {
        updatedCart = [
          ...current,
          { ...product, quantity: 1 },
        ]
      } else {
        updatedCart = current
          .map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + change,
                }
              : item
          )
          .filter((item) => item.quantity > 0)
      }

      saveCart(updatedCart)
      return updatedCart
    })
  }

  const handleCustomerChange = (event) => {
    const { name, value } = event.target

    setCustomer((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (cart.length === 0) {
      alert('Please add food items to your cart.')
      return
    }

    alert(
      'Your order interface is ready. Connect a backend or ordering service to submit real orders.'
    )
  }

  return (
    <main className="min-h-screen bg-[#0B0B0B]/80 text-white">

      {/* Page Header */}
      <section className="bg-[#310B0B] px-5 py-24 text-center">
        <ShoppingBag
          size={36}
          className="mx-auto mb-5 text-yellow-400"
        />

        <h1 className="text-5xl font-black">
          Order <span className="text-yellow-400">Online</span>
        </h1>

        <p className="mt-6 text-gray-300">
          Choose your favourite biryani and prepare your order.
        </p>

        <div className="mt-7 text-sm text-gray-400">
          <Link to="/" className="hover:text-yellow-400">
            Home
          </Link>
          <span className="mx-3">/</span>
          <span className="text-yellow-400">Order</span>
        </div>
      </section>

      {/* Order Content */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.4fr_0.8fr] lg:px-8">

        {/* Selected Food */}
        <div>
          <h2 className="mb-7 text-2xl font-extrabold">
            Selected <span className="text-yellow-400">Food</span>
          </h2>

          {cart.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#171717] p-10 text-center">
              <ShoppingBag
                size={40}
                className="mx-auto mb-4 text-yellow-400"
              />

              <h3 className="text-xl font-bold">
                Your cart is empty
              </h3>

              <p className="mt-3 text-gray-400">
                Visit our menu and add your favourite food.
              </p>

              <Link
                to="/menu"
                className="mt-6 inline-flex rounded-lg bg-yellow-500 px-6 py-3 font-bold text-black transition hover:bg-yellow-400"
              >
                Explore Menu
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#171717] p-5"
                >
                  <div>
                    <h3 className="font-bold">
                      {product.name}
                    </h3>

                    <p className="mt-2 font-bold text-yellow-400">
                      ₹{product.price}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product, -1)}
                      className="rounded-lg border border-white/20 p-2 text-white hover:border-yellow-400"
                      aria-label={`Remove one ${product.name}`}
                    >
                      <Minus size={16} />
                    </button>

                    <span className="min-w-5 text-center font-bold">
                      {product.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(product, 1)}
                      className="rounded-lg bg-yellow-500 p-2 text-black hover:bg-yellow-400"
                      aria-label={`Add one ${product.name}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <aside className="h-fit rounded-2xl border border-yellow-500/20 bg-[#171717] p-6">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold">
            <ShoppingBag className="text-yellow-400" />
            Your Cart
          </h2>

          {cart.length === 0 ? (
            <p className="py-10 text-center text-gray-400">
              Your cart is empty. Add some delicious biryani!
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 border-b border-white/10 pb-4"
                >
                  <div>
                    <p className="font-semibold">
                      {item.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-yellow-400">
                      ₹{item.price * item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item, -item.quantity)
                      }
                      aria-label={`Remove ${item.name}`}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between pt-3 text-lg font-extrabold">
                <span>Total</span>
                <span className="text-yellow-400">
                  ₹{total}
                </span>
              </div>

              <p className="text-xs text-gray-500">
                Delivery charges, if applicable, are not included.
              </p>
            </div>
          )}

          {/* Customer Details */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-4"
          >
            <h3 className="text-lg font-bold">
              Customer Details
            </h3>

            <input
              type="text"
              name="name"
              placeholder="Your full name"
              value={customer.name}
              onChange={handleCustomerChange}
              required
              className="w-full rounded-lg border border-white/10 bg-[#0B0B0B]/80 px-4 py-3 text-white outline-none focus:border-yellow-500"
            />

            <input
              type="tel"
              name="phone"
              placeholder="Phone number"
              value={customer.phone}
              onChange={handleCustomerChange}
              pattern="[0-9]{10}"
              title="Enter a 10-digit phone number"
              required
              className="w-full rounded-lg border border-white/10 bg-[#0B0B0B]/80 px-4 py-3 text-white outline-none focus:border-yellow-500"
            />

            <textarea
              name="address"
              placeholder="Delivery address"
              value={customer.address}
              onChange={handleCustomerChange}
              required
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-[#0B0B0B]/80 px-4 py-3 text-white outline-none focus:border-yellow-500"
            />

            <textarea
              name="instructions"
              placeholder="Additional instructions (optional)"
              value={customer.instructions}
              onChange={handleCustomerChange}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-[#0B0B0B]/80 px-4 py-3 text-white outline-none focus:border-yellow-500"
            />

            <button
              type="submit"
              disabled={cart.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 px-5 py-4 font-bold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue Order
              <ArrowRight size={18} />
            </button>

            <p className="text-xs leading-5 text-gray-500">
              Demo interface only. Real order placement is not connected yet.
            </p>
          </form>
        </aside>
      </section>
    </main>
  )
}

export default Order
