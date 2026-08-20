import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { db } from '@/lib/db-api'
import { User, Mail, Phone, Calendar, Users, Clock, Award } from 'lucide-react'
import { format } from 'date-fns'

interface StaffDetails {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  created_at: string
}

interface StaffStats {
  totalBatches: number
  totalClasses: number
  attendanceMarked: number
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [staffDetails, setStaffDetails] = useState<StaffDetails | null>(null)
  const [stats, setStats] = useState<StaffStats>({
    totalBatches: 0,
    totalClasses: 0,
    attendanceMarked: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Load staff details
      const { data: staffRecords } = await db
        .from('staff')
        .select('*')
        .eq('user_id', user.id)

      const staffData = staffRecords?.[0]

      if (staffData) {
        setStaffDetails({
          id: staffData.id,
          first_name: staffData.first_name,
          last_name: staffData.last_name,
          email: staffData.email,
          phone: staffData.phone,
          created_at: staffData.created_at,
        })

        // Load staff stats
        // Get assigned batches
        const { data: assignments } = await db
          .from('batch_staff_assignments')
          .select('batch_id')
          .eq('staff_id', staffData.id)

        const batchIds = assignments?.map(a => a.batch_id) || []
        const totalBatches = batchIds.length

        // Get total classes and attendance count in parallel
        const [sessionsResult, attendanceResult] = await Promise.all([
          batchIds.length > 0 ? db.from('sessions').select('id').in('batch_id', batchIds) : Promise.resolve({ data: [] }),
          batchIds.length > 0 ? db.from('attendance').select('id').in('batch_id', batchIds) : Promise.resolve({ data: [] })
        ])

        const totalClasses = sessionsResult.data?.length || 0
        const attendanceMarked = attendanceResult.data?.length || 0

        setStats({
          totalBatches,
          totalClasses,
          attendanceMarked,
        })
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          My Profile
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Your account information and statistics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-art-indigo text-white flex items-center justify-center text-2xl font-bold">
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-muted-foreground">Staff Member</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <Mail className="w-5 h-5 text-art-indigo" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>

              {staffDetails?.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <Phone className="w-5 h-5 text-art-indigo" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{staffDetails.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <Calendar className="w-5 h-5 text-art-indigo" />
                <div>
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {staffDetails?.created_at ? format(new Date(staffDetails.created_at), 'MMMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <User className="w-5 h-5 text-art-indigo" />
                <div>
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="font-medium text-xs">{user?.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-art-indigo" />
              My Statistics
            </h3>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="flex items-center gap-3 mb-1">
                  <Users className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-900">Assigned Batches</p>
                </div>
                <p className="text-3xl font-bold text-blue-900">{stats.totalBatches}</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                <div className="flex items-center gap-3 mb-1">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <p className="text-sm text-purple-900">Total Classes</p>
                </div>
                <p className="text-3xl font-bold text-purple-900">{stats.totalClasses}</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <div className="flex items-center gap-3 mb-1">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-900">Attendance Marked</p>
                </div>
                <p className="text-3xl font-bold text-green-900">{stats.attendanceMarked}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
