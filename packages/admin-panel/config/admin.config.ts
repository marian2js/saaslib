export type CollectionField = {
  key: string
  label: string
}

export type CollectionConfig = {
  key: string
  label: string
  description?: string
  fields: CollectionField[]
  createTemplate?: Record<string, unknown>
}

export type SubscriptionPrice = {
  id: string
  label: string
  description?: string
}

export type SubscriptionCatalog = {
  type: string
  label: string
  prices: SubscriptionPrice[]
}

export const adminConfig: {
  collections: CollectionConfig[]
  subscriptions: SubscriptionCatalog[]
} = {
  collections: [],
  subscriptions: [],
}
