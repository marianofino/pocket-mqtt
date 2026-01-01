import { AdminShell } from '@/components/app/AdminShell'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function HomePage() {
  return (
    <AdminShell>
      {/* Welcome Card */}
      <Card className="mb-8">
        <CardHeader className="text-center py-12">
          <CardTitle className="text-3xl mb-2">Welcome to PocketMQTT Admin Dashboard</CardTitle>
          <CardDescription className="text-lg">Your lightweight IoT platform control center</CardDescription>
          <div className="mt-4">
            <span className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Coming Soon
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureCard
          title="Device Management"
          description="Monitor and manage your IoT devices, view status, and configure settings."
        />
        <FeatureCard
          title="Telemetry Data"
          description="Visualize real-time telemetry data with charts and analytics."
        />
        <FeatureCard
          title="API Management"
          description="Configure API endpoints, manage access keys, and monitor usage."
        />
        <FeatureCard
          title="System Settings"
          description="Configure system settings, user management, and security options."
        />
      </div>
    </AdminShell>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <Separator className="my-2" />
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
        <div className="mt-3">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            Coming Soon
          </span>
        </div>
      </CardHeader>
    </Card>
  )
}


