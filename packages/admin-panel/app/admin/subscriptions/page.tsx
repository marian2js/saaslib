'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useApiFetch } from '@saaslib/nextjs'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'


type AdminUser = {
  id: string
  email: string
  name?: string
  subscriptions?: Record<string, { product: string; nextProduct?: string; cancelled?: boolean }>
}

type AdminUserListResponse = {
  items: AdminUser[]
  total: number
  page: number
  pages: number
  limit: number
}

export default function SubscriptionsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', '20')
    if (search) params.set('search', search)
    return params.toString()
  }, [page, search])

  const { data, loading, error } = useApiFetch<AdminUserListResponse>(`/admin/users/subscriptions?${query}`)

  const subscribedUsers = useMemo(() => {
    const items = data?.items ?? []
    return items.filter((user) => user.subscriptions && Object.keys(user.subscriptions).length > 0)
  }, [data])

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="section-title">Subscriptions</h1>
        <p className="section-subtitle">Find customers with active plans and manage upgrades.</p>
      </div>

      <div className="rounded-xl border border-border bg-card/70 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Email or name"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Plans</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={4}>Loading subscriptions…</TableCell>
            </TableRow>
          )}
          {!loading && subscribedUsers.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>No active subscriptions found.</TableCell>
            </TableRow>
          )}
          {subscribedUsers.map((user) => {
            const userId = (user as any).id ?? (user as any)._id ?? ''
            const planKeys = Object.keys(user.subscriptions ?? {})
            const isCancelled = planKeys.some((key) => user.subscriptions?.[key]?.cancelled)
            return (
              <TableRow key={userId || user.email}>
                <TableCell>
                  <div className="font-semibold">{user.name || user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell>{planKeys.join(', ')}</TableCell>
                <TableCell>
                  {isCancelled ? <Badge variant="warning">Cancel pending</Badge> : <Badge variant="success">Active</Badge>}
                </TableCell>
                <TableCell>
                  {userId ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/users/${userId}`}>Manage</Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Missing id</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {data?.page ?? page} of {data?.pages ?? 1} · {data?.total ?? 0} total
        </span>
        <Button
          variant="outline"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!!data && page >= data.pages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
