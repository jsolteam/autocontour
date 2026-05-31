import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(url: string, defaultValue: T | null = null): UseApiResult<T> {
  const [data, setData] = useState<T | null>(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(url)
      setData(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
