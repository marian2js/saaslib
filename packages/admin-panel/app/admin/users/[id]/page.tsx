'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useApiCallback, useApiFetch } from '@saaslib/nextjs'
import { loadStripe } from '@stripe/stripe-js'
import { useAdminConfig } from '../../../../lib/use-admin-config'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Select } from '../../../../components/ui/select'


type AdminUser = {
  id: string
  email: string
  name?: string
  role?: string
  blocked?: boolean
  emailVerified?: boolean
  stripeCustomerId?: string
  subscriptions?: Record<
    string,
    {
      product: string
      periodEnd?: string
      nextProduct?: string
      cancelled?: boolean
    }
  >
}

type AdminUserResponse = {
  user: AdminUser
}

type SubscriptionCatalogResponse = {
  subscriptions: Array<{ type: string; products: Array<{ id: string; prices: string[] }> }>
}

export default function UserDetailPage() {
  const params = useParams()
  const rawUserId =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const userId = rawUserId === 'undefined' ? '' : rawUserId
  const { config } = useAdminConfig()
  const { data, loading, error, refetch } = useApiFetch<AdminUserResponse>(`/admin/users/${userId}`, {
    skip: !userId,
    skipDefault: null,
  })
  const { data: catalogData } = useApiFetch<SubscriptionCatalogResponse>('/admin/subscriptions/catalog')
  const { callback: updateUser, loading: saving } = useApiCallback<AdminUserResponse>()
  const { callback: changeSubscription, loading: changingPlan } = useApiCallback<{ ok: true }>()
  const { callback: startSubscription, loading: starting } = useApiCallback<{ sessionId: string }>()
  const { callback: cancelSubscription, loading: cancelling } = useApiCallback<{ ok: true }>()
  const { callback: resumeSubscription, loading: resuming } = useApiCallback<{ ok: true }>()

  const user = data?.user
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    role: '',
    blocked: false,
  })

  const subscriptions = useMemo(() => user?.subscriptions ?? {}, [user])
  const catalogTypes = useMemo(() => catalogData?.subscriptions ?? [], [catalogData])
  const allTypes = useMemo(() => {
    const fromCatalog = catalogTypes.map((item) => item.type)
    const fromUser = Object.keys(subscriptions)
    return Array.from(new Set([...fromCatalog, ...fromUser]))
  }, [catalogTypes, subscriptions])

  useEffect(() => {
    if (user) {
      setFormState({
        name: user.name ?? '',
        email: user.email,
        role: user.role ?? '',
        blocked: !!user.blocked,
      })
    }
  }, [user])

  const handleSave = async () => {
    const payload = {
      name: formState.name || undefined,
      email: formState.email || undefined,
      role: formState.role || undefined,
      blocked: formState.blocked,
    }
    await updateUser(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    refetch()
  }

  const handlePlanChange = async (type: string, priceId: string) => {
    if (!priceId) return
    await changeSubscription('/admin/subscriptions/change', {
      method: 'POST',
      body: JSON.stringify({ userId, type, priceId }),
    })
    refetch()
  }

  const handleStart = async (type: string, priceId: string) => {
    if (!priceId) return
    const res = await startSubscription('/admin/subscriptions/start', {
      method: 'POST',
      body: JSON.stringify({ userId, type, priceId }),
    })
    if (res?.sessionId) {
      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      if (!stripeKey) {
        alert('Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to start subscriptions.')
        return
      }
      const stripe = await loadStripe(stripeKey)
      if (!stripe) {
        alert('Failed to initialize Stripe.')
        return
      }
      await stripe.redirectToCheckout({ sessionId: res.sessionId })
    }
  }

  const handleCancel = async (type: string) => {
    if (!confirm('Cancel this subscription at period end?')) return
    await cancelSubscription('/admin/subscriptions/cancel', {
      method: 'POST',
      body: JSON.stringify({ userId, type }),
    })
    refetch()
  }

  const handleResume = async (type: string) => {
    await resumeSubscription('/admin/subscriptions/resume', {
      method: 'POST',
      body: JSON.stringify({ userId, type }),
    })
    refetch()
  }

  if (!userId) {
    return (
      <div className="rounded-xl border border-border bg-muted/60 px-4 py-3">
        Invalid user id.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="section-title">User detail</h1>
        <p className="section-subtitle">Manage profile, access, and billing.</p>
      </div>

      {loading && <div className="rounded-xl border border-border bg-muted/60 px-4 py-3">Loading user…</div>}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {user && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  id="role"
                  value={formState.role}
                  onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value }))}
                >
                  <option value="">User</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={formState.blocked ? 'blocked' : 'active'}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, blocked: event.target.value === 'blocked' }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </Select>
              </div>
            </CardContent>
            <CardContent className="flex flex-wrap items-center gap-3 pt-0">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Badge variant="neutral">ID: {user.id}</Badge>
              {user.emailVerified ? (
                <Badge variant="success">Email verified</Badge>
              ) : (
                <Badge variant="warning">Email unverified</Badge>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">Subscriptions</h2>
              <p className="text-muted-foreground">
                Upgrade, cancel, or resume plans without leaving the console.
              </p>
            </div>

            {Object.keys(subscriptions).length === 0 && (
              <div className="rounded-xl border border-border bg-muted/60 px-4 py-3">
                No subscriptions found for this user.
              </div>
            )}

            {allTypes.map((type) => {
              const subscription = subscriptions?.[type]
              const catalog = catalogData?.subscriptions?.find((item) => item.type === type)
              const configCatalog = config.subscriptions.find((item) => item.type === type)
              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="text-lg">{configCatalog?.label ?? type}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {subscription ? (
                      <p className="text-sm text-muted-foreground">
                        Current product: {subscription.product}
                        {subscription.nextProduct ? ` · Next: ${subscription.nextProduct}` : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No active subscription for this type.</p>
                    )}
                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`plan-${type}`}>Change plan</Label>
                        <Select id={`plan-${type}`} defaultValue="">
                          <option value="">Select plan</option>
                          {catalog?.products.flatMap((product) =>
                            product.prices.map((priceId) => {
                              const label =
                                configCatalog?.prices.find((price) => price.id === priceId)?.label ?? priceId
                              return (
                                <option key={`${product.id}-${priceId}`} value={priceId}>
                                  {label}
                                </option>
                              )
                            }),
                          )}
                        </Select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subscription ? (
                          <>
                            <Button
                              onClick={() => {
                                const select = document.getElementById(`plan-${type}`) as HTMLSelectElement | null
                                handlePlanChange(type, select?.value ?? '')
                              }}
                              disabled={changingPlan}
                            >
                              {changingPlan ? 'Updating…' : 'Apply plan'}
                            </Button>
                            <Button variant="outline" onClick={() => handleResume(type)} disabled={resuming}>
                              {resuming ? 'Resuming…' : 'Resume'}
                            </Button>
                            <Button variant="destructive" onClick={() => handleCancel(type)} disabled={cancelling}>
                              {cancelling ? 'Cancelling…' : 'Cancel'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => {
                              const select = document.getElementById(`plan-${type}`) as HTMLSelectElement | null
                              handleStart(type, select?.value ?? '')
                            }}
                            disabled={starting}
                          >
                            {starting ? 'Starting…' : 'Start subscription'}
                          </Button>
                        )}
                      </div>
                    </div>
                    {subscription?.cancelled && <Badge variant="warning">Cancel pending</Badge>}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
