import { useState, useEffect, useCallback } from 'react'
import { getErrorMessage } from '../api/errors'

/**
 * Generic hook for async service calls.
 * Keeps loading/error/retry logic out of page components.
 */
export function useAsyncData(fetcher, deps = []) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load data. Please try again.'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, retry: load }
}
