import jwt from 'jsonwebtoken'

/**
 * Checks if a JWT token is expired.
 * @param token The JWT token to check.
 * @returns true if the token is expired, false otherwise.
 */
export function isAccessTokenExpired(token: string): boolean {
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

export function getUserIdFromToken(token: string): string {
  const decoded = jwt.decode(token)
  return typeof decoded === 'object' && decoded?.id
}
