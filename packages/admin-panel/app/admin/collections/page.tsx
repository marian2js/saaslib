'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useAdminConfig } from '../../../lib/use-admin-config'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export default function CollectionsPage() {
  const { runtime, config } = useAdminConfig()
  const collections = useMemo(() => {
    const runtimeCollections = runtime?.collections ?? []
    if (runtimeCollections.length === 0) {
      return config.collections ?? []
    }
    const configMap = new Map(config.collections.map((item) => [item.key, item]))
    return runtimeCollections.map((item) => ({ ...item, ...configMap.get(item.key) }))
  }, [runtime, config])

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="section-title">Collections</h1>
        <p className="section-subtitle">Manage owneable data models configured in your Saaslib backend.</p>
      </div>

      {collections.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/60 px-4 py-3">
          No collections detected yet. Add an owneable controller to your backend to enable admin management.
        </div>
      ) : (
        <div className="card-grid">
          {collections.map((collection) => (
            <Card key={collection.key}>
              <CardHeader>
                <CardTitle className="text-lg">{collection.label ?? collection.key}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {collection.description ?? 'Manage records from this collection.'}
                </p>
                <Button asChild variant="outline">
                  <Link href={`/admin/collections/${collection.key}`}>Open collection</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
