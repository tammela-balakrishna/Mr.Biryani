import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    if (pathname === '/menu') {
      const el = document.getElementById('menu')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    if (pathname === '/about') {
      const el = document.getElementById('about')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    })
  }, [pathname, hash])

  return null
}

export default ScrollToTop
