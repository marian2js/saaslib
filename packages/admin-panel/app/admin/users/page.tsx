'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useApiFetch } from '@saaslib/nextjs'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select } from '../../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'


type AdminUser = {
  id: string
  email: string
  name?: string
  role?: string
  blocked?: boolean
  subscriptions?: Record<string, { product: string; nextProduct?: string; cancelled?: boolean }>
}

type AdminUserListResponse = {
  items: AdminUser[]
  subscriptionTypes?: string[]
  total: number
  page: number
  pages: number
  limit: number
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [blocked, setBlocked] = useState('all')
  const [page, setPage] = useState(1)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', '20')
    if (search) params.set('search', search)
    if (role) params.set('role', role)
    if (blocked !== 'all') params.set('blocked', blocked)
    return params.toString()
  }, [search, role, blocked, page])

  const { data, loading, error } = useApiFetch<AdminUserListResponse>(`/admin/users?${query}`)

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="section-title">Users</h1>
        <p className="section-subtitle">Review accounts, roles, and subscription state.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
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
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              id="role"
              value={role}
              onChange={(event) => {
                setRole(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Any</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="blocked">Status</Label>
            <Select
              id="blocked"
              value={blocked}
              onChange={(event) => {
                setBlocked(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All</option>
              <option value="true">Blocked</option>
              <option value="false">Active</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Subscriptions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={5}>Loading users…</TableCell>
            </TableRow>
          )}
          {!loading && data?.items?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No users found.</TableCell>
            </TableRow>
          )}
          {data?.items?.map((user) => {
            const userId = (user as any).id ?? (user as any)._id ?? ''
            const subscriptionKeys = Object.keys(user.subscriptions ?? {})
            return (
              <TableRow key={userId || user.email}>
                <TableCell>
                  <div className="font-semibold">{user.name || user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell>
                  {user.role === 'admin' ? <Badge>Admin</Badge> : <Badge variant="neutral">User</Badge>}
                </TableCell>
                <TableCell>
                  {subscriptionKeys.length > 0 ? (
                    <Badge variant="neutral">{subscriptionKeys.join(', ')}</Badge>
                  ) : (
                    'None'
                  )}
                </TableCell>
                <TableCell>
                  {user.blocked ? (
                    <Badge variant="warning">Blocked</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
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
          Page {data?.page ?? page} of {data?.pages ?? 1}
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
