import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { api } from '../../api/client'
import { card, button, ghost, money, errorText, shortId, timeOf } from './shared'
import { Message, Shell, Kpis, Section, Empty } from './ui'

const ACTIONS = [
  ['Order online', '/order', 'Pick dishes and place an order.'],
  ['Browse the menu', '/menu', 'See every dish and price.'],
  ['Reserve a table', '/reservations', 'Book a table for your group.'],
  ['My orders', '/orders', 'Track your orders and bills.'],
  ['Share a review', '/reviews', 'Tell us about your visit.'],
  ['Profile', '/profile', 'Update your details.'],
]

// Customer: my orders, my reservations and quick actions.
export default function CustomerDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [reservations, setReservations] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/api/v1/orders'), api.get('/api/v1/reservations/mine')])
      .then(([o, r]) => { setOrders(o); setReservations(r) })
      .catch((err) => setError(errorText(err, 'Could not load your activity.')))
  }, [])

  const active = orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status))

  return (
    <Shell eyebrow="Your account" title={`Welcome, ${user?.fullName ?? 'guest'}`}>
      <Message text={error} />
      <Kpis items={[
        ['Active orders', active.length],
        ['Orders placed', orders.length],
        ['Reservations', reservations.filter((r) => r.status !== 'CANCELLED').length],
      ]} />

      <Section title="Quick actions">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map(([label, to, hint]) => (
            <Link key={to} to={to} className={`${card} block hover:border-[#D4A63A]`}>
              <p className="font-bold text-[#D4A63A]">{label}</p>
              <p className="mt-1 text-sm text-neutral-400">{hint}</p>
            </Link>
          ))}
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Recent orders">
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className={`${card} flex justify-between`}>
              <span>{shortId(o.id)} · ₹{money(o.total)}</span>
              <span className="text-[#D4A63A]">{o.status}</span>
            </div>
          ))}
          {orders.length === 0 ? <Empty>No orders yet.</Empty> : null}
          <Link to="/orders" className={ghost}>All orders</Link>
        </Section>

        <Section title="Upcoming reservations">
          {reservations.slice(0, 5).map((r) => (
            <div key={r.id} className={`${card} flex justify-between`}>
              <span>{timeOf(r.startsAt)} · {r.partySize} guests</span>
              <span className="text-[#D4A63A]">{r.status}</span>
            </div>
          ))}
          {reservations.length === 0 ? <Empty>No reservations yet.</Empty> : null}
          <Link to="/reservations" className={button}>Reserve a table</Link>
        </Section>
      </div>
    </Shell>
  )
}
