import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { signOutServer, verifyEmail, verifyOAuthCode } from '../services'

export function useOAuthRedirect(code: string | undefined, redirectTo: string = '/') {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      if (!code) {
        router.push('/')
        return
      }
      const user = await verifyOAuthCode(code)
      localStorage.setItem('user', JSON.stringify(user))
      router.push(redirectTo)
    }
    run()
  }, [code])
}

export function useVerifyEmail(userId: string, code: string | undefined, redirectTo: string = '/') {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      if (!code) {
        router.push('/')
        return
      }
      await verifyEmail(userId, code)
      router.push(redirectTo)
    }
    run()
  }, [code])
}

export function useSignOut(redirectTo = '/') {
  const [loading, setLoading] = useState(false)

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await signOutServer()
    } finally {
      localStorage.removeItem('user')
      window.location.href = redirectTo
    }
  }, [redirectTo])

  return { signOut, loading }
}
