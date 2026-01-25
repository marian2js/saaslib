'use server'

import { cookies } from 'next/headers'
import { BaseLoggedInUser } from '../types'
import { fetchApi, fetchWithAuth } from '../utils'
import { getCookieDomain } from '../utils/cookie.utils'
import { isAccessTokenExpired } from '../utils/auth.utils'

export async function isLoggedIn(): Promise<boolean> {
  const tokenCookie = (await cookies()).get('jwt')
  if (!tokenCookie) {
    return false
  }
  const token = JSON.parse(tokenCookie.value).accessToken
  return !isAccessTokenExpired(token)
}

export async function passwordSignUp(email: string, password: string) {
  const res = await fetchApi<{ user: any; token: { accessToken: string; refreshToken: string } }>('/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.user || !res.token) {
    throw new Error((res as any).message ?? 'Invalid response')
  }
  await setAuthCookie(res.token)
  return res.user
}

export async function passwordSignIn(email: string, password: string, rememberMe: boolean = true) {
  const res = await fetchApi<{ user: BaseLoggedInUser; token: { accessToken: string; refreshToken: string } }>(
    '/auth/signin',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
  )
  if (!res.user || !res.token) {
    throw new Error('Invalid response')
  }
  await setAuthCookie(res.token, rememberMe)
  return res.user
}

export async function verifyOAuthCode(code: string) {
  const res = await fetchApi<{ user: BaseLoggedInUser; token: { accessToken: string; refreshToken: string } }>(
    '/auth/verify-oauth',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    },
  )
  if (!res.user || !res.token) {
    throw new Error('Invalid response')
  }
  await setAuthCookie(res.token)
  return res.user
}

export async function verifyEmail(userId: string, code: string) {
  await fetchApi<{ ok: boolean }>('/auth/verify-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, code }),
  })
}

export async function signOutServer() {
  await fetchWithAuth('/auth/signout', {
    method: 'POST',
  })
  await removeAuthCookie()
}

export async function removeAuthCookie() {
  const cookieData = await cookies()
  const domain = getCookieDomain()
  cookieData.set('jwt', '', {
    httpOnly: true,
    path: '/',
    ...(domain ? { domain } : {}),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  })
}

export async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  const res = await fetchApi<{ accessToken?: string }>('/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, refreshToken }),
  })
  return res?.accessToken ?? null
}

export async function setAuthCookie(token: { accessToken: string; refreshToken: string }, rememberMe: boolean = true) {
  const cookieData = await cookies()
  const domain = getCookieDomain()
  cookieData.set('jwt', JSON.stringify(token), {
    httpOnly: true,
    path: '/',
    ...(domain ? { domain } : {}),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? 60 * 60 * 24 * 365 : 60 * 60 * 24,
  })
}

export async function requestPasswordReset(email: string) {
  await fetchApi('/auth/request-password-reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(code: string, newPassword: string) {
  await fetchApi('/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, newPassword }),
  })
}

