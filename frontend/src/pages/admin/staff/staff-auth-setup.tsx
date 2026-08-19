import { useState, useEffect } from 'react'
import { Shield, CheckCircle2, XCircle, ExternalLink, Copy, Check } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface StaffMember {
  id: string
  email: string
  name: string
  auth_user_id?: string
}

interface AuthStatus {
  total: number
  with_auth: number
  without_auth: number
  staff_with_auth: StaffMember[]
  staff_without_auth: StaffMember[]
}

export default function StaffAuthSetup() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  useEffect(() => {
    fetchAuthStatus()
  }, [])

  const fetchAuthStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/staff-auth-fix/check-auth-status`)
      const data = await response.json()
      setAuthStatus(data)
    } catch (error) {
      console.error('Error fetching auth status:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, email: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!authStatus) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load staff authentication status</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Staff Authentication Setup</h2>
            <p className="text-gray-600">Manage staff member login credentials</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{authStatus.total}</div>
            <div className="text-sm text-gray-600">Total Staff</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{authStatus.with_auth}</div>
            <div className="text-sm text-gray-600">Can Login</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600">{authStatus.without_auth}</div>
            <div className="text-sm text-gray-600">Need Setup</div>
          </div>
        </div>
      </div>

      {/* Staff with Auth */}
      {authStatus.staff_with_auth.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Staff with Login Access ({authStatus.with_auth})
          </h3>
          <div className="space-y-2">
            {authStatus.staff_with_auth.map((staff) => (
              <div key={staff.email} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{staff.name}</div>
                  <div className="text-sm text-gray-600">{staff.email}</div>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff without Auth - Setup Required */}
      {authStatus.staff_without_auth.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-amber-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-amber-600" />
            Staff Requiring Auth Setup ({authStatus.without_auth})
          </h3>

          {/* Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-amber-900 mb-2">📋 Setup Instructions</h4>
            <p className="text-sm text-amber-800 mb-3">
              ZendBX requires manual auth account creation for security. Follow these steps:
            </p>
            <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
              <li>Open <a href="https://console.zendbx.in" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-amber-900">ZendBX Console</a></li>
              <li>Navigate to: <span className="font-mono bg-amber-100 px-1 rounded">Authentication → Users</span></li>
              <li>Click <span className="font-semibold">"Add User"</span> button</li>
              <li>For each staff member below:
                <ul className="ml-6 mt-1 space-y-1 list-disc">
                  <li>Enter their email (copy button provided)</li>
                  <li>Set password: <span className="font-mono bg-amber-100 px-1 rounded">Teacher123!</span></li>
                  <li>Click "Create User"</li>
                </ul>
              </li>
              <li>After creating all accounts, click "Refresh Status" button below</li>
            </ol>
          </div>

          {/* Staff List */}
          <div className="space-y-3">
            {authStatus.staff_without_auth.map((staff, index) => (
              <div key={staff.email} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div className="font-medium text-gray-900">{staff.name}</div>
                  </div>
                  <div className="ml-9 flex items-center gap-2">
                    <code className="text-sm bg-white px-2 py-1 rounded border border-gray-200">
                      {staff.email}
                    </code>
                    <button
                      onClick={() => copyToClipboard(staff.email, staff.email)}
                      className="p-1 hover:bg-white rounded transition-colors"
                      title="Copy email"
                    >
                      {copiedEmail === staff.email ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-amber-500" />
                  <span>No auth</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center gap-4">
            <a
              href="https://console.zendbx.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Open ZendBX Console
            </a>
            <button
              onClick={fetchAuthStatus}
              className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Refresh Status
            </button>
          </div>

          {/* Password Info */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Default Password</h4>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-white px-3 py-1 rounded border border-blue-200 font-mono">
                    Teacher123!
                  </code>
                  <button
                    onClick={() => copyToClipboard('Teacher123!', 'password')}
                    className="p-1 hover:bg-white rounded transition-colors"
                    title="Copy password"
                  >
                    {copiedEmail === 'password' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-blue-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Staff members can change their password after first login
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Done */}
      {authStatus.without_auth === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            All Staff Members Have Login Access!
          </h3>
          <p className="text-green-700">
            Every staff member can now login at <span className="font-mono">/staff/login</span>
          </p>
        </div>
      )}
    </div>
  )
}
