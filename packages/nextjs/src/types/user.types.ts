export type BaseLoggedInUser = {
  id: string
  name?: string
  avatar?: string
}

export type UserSubscription = {
  product: string
  periodEnd: string
  nextProduct?: string
  cancelled?: boolean
}

export type BaseUser = {
  id: string
  email: string
  name?: string
  avatar?: string
  subscriptions?: Record<string, UserSubscription>
}
