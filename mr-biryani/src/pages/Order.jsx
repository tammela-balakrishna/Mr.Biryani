
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Flame,
  Utensils,
  MapPin,
  Phone,
  User,
  Clock,
  CheckCircle2,
  History,
} from 'lucide-react'

import { createOrder, saveOrder } from '../data/orderData'

const categories = ['All', 'Chicken', 'Mutton', 'Special']

const menuItems = [
  {
    id: 1,
    name: 'Hyderabadi Dum Biryani',
    category: 'Chicken',
    description: 'Aromatic basmati rice cooked with authentic Hyderabadi spices.',
    price: 270,
    image:
      'https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=900&q=85',
    tag: 'Bestseller',
  },
  {
    id: 2,
    name: 'Fry-Piece Chicken Biryani',
    category: 'Chicken',
    description: 'Flavourful biryani served with delicious crispy chicken pieces.',
    price: 280,
    image:
      'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=900&q=85',
    tag: 'Popular',
  },
  {
    id: 3,
    name: 'Mr. Biryani Special',
    category: 'Special',
    description: 'Our signature biryani prepared with a special blend of spices.',
    price: 290,
    image:
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=85',
    tag: 'Chef Special',
  },
  {
    id: 4,
    name: 'Mutton Biryani',
    category: 'Mutton',
    description: 'Tender mutton pieces layered with fragrant basmati rice.',
    price: 340,
    image:
      'https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=900&q=85',
    tag: 'Special',
  },
  {
    id: 5,
    name: 'Mutton Biryani Family Pack',
    category: 'Mutton',
    description: 'A generous family portion, serving approximately 3–4 people.',
    price: 960,
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85',
    tag: 'Family Pack',
  },
]

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)

