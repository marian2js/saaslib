import { useEffect, useState } from 'react'
import { BaseLoggedInUser, BaseUser } from '../types/user.types'
import { useApiCallback, useFetch } from './fetch.hooks'

export function useLoggedInUser<T extends BaseLoggedInUser = BaseLoggedInUser>() {
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

export function useGetMe<T extends BaseUser = BaseUser>() {
  return useFetch<{ user: T }>('/users/me', { credentials: 'include' })
}

export function useDeleteAvatar() {
  const { callback, success, loading, error } = useApiCallback<{ ok: true }>()

  const deleteAvatar = async () => {
    const res = await callback('/users/me/avatar', { method: 'DELETE', enableExperimentalWorkletSupport: true })
    if (res?.ok) {
      success()
    }
  }

  return { deleteAvatar, success, loading, error }
}
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData) as BaseLoggedInUser
        delete user.avatar
        localStorage.setItem('user', JSON.stringify(user))
      }
    }
  }

  return { deleteAvatar, success, loading, error }
}
