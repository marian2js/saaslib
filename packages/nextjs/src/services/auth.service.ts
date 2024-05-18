'use server'

import { cookies } from 'next/headers'
import { LoggedInUser } from '../types'
import { fetchApi, fetchWithAuth } from '../utils'

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
  setAuthCookie(res.token)
  return res.user
}

export async function passwordSignIn(email: string, password: string, rememberMe: boolean = true) {
  const res = await fetchApi<{ user: LoggedInUser; token: { accessToken: string; refreshToken: string } }>(
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
  setAuthCookie(res.token, rememberMe)
  return res.user
}

export async function verifyOAuthCode(code: string) {
  const res = await fetchApi<{ user: LoggedInUser; token: { accessToken: string; refreshToken: string } }>(
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
  setAuthCookie(res.token)
  return res.user
}

export async function signOutServer() {
  await fetchWithAuth('/auth/signout', {
    method: 'POST',
  })
  cookies().set('jwt', '', {
    httpOnly: true,
    path: '/',
    domain:
      process.env.NODE_ENV === 'production'
        ? '.' + process.env.NEXT_PUBLIC_API_ENDPOINT!.replace('https://', '')
        : 'localhost',
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
  'use server'

  const domain =
    process.env.NODE_ENV === 'production'
      ? '.' + process.env.NEXT_PUBLIC_API_ENDPOINT!.replace('https://', '')
      : 'localhost'

  cookies().set('jwt', JSON.stringify(token), {
    httpOnly: true,
    path: '/',
    domain,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? 60 * 60 * 24 * 365 : 60 * 60 * 24,
  })
}
