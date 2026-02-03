'use client'

import { useEffect } from 'react'

type AdminConfig = {
  collections?: Array<{ key: string; label?: string }>
  subscriptions?: Array<{ type: string; products: Array<{ id: string; prices: string[] }> }>
  subscriptionTypes?: string[]
}

export default function ConfigHydrator({ config }: { config: AdminConfig }) {
  useEffect(() => {
    if (config) {
      localStorage.setItem('saaslib-admin-config', JSON.stringify(config))
      window.dispatchEvent(new Event('saaslib-admin-config'))
    }
  }, [config])

  return null
}
