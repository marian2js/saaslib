'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSignOut } from '@saaslib/nextjs'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { cn } from '../lib/utils'
import { Crown, LayoutDashboard, Layers, ReceiptText, Users } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/collections', label: 'Collections', icon: Layers },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: ReceiptText },
]

export default function AdminNav() {
  const pathname = usePathname()
  const { signOut, loading } = useSignOut('/signin')

  return (
    <aside className="app-sidebar">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold">Saaslib Admin</p>
            <p className="text-xs text-muted-foreground">Operations control center</p>
          </div>
        </div>
        <Badge variant="neutral">Admin only</Badge>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium transition',
                active
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <Separator />
        <Button variant="outline" onClick={signOut} disabled={loading}>
          {loading ? 'Signing out…' : 'Sign out'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Protected by Saaslib admin guard and JWT auth.
        </p>
      </div>
    </aside>
  )
}
