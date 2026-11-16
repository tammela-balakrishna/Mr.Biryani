import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { ordersApi } from '../../api/staff'
import {
  useBranch, card, button, ghost, field, money, errorText, shortId } from './shared'
import { Message, Shell, Kpis, Section, Empty } from './ui'

// Cashier: bills served orders, takes payments, prints receipts and asks a manager to approve refunds.
export default function CashierDashboard() {
  const { hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()
  const [served, setServed] = useState([])
  const [bills, setBills] = useState([])
  const [filter, setFilter] = useState('')
  const [bill, setBill] = useState(null)
  const [method, setMethod] = useState('CASH')
  const [amount, setAmount] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [refund, setRefund] = useState({ paymentId: '', amount: '', reason: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!branchId) return
    try {
      const [orders, allBills] = await Promise.all([ordersApi.list(branchId, 'SERVED'), ordersApi.bills(branchId, filter || undefined)])
      const billed = new Set((await ordersApi.bills(branchId)).map((b) => b.order_id))
      setServed(orders.filter((o) => !billed.has(o.id)))
      setBills(allBills)
    } catch (err) {
      setError(errorText(err, 'Could not load billing.'))
    }
  }, [branchId, filter])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load, bill])

  const createBill = async (orderId) => {
    setError(''); setNotice(''); setReceipt(null)
    try {
      const created = await ordersApi.createBill(branchId, orderId)
      setBill(created); setAmount(String(created.due))
    } catch (err) { setError(errorText(err, 'Could not create the bill.')) }
  }

  const openBill = async (billId) => {
    setError(''); setNotice(''); setReceipt(null)
    try { const b = await ordersApi.bill(branchId, billId); setBill(b); setAmount(String(b.due)) } catch (err) { setError(errorText(err, 'Could not open the bill.')) }
  }

  const pay = async () => {
    setError(''); setNotice('')
    try {
      await ordersApi.pay(branchId, bill.id, method, Number(amount))
      const updated = await ordersApi.bill(branchId, bill.id)
      setBill(updated); setAmount(String(updated.due)); setNotice('Payment recorded.')
    } catch (err) { setError(errorText(err, 'Payment could not be recorded.')) }
  }

  const showReceipt = async () => {
    setError('')
    try { setReceipt(await ordersApi.receipt(branchId, bill.id)) } catch (err) { setError(errorText(err, 'Could not load the receipt.')) }
  }

  const requestRefund = async () => {
    setError(''); setNotice('')
    try {
      await ordersApi.requestRefund(branchId, refund.paymentId, Number(refund.amount), refund.reason.trim())
      setRefund({ paymentId: '', amount: '', reason: '' })
      setNotice('Refund request sent to a manager for approval.')
      setReceipt(await ordersApi.receipt(branchId, bill.id))
    } catch (err) { setError(errorText(err, 'The refund could not be requested.')) }
  }

  const openBills = bills.filter((b) => b.status !== 'PAID').length

  return (
    <Shell eyebrow="Cashier" title="Cashier dashboard">
      <Message text={branchError || error} />
      <Message text={notice} tone="ok" />
      <Kpis items={[
        ['Waiting for a bill', served.length],
        ['Open bills', openBills],
        ['Paid bills (shown)', bills.filter((b) => b.status === 'PAID').length],
        ['Current bill due', bill ? `₹${money(bill.due)}` : '—'],
      ]} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Served, waiting for a bill">
          {served.map((o) => (
            <div key={o.id} className={`${card} flex items-center justify-between`}>
              <span>{shortId(o.id)} · ₹{money(o.total)}</span>
              {hasPermission('billing.generate') ? <button className={ghost} onClick={() => createBill(o.id)}>Create bill</button> : null}
            </div>
          ))}
          {served.length === 0 ? <Empty>Nothing waiting for payment.</Empty> : null}

          <div className="flex flex-wrap gap-2 pt-2">
            {['', 'OPEN', 'PAID'].map((f) => (
              <button key={f || 'all'} className={filter === f ? button : ghost} onClick={() => setFilter(f)}>{f || 'All bills'}</button>
            ))}
          </div>
          {bills.map((b) => (
            <div key={b.id} className={`${card} flex items-center justify-between gap-3`}>
              <span>{shortId(b.order_id)} · ₹{money(b.total)} · paid ₹{money(b.paid)} · <span className={b.status === 'PAID' ? 'text-green-300' : 'text-[#D4A63A]'}>{b.status}</span></span>
              <button className={ghost} onClick={() => openBill(b.id)}>Open</button>
            </div>
          ))}
          {bills.length === 0 ? <Empty>No bills for this filter.</Empty> : null}
        </Section>

        <Section title="Bill">
          {!bill ? <Empty>Choose a served order or an existing bill.</Empty> : (
            <div className={`${card} space-y-3`}>
              <p>Total ₹{money(bill.total)} · Paid ₹{money(bill.paid)} · <span className="text-[#D4A63A]">Due ₹{money(bill.due)}</span></p>
              <p className="text-sm text-neutral-400">Status: {bill.status}</p>
              {bill.status !== 'PAID' && hasPermission('payments.collect') ? (
                <>
                  <div className="flex gap-2">
                    {['CASH', 'CARD', 'UPI'].map((m) => <button key={m} className={method === m ? button : ghost} onClick={() => setMethod(m)}>{m}</button>)}
                  </div>
                  <input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Amount" />
                  <button className={button} onClick={pay}>Record {method} payment</button>
                </>
              ) : null}
              <button className={ghost} onClick={showReceipt}>View receipt</button>

              {receipt ? (
                <div className="space-y-2 rounded-lg bg-[#080808] p-3 text-sm">
                  <p className="font-bold">Receipt</p>
                  <p>Subtotal ₹{money(receipt.subtotal)} · Tax ₹{money(receipt.taxTotal)} · Total ₹{money(receipt.total)}</p>
                  {receipt.payments.map((p) => <p key={p.id}>{p.method}: ₹{money(p.amount)}</p>)}
                  {receipt.refunds.map((r) => <p key={r.id} className="text-neutral-400">Refund ₹{money(r.amount)} ({r.reason}) · {r.status}</p>)}
                  {hasPermission('payments.refund') && receipt.payments.length > 0 ? (
                    <div className="space-y-2 border-t border-white/10 pt-3">
                      <p className="font-bold">Request a refund</p>
                      <select className={field} value={refund.paymentId} onChange={(e) => setRefund({ ...refund, paymentId: e.target.value })}>
                        <option value="">Choose a payment</option>
                        {receipt.payments.map((p) => <option key={p.id} value={p.id}>{p.method} ₹{money(p.amount)}</option>)}
                      </select>
                      <input className={field} placeholder="Amount" inputMode="decimal" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value.replace(/[^\d.]/g, '') })} />
                      <input className={field} placeholder="Reason" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} />
                      <button className={button} disabled={!refund.paymentId || !refund.amount || !refund.reason.trim()} onClick={requestRefund}>Send refund request</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </Section>
      </div>
    </Shell>
  )
}
