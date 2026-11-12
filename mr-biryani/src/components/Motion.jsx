
import { useEffect, useRef, useState } from 'react'

/* Save as src/components/Motion.jsx */

/* Scroll reveal animation */
export function useReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (!('IntersectionObserver' in window)) {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, shown]
}

export function Reveal({
  children,
  delay = 0,
  className = '',
}) {
  const [ref, shown] = useReveal()

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`
        transition-all duration-700 ease-out
        ${shown
          ? 'translate-y-0 opacity-100'
          : 'translate-y-8 opacity-0'}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

/* Image with fallback support */
export function SafeImg({
  fallback,
  className = '',
  onError,
  ...props
}) {
  const [failed, setFailed] = useState(false)

  return (
    <img
      {...props}
      className={className}
      onError={(event) => {
        onError?.(event)

        if (fallback && !failed) {
          setFailed(true)
          event.currentTarget.src = fallback
        } else {
          event.currentTarget.style.visibility = 'hidden'
        }
      }}
    />
  )
}

/* Shared motion and decoration styles */
export function MotionStyles() {
  return (
    <style>{`
      /* ------------------------------
         IMAGE ANIMATIONS
      ------------------------------ */

      @keyframes kenburns {
        from { transform: scale(1); }
        to { transform: scale(1.10); }
      }

      @keyframes floaty {
        0%, 100% {
          transform: translate3d(0, 0, 0) rotate(0deg);
        }
        50% {
          transform: translate3d(0, -12px, 0) rotate(2deg);
        }
      }

      @keyframes floatLeft {
        0%, 100% {
          transform: translate3d(0, 0, 0);
          opacity: .12;
        }
        50% {
          transform: translate3d(10px, -14px, 0);
          opacity: .24;
        }
      }

      @keyframes floatRight {
        0%, 100% {
          transform: translate3d(0, 0, 0);
          opacity: .20;
        }
        50% {
          transform: translate3d(-10px, 12px, 0);
          opacity: .10;
        }
      }

      @keyframes imageReveal {
        from {
          opacity: 0;
          transform: scale(.94) translateY(18px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      /* ------------------------------
         GENERAL ANIMATIONS
      ------------------------------ */

      @keyframes shimmer {
        to { background-position: 200% center; }
      }

      @keyframes riseIn {
        from {
          opacity: 0;
          transform: translateY(24px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes popIn {
        from {
          opacity: 0;
          transform: scale(.94);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes pulseRing {
        0% {
          box-shadow: 0 0 0 0 rgba(212,166,58,.45);
        }
        100% {
          box-shadow: 0 0 0 18px rgba(212,166,58,0);
        }
      }

      @keyframes spinSlow {
        to { transform: rotate(360deg); }
      }

      @keyframes borderGlow {
        0%, 100% {
          opacity: .25;
        }
        50% {
          opacity: .75;
        }
      }

      @keyframes edgeLight {
        0% {
          transform: translateX(-120%);
        }
        100% {
          transform: translateX(120%);
        }
      }

      @keyframes softGlow {
        0%, 100% {
          opacity: .25;
          transform: scale(.95);
        }
        50% {
          opacity: .55;
          transform: scale(1.08);
        }
      }

      /* ------------------------------
         READY-TO-USE CLASSES
      ------------------------------ */

      .kenburns {
        animation: kenburns 14s ease-out forwards;
      }

      .floaty {
        animation: floaty 8s ease-in-out infinite;
      }

      .float-food-left {
        animation: floatLeft 11s ease-in-out infinite;
      }

      .float-food-right {
        animation: floatRight 13s ease-in-out infinite;
      }

      .image-reveal {
        animation: imageReveal .9s ease-out both;
      }

      .rise-in {
        opacity: 0;
        animation: riseIn .8s ease-out forwards;
      }

      .pop-in {
        animation: popIn .45s ease-out both;
      }

      .pulse-ring {
        animation: pulseRing 2.5s ease-out infinite;
      }

      .spin-slow {
        animation: spinSlow 35s linear infinite;
      }

      .text-shimmer {
        background: linear-gradient(
          90deg,
          #D4A63A,
          #ffe5a0,
          #c58a22,
          #D4A63A
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: shimmer 6s linear infinite;
      }

      /* ------------------------------
         PREMIUM IMAGE DESIGN
      ------------------------------ */

      .premium-image {
        position: relative;
        overflow: hidden;
        isolation: isolate;
        border: 1px solid rgba(212,166,58,.22);
        border-radius: 18px;
        background: #15110a;
        box-shadow:
          0 12px 35px rgba(0,0,0,.35),
          0 0 25px rgba(212,166,58,.06);
        transition:
          transform .6s ease,
          border-color .5s ease,
          box-shadow .5s ease;
      }

      .premium-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition:
          transform .8s cubic-bezier(.2,.7,.2,1),
          filter .6s ease;
      }

      .premium-image:hover {
        transform: translateY(-5px);
        border-color: rgba(212,166,58,.65);
        box-shadow:
          0 18px 45px rgba(0,0,0,.5),
          0 0 30px rgba(212,166,58,.13);
      }

      .premium-image:hover img {
        transform: scale(1.07);
      }

      .premium-image::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(
          180deg,
          transparent 45%,
          rgba(0,0,0,.42) 100%
        );
      }

      /* Animated gold edge */
      .gold-edge {
        position: relative;
        isolation: isolate;
      }

      .gold-edge::before {
        content: "";
        position: absolute;
        inset: 0;
        padding: 1px;
        border-radius: inherit;
        pointer-events: none;
        background: linear-gradient(
          135deg,
          rgba(212,166,58,.75),
          transparent 35%,
          transparent 65%,
          rgba(212,166,58,.35)
        );
        -webkit-mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: borderGlow 5s ease-in-out infinite;
      }

      /* Subtle moving light along a border */
      .border-light {
        position: relative;
        overflow: hidden;
      }

      .border-light::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 35%;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255,224,145,.9),
          transparent
        );
        animation: edgeLight 5s ease-in-out infinite;
        pointer-events: none;
      }

      /* ------------------------------
         MODERN CORNER DECORATIONS
      ------------------------------ */

      .corner-decoration {
        position: relative;
        isolation: isolate;
      }

      .corner-decoration::before,
      .corner-decoration::after {
        content: "";
        position: absolute;
        width: 28px;
        height: 28px;
        pointer-events: none;
        z-index: 2;
        transition: all .5s ease;
      }

      .corner-decoration::before {
        top: 10px;
        left: 10px;
        border-top: 1px solid rgba(212,166,58,.75);
        border-left: 1px solid rgba(212,166,58,.75);
      }

      .corner-decoration::after {
        right: 10px;
        bottom: 10px;
        border-right: 1px solid rgba(212,166,58,.75);
        border-bottom: 1px solid rgba(212,166,58,.75);
      }

      .corner-decoration:hover::before,
      .corner-decoration:hover::after {
        width: 42px;
        height: 42px;
      }

      /* Soft gold ambient glow */
      .gold-ambient {
        position: relative;
        isolation: isolate;
      }

      .gold-ambient::before {
        content: "";
        position: absolute;
        width: 180px;
        height: 180px;
        border-radius: 50%;
        background: rgba(212,166,58,.12);
        filter: blur(75px);
        pointer-events: none;
        z-index: -1;
        animation: softGlow 8s ease-in-out infinite;
      }

      /* Glass-style dark surface */
      .glass-dark {
        background: rgba(15,12,8,.72);
        border: 1px solid rgba(212,166,58,.15);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      /* Decorative background food images */
      .food-decoration {
        position: absolute;
        pointer-events: none;
        object-fit: cover;
        border-radius: 50%;
        filter: blur(1px) saturate(.8);
        mix-blend-mode: screen;
      }

      /* ------------------------------
         ACCESSIBILITY
      ------------------------------ */

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          scroll-behavior: auto !important;
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
        }

        .kenburns,
        .floaty,
        .float-food-left,
        .float-food-right,
        .rise-in,
        .pop-in,
        .pulse-ring,
        .spin-slow,
        .text-shimmer {
          animation: none !important;
          opacity: 1;
        }
      }
    `}</style>
  )
}
