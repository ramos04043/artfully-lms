import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { Home, CheckSquare, History, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StaffLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Today', href: '/staff', icon: Home },
  { name: 'History', href: '/staff/history', icon: History },
  { name: 'Profile', href: '/staff/profile', icon: User },
]

export default function StaffLayout({ children }: StaffLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, staff, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-art-indigo rounded-lg flex items-center justify-center text-white text-xl">
              🎨
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Art Studio</h1>
              <p className="text-xs text-muted-foreground">Staff Portal</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                             (item.href !== '/staff' && location.pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-lg transition-colors min-w-[80px]',
                    isActive
                      ? 'text-art-indigo'
                      : 'text-muted-foreground'
                  )}
                >
                  <item.icon className={cn('h-6 w-6', isActive && 'fill-art-indigo/20')} />
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
