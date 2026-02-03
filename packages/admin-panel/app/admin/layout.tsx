import AdminNav from '../../components/AdminNav'
import HydrateUser from '../../components/HydrateUser'
import { requireAdmin } from '../../lib/require-admin'
import { fetchWithAuth } from '@saaslib/nextjs'
import ConfigHydrator from '../../components/ConfigHydrator'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()
  const adminData = await fetchWithAuth<{ collections?: any; subscriptionTypes?: string[] }>('/admin/users?limit=1', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return (
    <div className="app-shell">
      <AdminNav />
      <main className="app-content">
        <HydrateUser user={user} />
        <ConfigHydrator
          config={{
            collections: adminData?.collections ?? [],
            subscriptionTypes: adminData?.subscriptionTypes ?? [],
          }}
        />
        {children}
      </main>
    </div>
  )
}
