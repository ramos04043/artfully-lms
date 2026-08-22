import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithZendBX } from '@/lib/zendbx-auth'
import { Building2, Mail, Lock, AlertCircle } from 'lucide-react'

export default function AdminLogin() {
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
      console.log('🔵 Admin login attempt:', email)
      
      const { data, error: signInError } = await signInWithZendBX(email, password)
      
      if (signInError) {
        console.error('❌ Sign in error:', signInError)
        setError(signInError.message || 'Invalid email or password')
        return
      }
      
      console.log('✅ Sign in successful:', data)
      
      if (data?.user) {
        // Check if user has ADMIN role
        if (data.user.role !== 'ADMIN') {
          setError('Access denied. Admin credentials required.')
          return
        }

        console.log('🔵 Redirecting to admin dashboard')
        navigate('/admin')
      } else {
        setError('Sign in failed. Please try again.')
      }
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
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
              <Building2 className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Artfully LMS</h1>
              <p className="text-sm text-purple-200">Admin Portal</p>
            </div>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome Back, Admin
            </h2>
            <p className="text-lg text-purple-200">
              Manage your studio operations, track attendance, monitor fees, and oversee all aspects of your business.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">300+</div>
              <div className="text-sm text-purple-200">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">12</div>
              <div className="text-sm text-purple-200">Batches</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">98%</div>
              <div className="text-sm text-purple-200">Attendance</div>
            </div>
          </div>
          <div className="text-sm text-purple-200">
            © 2026 Artfully LMS. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Artfully LMS</h1>
              <p className="text-sm text-gray-600">Admin Portal</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Sign In</h2>
              <p className="text-gray-600">Enter your admin credentials to access the dashboard</p>
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
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@artstudio.com"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? 'Signing in...' : 'Sign In as Admin'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a
                href="/staff/login"
                className="text-sm text-purple-600 hover:text-purple-700 hover:underline"
              >
                Staff member? Login here →
              </a>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Secure admin access • Protected by ZendBX authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
