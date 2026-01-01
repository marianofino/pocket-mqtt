import { authService } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

export function HomePage() {
  const user = authService.getCurrentUser()

  const handleLogout = () => {
    authService.logout()
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-indigo-600">PocketMQTT Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.username}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 max-w-7xl">
        {/* Welcome Card */}
        <Card className="mb-8">
          <CardHeader className="text-center py-12">
            <CardTitle className="text-3xl mb-2">Welcome to PocketMQTT Admin Dashboard</CardTitle>
            <CardDescription className="text-lg">Your lightweight IoT platform control center</CardDescription>
            <div className="mt-4">
              <span className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-sm font-semibold">
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
      </main>
    </div>
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
          <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
            Coming Soon
          </span>
        </div>
      </CardHeader>
    </Card>
  )
}

