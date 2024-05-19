export type JwtPayload = {
  id: string
  email: string
  iat: number
  exp: number
}

export type UserSSOProfile = {
  id: string
  email: string
  emailVerified: boolean
  displayName?: string
  firstName?: string
  lastName?: string
  picture?: string
  provider: string
  accessToken: string
}
