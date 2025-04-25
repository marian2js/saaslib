'use client'

import { useEffect, useState } from 'react'
import { BaseLoggedInUser, BaseUser } from '../types/user.types'
import { useSignOut } from './auth.hooks'
import { FetchHookOptions, useApiCallback, useApiFetch } from './fetch.hooks'

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

export function useGetMe<T extends BaseUser = BaseUser>(options?: FetchHookOptions<{ user: T }>) {
  const { signOut } = useSignOut()
  const { user: localUser, loading: localLoading } = useLoggedInUser()
  const shouldFetch = !localLoading && !!localUser

  const result = useApiFetch<{ user: T }>('/users/me', {
    skip: !shouldFetch,
    skipDefault: null,
    credentials: 'include',
    ...options,
  })

  useEffect(() => {
    if (result.error && result.error.statusCode >= 400 && result.error.statusCode < 500) {
      signOut()
    }
  }, [result.error, signOut])

  return result
}

export function useDeleteAvatar() {
  const { callback, success, loading, error } = useApiCallback<{ ok: true }>()

  const deleteAvatar = async () => {
    const res = await callback('/users/me/avatar', { method: 'DELETE' })
    if (res?.ok) {
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

export function usePatchMe<T extends BaseUser = BaseUser>() {
  const { callback, success, loading, error } = useApiCallback<{ user: T }>()

  const patchMe = async (data: Partial<T>) => {
    const res = await callback('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (res?.user) {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData) as BaseLoggedInUser
        localStorage.setItem('user', JSON.stringify({ ...user, ...res.user }))
      }
    }
  }

  return { patchMe, success, loading, error }
}
