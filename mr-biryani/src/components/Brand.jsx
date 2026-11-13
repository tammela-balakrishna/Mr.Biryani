import { Link } from 'react-router-dom'
import { LogoBadge, BrandLogo } from './Logo'

/* Save as src/components/Brand.jsx
   Clickable logo for the Navbar and Footer using the pure SVG points.
*/

function Brand({
  to = '/',
  onClick,
  compact = false,
  showText = true,
  tone = 'dark',
  className = '',
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label="Mr.Biriyani home"
      className={`group inline-flex min-w-0 items-center transition-transform duration-300 hover:scale-[1.03] ${className}`}
    >
      {showText ? (
        <BrandLogo
          tone={tone}
          className={`w-auto transition-all duration-300 ${
            compact ? 'h-11 sm:h-12' : 'h-14 sm:h-16'
          }`}
        />
      ) : (
        <LogoBadge
          detail="simple"
          className={`transition-all duration-300 group-hover:rotate-6 ${
            compact ? 'h-11 w-12 sm:h-12 sm:w-12' : 'h-14 w-14 sm:h-16 sm:w-16'
          }`}
        />
      )}
    </Link>
  )
}

export default Brand