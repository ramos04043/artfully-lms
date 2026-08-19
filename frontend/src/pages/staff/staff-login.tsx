import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithZendBX } from '@/lib/zendbx-auth'
import { Users, Mail, Lock, AlertCircle } from 'lucide-react'

export default function StaffLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('🔵 Staff login attempt:', email)
      
      // Step 1: Authenticate with ZendBX
      const { data, error: signInError } = await signInWithZendBX(email, password)
      
      if (signInError) {
        console.error('❌ Sign in error:', signInError)
        setError(signInError.message || 'Invalid email or password')
        return
      }
      
      console.log('✅ ZendBX authentication successful:', data)
      
      if (!data?.user) {
        setError('Sign in failed. Please try again.')
        return
      }
      
      // Step 2: Check if user exists in app_users with STAFF role
      console.log('🔵 Checking staff role in database...')
      const { db } = await import('@/lib/zendbx')
      
      const { data: appUsers, error: dbError } = await db
        .from('app_users')
        .select('id, role, first_name, last_name, phone')
        .eq('email', email)
        .single()
      
      if (dbError || !appUsers) {
        console.error('❌ Database check error:', dbError)
        setError('User not found in system. Please contact admin.')
        return
      }
      
      console.log('📋 User role from database:', appUsers.role)
      
      // Step 3: Verify STAFF role
      if (appUsers.role !== 'STAFF') {
        setError('Access denied. Staff credentials required.')
        return
      }

      // Step 4: Update auth store with correct app_users data
      console.log('🔵 Updating auth store with app_users data')
      const { useAuthStore } = await import('@/stores/auth-store')
      useAuthStore.getState().setAuth(
        {
          id: appUsers.id, // Use app_users.id, not auth_user_id!
          email: email,
          role: appUsers.role as 'ADMIN' | 'STAFF',
          first_name: appUsers.first_name,
          last_name: appUsers.last_name,
          phone: appUsers.phone || '',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        data.session.access_token
      )

      console.log('✅ Staff role verified, redirecting to portal')
      navigate('/staff')
      
    } catch (err: any) {
      console.error('❌ Auth error:', err)
      setError(err?.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Art Studio LMS</h1>
              <p className="text-sm text-blue-200">Staff Portal</p>
            </div>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome, Staff
            </h2>
            <p className="text-lg text-blue-200">
              Mark attendance, view your batches, and manage your classes - all from your mobile device.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
            <h3 className="text-white font-semibold mb-3">Quick Access Features:</h3>
            <ul className="space-y-2 text-blue-100 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                View today's batches instantly
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                Mark attendance with one tap
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                Check attendance history
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                Mobile-optimized interface
              </li>
            </ul>
          </div>
          <div className="text-sm text-blue-200">
            © 2026 Art Studio LMS. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Art Studio LMS</h1>
              <p className="text-sm text-gray-600">Staff Portal</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Staff Sign In</h2>
              <p className="text-gray-600">Enter your credentials to access your portal</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@artstudio.com"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a
                href="/admin/login"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Admin? Login here →
              </a>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Mobile-friendly • Powered by ZendBX
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
