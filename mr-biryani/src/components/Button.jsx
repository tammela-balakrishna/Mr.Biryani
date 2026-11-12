import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

/* Save as src/components/Button.jsx
   Same props as before (to, variant, size, type, className, onClick, disabled)
   plus: href (external / tel: / mailto:), loading, fullWidth, shine. */

const variants = {
  primary:
    'bg-[#321010] text-white hover:bg-[#481515] hover:shadow-lg hover:shadow-[#321010]/40',

  secondary:
    'border border-[#D4A63A] bg-[#111010] text-[#D4A63A] hover:bg-[#D4A63A] hover:text-black hover:shadow-lg hover:shadow-[#D4A63A]/25',

  gold:
    'bg-gradient-to-r from-[#D4A63A] via-[#E8BD57] to-[#D4A63A] bg-[length:200%_auto] text-black hover:bg-right hover:shadow-lg hover:shadow-[#D4A63A]/30',

  spice:
    'bg-gradient-to-r from-orange-500 via-red-500 to-fuchsia-600 bg-[length:200%_auto] text-white hover:bg-right hover:shadow-lg hover:shadow-red-500/30',

  outline:
    'border border-white/30 bg-[#080808]/60 text-white backdrop-blur hover:border-[#D4A63A] hover:text-[#D4A63A]',

  ghost:
    'text-neutral-300 hover:bg-white/10 hover:text-[#D4A63A]',

  dark:
    'bg-[#181414] text-white hover:bg-[#321010] hover:text-[#D4A63A]',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

/* Variants where a light sweep looks good */
const shineVariants = ['gold', 'spice', 'primary', 'secondary']

function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  href,
  type = 'button',
  className = '',
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  shine = true,
  ...rest
}) {
  const inactive = disabled || loading

  const styles = [
    'group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden',
    'rounded-lg font-semibold',
    'transition-all duration-300 ease-out',
    'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]',
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4A63A]',
    inactive ? 'pointer-events-none opacity-60' : '',
    fullWidth ? 'w-full' : '',
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {shine && shineVariants.includes(variant) && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-full z-0 w-1/2 -skew-x-12 bg-white/30 transition-all duration-700 ease-out group-hover:left-[150%]"
        />
      )}

      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {loading && <Loader2 size={18} className="animate-spin" />}
        {children}
      </span>
    </>
  )

  /* A link that is disabled must not navigate */
  const blockIfInactive = (event) => {
    if (inactive) {
      event.preventDefault()
      return
    }
    if (onClick) onClick(event)
  }

  if (to) {
    return (
      <Link
        to={to}
        className={styles}
        onClick={blockIfInactive}
        aria-disabled={inactive || undefined}
        tabIndex={inactive ? -1 : undefined}
        {...rest}
      >
        {content}
      </Link>
    )
  }

  if (href) {
    const isWeb = /^https?:/i.test(href)
    return (
      <a
        href={href}
        className={styles}
        onClick={blockIfInactive}
        aria-disabled={inactive || undefined}
        tabIndex={inactive ? -1 : undefined}
        {...(isWeb ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={inactive}
      aria-busy={loading || undefined}
      className={styles}
      {...rest}
    >
      {content}
    </button>
  )
}

export default Button
