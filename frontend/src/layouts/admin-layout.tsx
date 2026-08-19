import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  Clock,
  TrendingDown,
  Wallet,
  TrendingUp,
  FileText,
  Bell,
  UsersRound,
  Settings,
  LogOut,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'Batches', href: '/admin/batches', icon: Calendar },
  { name: 'Attendance', href: '/admin/attendance', icon: CheckSquare },
  { name: 'Compensation', href: '/admin/compensation', icon: Clock },
  { name: 'Expenses', href: '/admin/finance/expenses', icon: TrendingDown },
  { name: 'Fees', href: '/admin/fees', icon: Wallet },
  { name: 'Finance', href: '/admin/finance', icon: TrendingUp },
  { name: 'Reports', href: '/admin/reports', icon: FileText },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Staff', href: '/admin/staff', icon: UsersRound },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <div className="h-10 w-10 bg-art-indigo rounded-lg flex items-center justify-center">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Art Studio</h1>
            <p className="text-xs text-muted-foreground">Admin Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                             (item.href !== '/admin' && location.pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-art-indigo/10 text-art-indigo'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-art-indigo text-white flex items-center justify-center font-semibold">
              {user?.first_name.charAt(0)}{user?.last_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
