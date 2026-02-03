import DashboardStats from '../../components/DashboardStats'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

export default function AdminDashboard() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="section-title">Mission control</h1>
        <p className="section-subtitle">
          Review activity, manage accounts, and coordinate subscriptions across your SaaS.
        </p>
      </div>

      <DashboardStats />

      <Card>
        <CardContent className="p-6 flex flex-col gap-3">
          <Badge variant="neutral">Next steps</Badge>
          <p className="text-sm text-muted-foreground">
            Collections and subscription types are auto-discovered from your backend. Add optional overrides in
            `packages/admin-panel/config/admin.config.ts` if you want custom labels or fields.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
