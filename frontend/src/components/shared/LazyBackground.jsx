import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

/**
 * Lazy background image — only fetches the asset when near the viewport.
 * Pass a dynamic import loader so Vite keeps the file out of the critical bundle:
 *   loader={() => import('../assets/backgrounds/foo.jpg')}
 */
export function LazyBackground({
  loader,
  className,
  imageClassName,
  overlayClassName,
  contentClassName,
  children,
  rootMargin = '200px',
  alt = '',
}) {
  const ref = useRef(null)
  const [src, setSrc] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof loader !== 'function') return undefined

    let cancelled = false
    let observer

    const load = async () => {
      try {
        const mod = await loader()
        if (cancelled) return
        setSrc(typeof mod === 'string' ? mod : mod.default || mod)
      } catch {
        /* keep gradient fallback */
      }
    }

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return
          observer?.disconnect()
          load()
        },
        { rootMargin, threshold: 0.01 }
      )
      observer.observe(node)
    } else {
      const t = window.setTimeout(load, 1)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }

    return () => {
      cancelled = true
      observer?.disconnect()
    }
  }, [loader, rootMargin])

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      {src && (
        <img
          src={src}
          alt={alt}
          decoding="async"
          fetchPriority="low"
          onLoad={() => setReady(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-ek',
            ready ? 'opacity-100' : 'opacity-0',
            imageClassName
          )}
        />
      )}
      {overlayClassName && (
        <div className={cn('absolute inset-0 pointer-events-none', overlayClassName)} aria-hidden />
      )}
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
    </div>
  )
}
