import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-art-indigo/10 via-art-lavender/10 to-art-peach/10 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-art-indigo rounded-lg flex items-center justify-center text-white text-2xl">
              🎨
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Art Studio</h1>
              <p className="text-sm text-gray-600">Management System</p>
            </div>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome back
            </h2>
            <p className="text-lg text-gray-600">
              Manage your art studio with ease. Track attendance, manage students,
              and streamline operations all in one place.
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          © 2024 Art Studio Management. Built with care for art schools.
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
