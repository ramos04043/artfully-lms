import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '@/lib/db-api'
import { useAuthStore } from '@/stores/auth-store'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('🔵 Starting sign in process...')
      
      // Step 1: Sign in with ZendBX
      const { data: authData, error: signInError } = await db.auth.signIn({
        email,
        password,
      })

      if (signInError) {
        console.error('❌ Sign in error:', signInError)
        setError(signInError.message || 'Invalid email or password')
        return
      }

      console.log('✅ Sign in successful:', authData)

      const authUserId = authData?.user?.id

      if (!authUserId) {
        setError('Sign in failed')
        return
      }

      // Step 2: Get user profile
      const { data: profileData, error: profileError } = await db
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      if (profileError || !profileData) {
        console.error('❌ Profile not found:', profileError)
        setError('User profile not found. Please contact support.')
        return
      }

      console.log('✅ User profile loaded:', profileData)

      // Save to auth store
      setAuth(
        {
          id: profileData.id,
          email: profileData.email,
          role: profileData.role,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone: profileData.phone || '',
          is_active: profileData.is_active,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at,
        },
        authData.access_token || ''
      )

      // Step 3: Redirect based on role
      const redirectPath = profileData.role === 'ADMIN' ? '/admin' : '/staff'
      console.log('🔵 Redirecting to:', redirectPath)
      navigate(redirectPath)

    } catch (err: any) {
      console.error('❌ Auth error:', err)
      setError(err?.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Sign in
        </h2>
        <p className="text-gray-600">
          Enter your credentials to access your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-art-indigo focus:border-transparent transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-art-indigo focus:border-transparent transition-shadow"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-art-indigo hover:bg-art-indigo/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-900 font-medium mb-2">🔐 Using ZendBX Authentication</p>
        <p className="text-xs text-blue-700">
          Your data is securely stored with ZendBX. Contact your administrator for login credentials.
        </p>
      </div>
    </div>
  )
}
