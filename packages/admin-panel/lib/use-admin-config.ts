import { useEffect, useState } from 'react'
import { adminConfig, CollectionConfig, SubscriptionCatalog } from '../config/admin.config'

type RuntimeCollection = { key: string; label?: string }

type RuntimeConfig = {
  collections?: RuntimeCollection[]
  subscriptionTypes?: string[]
}

const STORAGE_KEY = 'saaslib-admin-config'

function readRuntimeConfig(): RuntimeConfig | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as RuntimeConfig
  } catch {
    return null
  }
}

export function useAdminConfig() {
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null)

  useEffect(() => {
    const load = () => setRuntime(readRuntimeConfig())
    load()
    const handler = () => load()
    window.addEventListener('storage', handler)
    window.addEventListener('saaslib-admin-config', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('saaslib-admin-config', handler)
    }
  }, [])

  return {
    runtime,
    config: adminConfig,
  }
}

export type AdminCollectionConfig = CollectionConfig
export type AdminSubscriptionCatalog = SubscriptionCatalog

