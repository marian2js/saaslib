'use client'

import { Activity, Users, ShieldCheck } from 'lucide-react'
import { useApiFetch } from '@saaslib/nextjs'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'


type AdminUserListResponse = {
  items: Array<{ id: string; email: string }>
  total: number
}

const stats = [
  {
    key: 'users',
    label: 'Total users',
    icon: Users,
  },
  {
    key: 'health',
    label: 'API status',
    icon: Activity,
  },
  {
    key: 'guard',
    label: 'Security posture',
    icon: ShieldCheck,
  },
]

export default function DashboardStats() {
  const { data, loading, error } = useApiFetch<AdminUserListResponse>('/admin/users?limit=1')

  return (
    <div className="card-grid">
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">{stats[0].label}</p>
            <p className="text-3xl font-semibold mt-2">{loading ? '…' : data?.total ?? 0}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">{stats[1].label}</p>
            <p className="text-3xl font-semibold mt-2">{loading ? '…' : error ? 'Degraded' : 'Healthy'}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Activity className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">{stats[2].label}</p>
            <p className="text-lg font-semibold mt-2">Admin-only routes</p>
            <Badge variant="success" className="mt-3">Guarded</Badge>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
