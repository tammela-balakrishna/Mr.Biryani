
import { useState } from 'react'
import {
  Star,
  Quote,
  MessageSquare,
  Send,
  UserRound,
  ThumbsUp,
  Utensils,
} from 'lucide-react'

const initialReviews = [
  {
    id: 1,
    name: 'Rahul K.',
    date: 'Customer review',
    rating: 5,
    category: 'Food Quality',
    comment:
      'The biryani was full of flavour. The rice was aromatic and the spices were perfectly balanced.',
    initials: 'RK',
  },
  {
    id: 2,
    name: 'Priya S.',
    date: 'Customer review',
    rating: 5,
    category: 'Taste',
    comment:
      'Loved the authentic Andhra-style flavours. The food was delicious and satisfying.',
    initials: 'PS',
  },
  {
    id: 3,
    name: 'Arjun M.',
    date: 'Customer review',
    rating: 4,
    category: 'Portion',
    comment:
      'Good biryani with generous portions. A nice option when craving spicy food.',
    initials: 'AM',
  },
]

const categories = [
  'All',
  'Food Quality',
  'Taste',
  'Portion',
  'Service',
]

function Stars({ rating, size = 17 }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? '#FFC107' : 'transparent'}
          className={
            star <= rating
              ? 'text-[#FFC107]'
              : 'text-neutral-600'
          }
        />
      ))}
    </div>
  )
}

