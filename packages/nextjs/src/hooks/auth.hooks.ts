'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useCallback, useEffect, useState } from 'react'
import {
  completePasswordResetFormAction,
  passwordSignInFormAction,
  passwordSignUpFormAction,
  resetPasswordFormAction,
} from '../form-actions'
import { signOutServer, verifyEmail, verifyOAuthCode } from '../services'
import { BaseLoggedInUser, FormState } from '../types'

export function useSignInActionState({
  redirectTo = '/',
  initialState,
}: { redirectTo?: string; initialState?: FormState<BaseLoggedInUser> } = {}) {
  const router = useRouter()
  const [state, signIn] = useActionState(
    passwordSignInFormAction,
    initialState ?? {
      success: false,
      error: null,
    },
  )

  useEffect(() => {
    if (state.success) {
      router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/')
    }
  }, [state.success])

  return [state, signIn] as const
}

export function useSignUpActionState({
  redirectTo = '/welcome',
  initialState,
}: { redirectTo?: string; initialState?: FormState } = {}) {
  const router = useRouter()
  const [state, signUp] = useActionState(passwordSignUpFormAction, initialState ?? { success: false, error: null })

  useEffect(() => {
    if (state.success) {
      router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/')
    }
  }, [state.success])

  return [state, signUp] as const
}

export function useResetPasswordActionState(initialState?: FormState) {
  return useActionState(resetPasswordFormAction, initialState ?? { success: false, error: null })
}

export function useCompletePasswordResetActionState(code: string, initialState?: FormState) {
  return useActionState(
    (prevState: FormState, formData: FormData) => completePasswordResetFormAction(prevState, formData, code),
    initialState ?? { success: false, error: null },
  )
}

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
