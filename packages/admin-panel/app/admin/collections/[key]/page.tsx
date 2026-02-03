'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  useApiFetch,
  useCreateOwneableItem,
  useDeleteOwnableItem,
  useUpdateOwnableItem,
} from '@saaslib/nextjs'
import { useAdminConfig } from '../../../../lib/use-admin-config'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Textarea } from '../../../../components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'

function getNestedValue(obj: any, key: string) {
  return key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj)
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function CollectionDetailPage() {
  const params = useParams()
  const collectionKey = typeof params?.key === 'string' ? params.key : Array.isArray(params?.key) ? params.key[0] : ''
  const { runtime, config } = useAdminConfig()

  const collection = useMemo(() => {
    const runtimeCollection = runtime?.collections?.find((item) => item.key === collectionKey)
    const configCollection = config.collections.find((item) => item.key === collectionKey)
    return { ...runtimeCollection, ...configCollection }
  }, [runtime, config, collectionKey])

  const [view, setView] = useState<'mine' | 'others'>('others')
  const endpoint = view === 'others' ? `/${collectionKey}?admin=true` : `/${collectionKey}`

  const { data, loading, error, refetch } = useApiFetch<{ items: any[] }>(endpoint, {
    skip: !collectionKey,
    skipDefault: { items: [] },
  })
  const { createItem, loading: creating } = useCreateOwneableItem<any, any>(collectionKey)
  const { updateItem, loading: updating } = useUpdateOwnableItem<any>(collectionKey)
  const { deleteItem, loading: deleting } = useDeleteOwnableItem(collectionKey)

  const [selected, setSelected] = useState<any | null>(null)
  const [createJson, setCreateJson] = useState('{}')
  const [updateJson, setUpdateJson] = useState('')

  const items = data?.items ?? []

  useEffect(() => {
    setCreateJson(JSON.stringify(collection?.createTemplate ?? {}, null, 2))
  }, [collection?.createTemplate, collectionKey])

  const columns = useMemo(() => {
    if (collection?.fields?.length) return collection.fields
    const sample = items[0]
    if (!sample) {
      return [{ key: 'id', label: 'ID' }]
    }
    const preferred = ['id', '_id', 'name', 'title', 'owner', 'status', 'email', 'createdAt', 'updatedAt']
    const keys: string[] = []
    for (const key of preferred) {
      if (key in sample && !keys.includes(key)) keys.push(key)
    }
    for (const key of Object.keys(sample)) {
      if (keys.includes(key)) continue
      if (key.startsWith('_')) continue
      if (key.toLowerCase().includes('password')) continue
      keys.push(key)
    }
    return keys.slice(0, 6).map((key) => ({ key, label: humanizeKey(key) }))
  }, [collection, items])

  const handleCreate = async () => {
    try {
      const payload = JSON.parse(createJson)
      await createItem(payload)
      refetch()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const handleUpdate = async () => {
    if (!selected) return
    try {
      const payload = JSON.parse(updateJson)
      const targetId = selected.id ?? selected._id
      if (!targetId) {
        throw new Error('Missing item id')
      }
      await updateItem(targetId, payload)
      refetch()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item? This cannot be undone.')) return
    await deleteItem(id)
    refetch()
  }

  if (!collectionKey) {
    return (
      <div className="rounded-xl border border-border bg-muted/60 px-4 py-3">
        Collection key missing.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="section-title">{collection?.label ?? collectionKey}</h1>
        <p className="section-subtitle">View and manage owneable items from the API.</p>
      </div>

      {!collection?.key && (
        <div className="rounded-xl border border-border bg-muted/60 px-4 py-3">
          This collection was not found in the backend configuration.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={view === 'mine' ? 'default' : 'outline'} onClick={() => setView('mine')}>
          Mine
        </Button>
        <Button variant={view === 'others' ? 'default' : 'outline'} onClick={() => setView('others')}>
          Others (admin)
        </Button>
        <Badge variant="neutral">Items: {items.length}</Badge>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={columns.length + 1}>Loading items…</TableCell>
            </TableRow>
          )}
          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1}>No items found.</TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <TableRow key={item.id ?? item._id}>
              {columns.map((column) => (
                <TableCell key={column.key}>{String(getNestedValue(item, column.key) ?? '—')}</TableCell>
              ))}
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelected(item)
                      setUpdateJson(JSON.stringify(item, null, 2))
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id ?? item._id)}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create new</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea rows={6} value={createJson} onChange={(event) => setCreateJson(event.target.value)} />
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create item'}
          </Button>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Update payloads are only allowed for items you own.
            </p>
            <Textarea rows={8} value={updateJson} onChange={(event) => setUpdateJson(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleUpdate} disabled={updating || view !== 'mine'}>
                {view !== 'mine' ? 'Switch to Mine view' : updating ? 'Updating…' : 'Update item'}
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Clear selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