function Reviews() {
  const [reviews, setReviews] = useState(initialReviews)
  const [activeCategory, setActiveCategory] = useState('All')
  const [rating, setRating] = useState(5)
  const [form, setForm] = useState({
    name: '',
    category: 'Food Quality',
    comment: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const filteredReviews =
    activeCategory === 'All'
      ? reviews
      : reviews.filter(
          (review) => review.category === activeCategory,
        )

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        ).toFixed(1)
      : '0.0'

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    })
    setSubmitted(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const newReview = {
      id: Date.now(),
      name: form.name.trim(),
      date: 'Just now',
      rating,
      category: form.category,
      comment: form.comment.trim(),
      initials: form.name
        .trim()
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    }

    setReviews((previous) => [newReview, ...previous])
    setActiveCategory('All')
    setForm({
      name: '',
      category: 'Food Quality',
      comment: '',
    })
    setRating(5)
    setSubmitted(true)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0705] text-white">

      {/* HERO */}
      <section className="relative isolate overflow-hidden border-b border-[#FFC107]/20">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=85')",
          }}
        />

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-[#190a05]/90 to-black/75" />

        <div className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 md:py-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#FFC107]/30 bg-[#FFC107]/10 px-4 py-2 text-xs font-bold uppercase tracking-[3px] text-[#FFC107]">
            <MessageSquare size={15} />
            Customer Experiences
          </div>

          <h1 className="text-4xl font-black sm:text-5xl md:text-6xl">
            What People
            <span className="block text-[#FFC107]">
              Say About Us
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-neutral-300 sm:text-base">
            Every plate tells a story. Discover customer feedback
            and share your experience with Mr. BIRIYANI.
          </p>

          <a
            href="#customer-reviews"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#FFC107] px-7 py-3.5 font-bold text-black transition hover:-translate-y-1 hover:bg-yellow-300"
          >
            Explore Reviews
            <Star size={18} fill="currentColor" />
          </a>
        </div>
      </section>

      {/* RATING OVERVIEW */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-3">

          <div className="rounded-2xl border border-[#FFC107]/20 bg-[#17100c] p-7 text-center">
            <Star
              size={28}
              fill="#FFC107"
              className="mx-auto text-[#FFC107]"
            />
            <p className="mt-3 text-4xl font-extrabold text-[#FFC107]">
              {averageRating}
            </p>
            <div className="mt-3 flex justify-center">
              <Stars rating={Math.round(Number(averageRating))} />
            </div>
            <p className="mt-3 text-sm text-neutral-400">
              Average rating of displayed reviews
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#17100c] p-7 text-center">
            <MessageSquare
              size={28}
              className="mx-auto text-[#FFC107]"
            />
            <p className="mt-3 text-4xl font-extrabold text-white">
              {reviews.length}
            </p>
            <p className="mt-3 text-sm text-neutral-400">
              Reviews displayed
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#17100c] p-7 text-center">
            <Utensils
              size={28}
              className="mx-auto text-[#FFC107]"
            />
            <p className="mt-3 text-2xl font-extrabold text-white">
              Andhra
            </p>
            <p className="mt-3 text-sm text-neutral-400">
              House of Authentic Flavours
            </p>
          </div>

        </div>
      </section>

      {/* CUSTOMER REVIEWS */}
      <section
        id="customer-reviews"
        className="mx-auto max-w-7xl px-5 pb-16 sm:px-8"
      >
        <div className="mb-9 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[4px] text-[#FFC107]">
            Real Experiences Matter
          </p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Customer <span className="text-[#FFC107]">Reviews</span>
          </h2>
          <p className="mt-4 text-sm text-neutral-400">
            Explore feedback about food, taste and dining experiences.
          </p>
        </div>

        {/* FILTERS */}
        <div className="mb-9 flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                activeCategory === category
                  ? 'border-[#FFC107] bg-[#FFC107] text-black'
                  : 'border-white/15 bg-white/5 text-neutral-300 hover:border-[#FFC107] hover:text-[#FFC107]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* REVIEW CARDS */}
        {filteredReviews.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map((review) => (
              <article
                key={review.id}
                className="group relative rounded-2xl border border-white/10 bg-[#17100c] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#FFC107]/50 hover:shadow-xl hover:shadow-black/30"
              >
                <Quote
                  size={35}
                  className="absolute right-6 top-6 text-[#FFC107]/20"
                />

                <Stars rating={review.rating} />

                <span className="mt-5 inline-block rounded-full border border-[#FFC107]/20 bg-[#FFC107]/10 px-3 py-1 text-xs font-semibold text-[#FFC107]">
                  {review.category}
                </span>

                <p className="mt-5 min-h-[100px] text-sm leading-7 text-neutral-300">
                  "{review.comment}"
                </p>

                <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#FFC107]/30 bg-[#FFC107]/10 font-bold text-[#FFC107]">
                    {review.initials}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {review.name}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      {review.date}
                    </p>
                  </div>

                  <ThumbsUp
                    size={17}
                    className="ml-auto text-[#FFC107]/60"
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#17100c] py-16 text-center">
            <MessageSquare
              size={38}
              className="mx-auto text-[#FFC107]/50"
            />
            <p className="mt-4 font-semibold">
              No reviews in this category yet.
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Be the first to share your experience.
            </p>
          </div>
        )}
      </section>

      {/* WRITE A REVIEW */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="grid gap-10 overflow-hidden rounded-2xl border border-[#FFC107]/20 bg-gradient-to-br from-[#201108] to-[#100a07] p-6 sm:p-10 lg:grid-cols-2 lg:p-12">

          <div className="flex flex-col justify-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFC107]/10">
              <MessageSquare
                size={27}
                className="text-[#FFC107]"
              />
            </div>

            <p className="text-xs font-bold uppercase tracking-[3px] text-[#FFC107]">
              Your Opinion Matters
            </p>

            <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
              Share Your
              <span className="block text-[#FFC107]">
                Experience With Us
              </span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-neutral-400">
              Tried our biryani? Tell us what you loved and help
              other food lovers discover their next favourite meal.
            </p>

            <div className="mt-8 flex items-center gap-3 text-sm text-neutral-300">
              <Star
                size={19}
                fill="#FFC107"
                className="text-[#FFC107]"
              />
              Your feedback helps us improve.
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-white/10 bg-black/30 p-5 sm:p-7"
          >
            <h3 className="mb-6 text-xl font-bold">
              Write a Review
            </h3>

            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Your Name
            </label>

            <div className="mb-5 flex items-center rounded-lg border border-white/15 bg-[#0d0a08] px-4 focus-within:border-[#FFC107]">
              <UserRound size={18} className="text-[#FFC107]" />
              <input
                required
                name="name"
                value={form.name}
                onChange={handleChange}
                maxLength={50}
                placeholder="Enter your name"
                className="w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600"
              />
            </div>

            <label className="mb-3 block text-sm font-medium text-neutral-300">
              Your Rating
            </label>

            <div className="mb-6 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} stars`}
                  className="transition hover:scale-110"
                >
                  <Star
                    size={30}
                    fill={star <= rating ? '#FFC107' : 'transparent'}
                    className={
                      star <= rating
                        ? 'text-[#FFC107]'
                        : 'text-neutral-600'
                    }
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-[#FFC107]">
                {rating}/5
              </span>
            </div>

            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Review Category
            </label>

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="mb-5 w-full rounded-lg border border-white/15 bg-[#0d0a08] px-4 py-3.5 text-sm text-white outline-none focus:border-[#FFC107]"
            >
              {categories
                .filter((category) => category !== 'All')
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>

            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Your Experience
            </label>

            <textarea
              required
              name="comment"
              value={form.comment}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              placeholder="Tell us about your experience..."
              className="mb-5 w-full resize-none rounded-lg border border-white/15 bg-[#0d0a08] px-4 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-[#FFC107]"
            />

            {submitted && (
              <div className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                Thank you! Your review has been added to this page.
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#FFC107] px-6 py-4 font-extrabold text-black transition hover:-translate-y-1 hover:bg-yellow-300"
            >
              Submit Review
              <Send size={18} />
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-neutral-500">
              Demo only: reviews are stored in page state and are not
              permanently saved or verified.
            </p>
          </form>
        </div>
      </section>

    </main>
  )
}

export default Reviews
