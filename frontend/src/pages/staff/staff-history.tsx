import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { db } from '@/lib/db-api'
import { Calendar, CheckCircle, XCircle, Clock, Users, Filter } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface AttendanceRecord {
  id: string
  class_date: string
  batch_id: string
  batch_name?: string
  student_count: number
  present_count: number
  absent_count: number
  status: string
}

export default function HistoryPage() {
  const { user } = useAuthStore()
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    loadHistory()
  }, [filterMonth])

  const loadHistory = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Get staff details
      const { data: staffData } = await db
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!staffData) {
        setHistory([])
        setLoading(false)
        return
      }

      // Get assigned batches
      const { data: assignments } = await db
        .from('batch_staff_assignments')
        .select('batch_id')
        .eq('staff_id', staffData.id)

      const batchIds = assignments?.map(a => a.batch_id) || []
      if (batchIds.length === 0) {
        setHistory([])
        setLoading(false)
        return
      }

      // Get batch names
      const { data: batches } = await db
        .from('batches')
        .select('id, name')
        .in('id', batchIds)

      const batchMap = new Map(batches?.map(b => [b.id, b.name]) || [])

      // Get attendance records for the selected month
      const monthStart = format(startOfMonth(new Date(filterMonth + '-01')), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(new Date(filterMonth + '-01')), 'yyyy-MM-dd')

      const { data: attendance } = await db
        .from('attendance')
        .select('*')
        .in('batch_id', batchIds)
        .gte('class_date', monthStart)
        .lte('class_date', monthEnd)
        .order('class_date', { ascending: false })

      // Group by date and batch
      const groupedMap = new Map<string, AttendanceRecord>()
      
      attendance?.forEach(record => {
        const key = `${record.class_date}-${record.batch_id}`
        
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            id: key,
            class_date: record.class_date,
            batch_id: record.batch_id,
            batch_name: batchMap.get(record.batch_id) || 'Unknown Batch',
            student_count: 0,
            present_count: 0,
            absent_count: 0,
            status: 'completed',
          })
        }

        const group = groupedMap.get(key)!
        group.student_count++
        if (record.status === 'PRESENT') group.present_count++
        if (record.status === 'ABSENT') group.absent_count++
      })

      setHistory(Array.from(groupedMap.values()))
    } catch (err: any) {
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate monthly statistics
  const monthlyStats = {
    totalClasses: history.length,
    totalStudents: history.reduce((sum, r) => sum + r.student_count, 0),
    totalPresent: history.reduce((sum, r) => sum + r.present_count, 0),
    totalAbsent: history.reduce((sum, r) => sum + r.absent_count, 0),
    avgAttendance: history.length > 0
      ? Math.round((history.reduce((sum, r) => {
          const rate = r.student_count > 0 ? (r.present_count / r.student_count) * 100 : 0
          return sum + rate
        }, 0) / history.length))
      : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Attendance History
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          View your past attendance records
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-border p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-art-indigo" />
            <label className="font-medium">Filter by Month:</label>
          </div>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            max={format(new Date(), 'yyyy-MM')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
          />
        </div>
      </div>

      {/* Monthly Statistics */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600">Classes</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{monthlyStats.totalClasses}</p>
          </div>

          <div className="bg-white rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-600">Students</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{monthlyStats.totalStudents}</p>
          </div>

          <div className="bg-white rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600">Present</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{monthlyStats.totalPresent}</p>
          </div>

          <div className="bg-white rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <p className="text-xs text-gray-600">Absent</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{monthlyStats.totalAbsent}</p>
          </div>

          <div className="bg-white rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-art-indigo" />
              <p className="text-xs text-gray-600">Avg Rate</p>
            </div>
            <p className="text-2xl font-bold text-art-indigo">{monthlyStats.avgAttendance}%</p>
          </div>
        </div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-600">No attendance records found</p>
          <p className="text-sm text-gray-500 mt-2">
            Attendance records for {format(new Date(filterMonth + '-01'), 'MMMM yyyy')} will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => {
            const attendanceRate = record.student_count > 0
              ? Math.round((record.present_count / record.student_count) * 100)
              : 0

            return (
              <div
                key={record.id}
                className="bg-white rounded-lg border border-border p-4 md:p-6 hover:border-art-indigo transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-art-indigo/10">
                      <Calendar className="w-6 h-6 text-art-indigo" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{record.batch_name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(record.class_date), 'EEEE, MMMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-2xl font-bold">{record.present_count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Present</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-5 h-5" />
                        <span className="text-2xl font-bold">{record.absent_count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Absent</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center gap-1 text-blue-600">
                        <Users className="w-5 h-5" />
                        <span className="text-2xl font-bold">{record.student_count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Total</p>
                    </div>

                    <div className="hidden md:block">
                      <div
                        className={`px-4 py-2 rounded-full font-semibold ${
                          attendanceRate >= 80
                            ? 'bg-green-100 text-green-800'
                            : attendanceRate >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {attendanceRate}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
