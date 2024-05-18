import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { refreshAccessToken } from '../services'
import { AuthToken } from '../types/auth.types'

export async function authRequiredMiddleware(req: NextRequest): Promise<{ redirectTo?: URL; token?: AuthToken }> {
  const tokenCookie = req.cookies.get('jwt')
  if (!tokenCookie) {
    return {
      redirectTo: new URL(`/signin?redirect=${encodeURIComponent(req.nextUrl.pathname)}`, req.url),
    }
  }
  const accessToken = JSON.parse(tokenCookie.value).accessToken
  if (isAccessTokenExpired(accessToken)) {
    const userId = getUserIdFromToken(accessToken)
    const refreshToken = JSON.parse(tokenCookie.value).refreshToken
    const newAccessToken = await refreshAccessToken(userId, refreshToken)
    if (!newAccessToken) {
      return {
        redirectTo: new URL(`/signin?redirect=${encodeURIComponent(req.nextUrl.pathname)}`, req.url),
      }
    }
    const response = NextResponse.next()
    response.cookies.set({
      name: 'jwt',
      value: JSON.stringify({ accessToken: newAccessToken, refreshToken }),
      httpOnly: true,
      path: '/',
      domain:
        process.env.NODE_ENV === 'production'
          ? '.' + process.env.NEXT_PUBLIC_API_ENDPOINT!.replace('https://', '')
          : 'localhost',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    return {
      token: { accessToken: newAccessToken, refreshToken },
    }
  }
  return {}
}

/**
 * Checks if a JWT token is expired.
 * @param token The JWT token to check.
 * @returns true if the token is expired, false otherwise.
 */
function isAccessTokenExpired(token: string): boolean {
  try {
    // Decode the token without verifying the signature
    const decoded = jwt.decode(token, { complete: true })

    // Check if the 'exp' field exists and if the token has expired
    const currentTime = Math.floor(Date.now() / 1000)
    if (typeof decoded?.payload === 'object' && decoded.payload.exp && currentTime > decoded.payload.exp) {
      return true
    }

    return false
  } catch (error) {
    return true
  }
}

function getUserIdFromToken(token: string): string {
  const decoded = jwt.decode(token)
  return typeof decoded === 'object' && decoded?.id
}
