import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { api, ApiError } from '../api/client'
import { feedbackApi } from '../api/staff'

// Customers share a review. It is stored and shown on the site only after the restaurant approves it.
// No reviews are displayed here until they are approved, so nothing on this page is invented content.
const CATEGORIES = ['Food Quality', 'Service', 'Ambience', 'Value']

const initialForm = { name: '', category: CATEGORIES[0], comment: '' }

export default function Reviews() {
  const [form, setForm] = useState(initialForm)
  const [rating, setRating] = useState(5)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState([])

  useEffect(() => {
    // Only approved reviews are shown here.
    feedbackApi.publishedReviews().then(setPublished).catch(() => setPublished([]))
  }, [])

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post('/api/v1/reviews', {
        name: form.name.trim(),
        rating,
        category: form.category,
        comment: form.comment.trim(),
      })
      setForm(initialForm)
      setRating(5)
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your review could not be sent. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-white outline-none focus:border-[#D4A63A]'

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-16 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">Your feedback</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">Share your <span className="text-[#D4A63A]">experience</span></h1>

        {sent ? (
          <p role="status" className="mt-8 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
            Thank you! Your review has been sent and will appear once the restaurant approves it.
          </p>
        ) : null}
        {error ? <p role="alert" className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p> : null}

        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-[#D4A63A]/20 bg-[#111010] p-6">
          <label className="block text-sm text-neutral-300">Your name
            <input required name="name" maxLength={120} value={form.name} onChange={change} className={`${field} mt-2`} />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm text-neutral-300">Rating</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  onClick={() => setRating(n)} className="p-1">
                  <Star size={26} className={n <= rating ? 'fill-[#D4A63A] text-[#D4A63A]' : 'text-neutral-600'} />
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm text-neutral-300">Category
            <select name="category" value={form.category} onChange={change} className={`${field} mt-2`}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm text-neutral-300">Your review
            <textarea required name="comment" rows={4} maxLength={1000} value={form.comment} onChange={change} className={`${field} mt-2`} />
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#D4A63A] px-5 py-4 font-bold text-black hover:bg-[#E8BD57] disabled:opacity-50">
            {busy ? 'Sending…' : 'Send review'}
          </button>
        </form>

        <section className="mt-12 space-y-4">
          <h2 className="font-serif text-2xl font-bold">What our guests say</h2>
          {published.length === 0 ? <p className="text-neutral-400">Reviews appear here once approved.</p> : null}
          {published.map((r) => (
            <article key={r.id} className="rounded-xl border border-[#D4A63A]/20 bg-[#111010] p-4">
              <p className="font-bold">{r.name} · {r.rating}★ · {r.category}</p>
              <p className="mt-1 text-sm text-neutral-300">{r.comment}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
