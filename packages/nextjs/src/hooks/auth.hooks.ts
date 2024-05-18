import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { verifyOAuthCode } from '../services'

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
