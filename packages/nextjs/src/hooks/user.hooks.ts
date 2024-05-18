import { useEffect, useState } from 'react'
import { LoggedInUser } from '../types/user.types'
import { useFetch } from './fetch.hooks'

export function useLoggedInUser<T extends LoggedInUser = LoggedInUser>() {
  const [user, setUser] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser) as T)
    }
    setLoading(false)
  }, [])

  return { user, loading }
}

export function useGetMe<T extends { id: string; email: string } = { id: string; email: string }>() {
  return useFetch<{ user: T }>('/users/me', { credentials: 'include' })
}
