import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import Button from './Button'
import { MotionStyles } from './Motion'

/* Save as src/components/PageHero.jsx
   Same props as before, plus: icon (a lucide icon component, optional).
   No Tailwind config needed: animations come from Motion.jsx. */

function PageHero({
  eyebrow = 'MR. BIRIYANI',
  title,
  highlight,
  subtitle,
  backgroundImage,
  breadcrumb = true,
  primaryButton,
  secondaryButton,
  compact = false,
  icon: Icon,
}) {
  return (
    <section
      className={`relative isolate flex items-center justify-center overflow-hidden bg-[#080808] px-5 text-center ${
        compact ? 'min-h-[280px] py-16' : 'min-h-[380px] py-24'
      }`}
    >
      <MotionStyles />

      {/* Background image with slow zoom */}
      {backgroundImage && (
        <>
          <div
            className="kenburns absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${backgroundImage}")` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 -z-10 bg-black/75" aria-hidden="true" />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080808] via-transparent to-[#5a1a1a]/40"
            aria-hidden="true"
          />
        </>
      )}

      {/* Floating colour glows */}
      <div
        className="floaty pointer-events-none absolute -right-16 top-0 -z-10 h-72 w-72 rounded-full bg-orange-500/20 blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="floaty pointer-events-none absolute -left-16 bottom-0 -z-10 h-64 w-64 rounded-full bg-fuchsia-600/20 blur-[100px]"
        style={{ animationDelay: '-3s' }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-4xl">
        <div
          className="rise-in mb-5 inline-flex items-center gap-2 rounded-full border border-[#D4A63A]/40 bg-[#080808]/90 px-4 py-2 backdrop-blur"
        >
          {Icon && <Icon size={15} className="text-orange-400" />}
          <span className="text-xs font-bold uppercase tracking-[4px] text-[#D4A63A] sm:text-sm">
            {eyebrow}
          </span>
        </div>

        <h1
          className="rise-in font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl"
          style={{ animationDelay: '.15s' }}
        >
          {title}{' '}
          {highlight && <span className="text-shimmer">{highlight}</span>}
        </h1>

        {subtitle && (
          <p
            className="rise-in mx-auto mt-6 max-w-2xl text-sm leading-8 text-neutral-200 sm:text-lg"
            style={{ animationDelay: '.3s' }}
          >
            {subtitle}
          </p>
        )}

        {(primaryButton || secondaryButton) && (
          <div
            className="rise-in mt-8 flex flex-wrap justify-center gap-4"
            style={{ animationDelay: '.45s' }}
          >
            {primaryButton && (
              <span className="pulse-ring inline-flex rounded-lg">
                <Button to={primaryButton.to} variant="gold">
                  {primaryButton.label}
                  <ArrowRight size={18} />
                </Button>
              </span>
            )}

            {secondaryButton && (
              <Button to={secondaryButton.to} variant="outline">
                {secondaryButton.label}
              </Button>
            )}
          </div>
        )}

        {breadcrumb && (
          <nav
            aria-label="Breadcrumb"
            className="rise-in mt-8 flex items-center justify-center gap-3 text-sm text-neutral-400"
            style={{ animationDelay: '.6s' }}
          >
            <Link to="/" className="transition hover:text-[#D4A63A]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-semibold text-[#D4A63A]">
              {highlight || title}
            </span>
          </nav>
        )}
      </div>

      {/* Gold-to-colour edge line */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-orange-500 via-[#D4A63A] to-fuchsia-500"
        aria-hidden="true"
      />
    </section>
  )
}

export default PageHero