function Order() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState({})
  const [placedOrder, setPlacedOrder] = useState(null)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
  })

  const filteredItems =
    activeCategory === 'All'
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory)

  const cartItems = useMemo(
    () =>
      menuItems
        .filter((item) => cart[item.id] > 0)
        .map((item) => ({
          ...item,
          quantity: cart[item.id],
        })),
    [cart],
  )

  const totalItems = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  )

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  )

  const resetOrderMessage = () => {
    setOrderPlaced(false)
    setPlacedOrder(null)
    setErrorMessage('')
  }

  const addToCart = (id) => {
    setCart((previous) => ({
      ...previous,
      [id]: (previous[id] || 0) + 1,
    }))
    resetOrderMessage()
  }

  const decreaseQuantity = (id) => {
    setCart((previous) => {
      const updated = { ...previous }

      if (updated[id] <= 1) {
        delete updated[id]
      } else {
        updated[id] -= 1
      }

      return updated
    })

    resetOrderMessage()
  }

  const removeItem = (id) => {
    setCart((previous) => {
      const updated = { ...previous }
      delete updated[id]
      return updated
    })

    resetOrderMessage()
  }

  const handleCustomerChange = (event) => {
    const { name, value } = event.target

    setCustomer((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!cartItems.length) {
      setErrorMessage('Please add at least one item to your cart.')
      return
    }

    if (!customer.name.trim()) {
      setErrorMessage('Please enter your full name.')
      return
    }

    if (!/^[6-9]\d{9}$/.test(customer.phone.trim())) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.')
      return
    }

    if (!customer.address.trim()) {
      setErrorMessage('Please enter your complete delivery address.')
      return
    }

    try {
      const orderData = createOrder({
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
        },
        cartItems,
        subtotal,
      })

      saveOrder(orderData)

      setPlacedOrder(orderData)
      setOrderPlaced(true)
      setCart({})
    } catch (error) {
      console.error('Unable to save order:', error)
      setErrorMessage(
        'Unable to save your order. Please try again.',
      )
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0705] text-white">
      {/* HERO SECTION */}
      <section className="relative isolate overflow-hidden border-b border-[#D4A63A]/20">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1920&q=85')",
          }}
        />

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-[#190a05]/90 to-black/60" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFC107]/30 bg-[#FFC107]/10 px-4 py-2 text-xs font-bold uppercase tracking-[2px] text-[#FFC107]">
              <Flame size={15} />
              Freshly Prepared
            </div>

            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Order Your
              <span className="mt-2 block text-[#FFC107]">
                Favourite Biryani
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-7 text-neutral-300 sm:text-base">
              Experience authentic Andhra flavours and aromatic
              Hyderabadi biryani. Choose your favourites and build
              your order.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#order-menu"
                className="inline-flex items-center gap-3 rounded-lg bg-[#FFC107] px-7 py-4 font-bold text-black transition duration-300 hover:-translate-y-1 hover:bg-yellow-300"
              >
                Explore Our Menu
                <ArrowRight size={19} />
              </a>

              <Link
                to="/order-history"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-5 py-3 font-semibold text-yellow-400 transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-500 hover:text-black"
              >
                <History size={18} />
                Order History
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 rounded-full bg-[#FFC107]/10 blur-3xl" />

            <img
              src="https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=1000&q=90"
              alt="Delicious Hyderabadi biryani"
              className="relative aspect-square w-full rounded-full border-[5px] border-[#FFC107]/80 object-cover shadow-2xl shadow-black/60"
            />

            <div className="absolute -bottom-4 -left-2 rounded-xl border border-[#FFC107]/30 bg-[#160b06] px-5 py-3 shadow-xl">
              <p className="text-xs text-neutral-400">
                Authentic Taste
              </p>
              <p className="font-bold text-[#FFC107]">
                Made with Passion
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MENU SECTION */}
      <section
        id="order-menu"
        className="mx-auto max-w-7xl px-5 py-16 sm:px-8"
      >
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[4px] text-[#FFC107]">
            Explore Our Selection
          </p>

          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Choose Your{' '}
            <span className="text-[#FFC107]">Biryani</span>
          </h2>

          <p className="mt-4 text-sm text-neutral-400">
            Freshly prepared, full of flavour and served with love.
          </p>
        </div>

        {/* CATEGORY FILTERS */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-6 py-2.5 text-sm font-semibold transition duration-300 ${
                activeCategory === category
                  ? 'border-[#FFC107] bg-[#FFC107] text-black'
                  : 'border-white/15 bg-white/5 text-neutral-300 hover:border-[#FFC107] hover:text-[#FFC107]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[1fr_360px]">
          {/* FOOD CARDS */}
          <div className="grid gap-6 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#15100d] transition duration-300 hover:-translate-y-1 hover:border-[#FFC107]/50 hover:shadow-xl hover:shadow-black/30"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-56 w-full object-cover transition duration-700 group-hover:scale-110"
                  />

                  <span className="absolute left-4 top-4 rounded-full border border-[#FFC107]/40 bg-black/80 px-3 py-1.5 text-xs font-bold text-[#FFC107] backdrop-blur-md">
                    {item.tag}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold leading-snug text-white">
                      {item.name}
                    </h3>

                    <span className="shrink-0 text-lg font-extrabold text-[#FFC107]">
                      {formatPrice(item.price)}
                    </span>
                  </div>

                  <p className="mt-3 min-h-[48px] text-sm leading-6 text-neutral-400">
                    {item.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="flex items-center gap-1 text-xs text-neutral-400">
                      <Flame size={14} className="text-orange-500" />
                      Andhra Flavours
                    </span>

                    {cart[item.id] ? (
                      <div className="flex items-center gap-3 rounded-full border border-[#FFC107]/40 bg-[#FFC107]/10 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          aria-label={`Decrease ${item.name} quantity`}
                          className="text-[#FFC107] hover:text-white"
                        >
                          <Minus size={16} />
                        </button>

                        <span className="min-w-4 text-center text-sm font-bold">
                          {cart[item.id]}
                        </span>

                        <button
                          type="button"
                          onClick={() => addToCart(item.id)}
                          aria-label={`Increase ${item.name} quantity`}
                          className="text-[#FFC107] hover:text-white"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(item.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#FFC107] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* CART SIDEBAR */}
          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-[#FFC107]/25 bg-[#15100d] shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#20130b] p-5">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="text-[#FFC107]" size={22} />
                  <h3 className="text-lg font-bold">Your Cart</h3>
                </div>

                <span className="rounded-full bg-[#FFC107] px-3 py-1 text-xs font-extrabold text-black">
                  {totalItems} Items
                </span>
              </div>

              <div className="max-h-[330px] space-y-4 overflow-y-auto p-5">
                {cartItems.length === 0 ? (
                  <div className="py-10 text-center">
                    <ShoppingBag
                      size={42}
                      className="mx-auto text-[#FFC107]/40"
                    />

                    <p className="mt-4 font-semibold text-white">
                      Your cart is empty
                    </p>

                    <p className="mt-2 text-sm text-neutral-500">
                      Add your favourite biryani to get started.
                    </p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 border-b border-white/10 pb-4"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-white">
                          {item.name}
                        </h4>

                        <p className="mt-1 text-sm font-bold text-[#FFC107]">
                          {formatPrice(item.price * item.quantity)}
                        </p>

                        <p className="mt-1 text-xs text-neutral-400">
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="self-start text-neutral-500 transition hover:text-red-400"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/10 p-5">
                <div className="flex justify-between text-sm text-neutral-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div className="mt-3 flex justify-between text-sm text-neutral-400">
                  <span>Delivery charges</span>
                  <span>Calculated at checkout</span>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="font-bold text-white">Total</span>

                  <span className="text-2xl font-extrabold text-[#FFC107]">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* CUSTOMER DETAILS */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="grid gap-10 rounded-2xl border border-[#FFC107]/20 bg-gradient-to-br from-[#1b1009] to-[#100b08] p-6 sm:p-10 lg:grid-cols-2 lg:p-12">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[3px] text-[#FFC107]">
              Almost There
            </p>

            <h2 className="text-3xl font-extrabold leading-tight">
              Complete Your
              <span className="block text-[#FFC107]">
                Order Details
              </span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-neutral-400">
              Enter your details to save your order and view it in
              your order history.
            </p>

            <div className="mt-9 space-y-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-[#FFC107]/10 p-3">
                  <Utensils className="text-[#FFC107]" size={21} />
                </div>

                <div>
                  <p className="font-semibold">
                    Authentic Andhra Cuisine
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Rich flavours and aromatic spices
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-[#FFC107]/10 p-3">
                  <Clock className="text-[#FFC107]" size={21} />
                </div>

                <div>
                  <p className="font-semibold">Freshly Prepared</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Prepared for your order
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-[#FFC107]/10 p-3">
                  <MapPin className="text-[#FFC107]" size={21} />
                </div>

                <div>
                  <p className="font-semibold">
                    BTM 1st Stage, Bengaluru
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Mr. BIRIYANI
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-white/10 bg-black/30 p-5 sm:p-7"
          >
            <h3 className="mb-5 text-xl font-bold">
              Delivery Information
            </h3>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Full Name
              </label>

              <div className="flex items-center rounded-lg border border-white/15 bg-[#0d0a08] px-4 focus-within:border-[#FFC107]">
                <User size={18} className="text-[#FFC107]" />

                <input
                  required
                  name="name"
                  value={customer.name}
                  onChange={handleCustomerChange}
                  placeholder="Enter your name"
                  className="w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Phone Number
              </label>

              <div className="flex items-center rounded-lg border border-white/15 bg-[#0d0a08] px-4 focus-within:border-[#FFC107]">
                <Phone size={18} className="text-[#FFC107]" />

                <input
                  required
                  type="tel"
                  name="phone"
                  value={customer.phone}
                  onChange={handleCustomerChange}
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className="w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Delivery Address
              </label>

              <div className="flex items-start rounded-lg border border-white/15 bg-[#0d0a08] px-4 focus-within:border-[#FFC107]">
                <MapPin size={18} className="mt-4 text-[#FFC107]" />

                <textarea
                  required
                  name="address"
                  value={customer.address}
                  onChange={handleCustomerChange}
                  rows={3}
                  placeholder="Enter your complete delivery address"
                  className="w-full resize-none bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* ERROR MESSAGE */}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {errorMessage}
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {orderPlaced && placedOrder && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 size={20} />
                  Order Saved Successfully!
                </div>

                <div className="mt-3 space-y-1 text-green-300">
                  <p>Order ID: {placedOrder.orderId}</p>
                  <p>Customer: {placedOrder.customer.name}</p>
                  <p>
                    Total:{' '}
                    {formatPrice(placedOrder.pricing.total)}
                  </p>
                  <p>Status: {placedOrder.orderStatus}</p>
                </div>

                <Link
                  to="/order-history"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 font-bold text-black transition hover:bg-green-400"
                >
                  View Order History
                  <ArrowRight size={17} />
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={cartItems.length === 0 || orderPlaced}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#FFC107] px-6 py-4 font-extrabold text-black transition duration-300 hover:-translate-y-1 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {orderPlaced ? 'Order Saved' : 'Place Order'}
              {!orderPlaced && <ArrowRight size={19} />}
            </button>

            <p className="text-center text-xs leading-5 text-neutral-500">
              Demo checkout: no payment is collected and the order
              is saved locally in this browser.
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Order
