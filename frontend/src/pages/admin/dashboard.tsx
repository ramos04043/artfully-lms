import { useEffect, useState } from 'react'
import { getGreeting } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { db } from '@/lib/db-api'
import { format } from 'date-fns'
import { Calendar, Users, Wallet, TrendingUp, Clock } from 'lucide-react'

interface DashboardStats {
  todaysBatches: number
  activeStudents: number
  pendingFees: number
  attendanceToday: number
}

interface TodayClass {
  id: string
  batch_name: string
  start_time: string
  end_time: string
  day_of_week: string
  class_type: string
  duration_minutes: number
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    todaysBatches: 0,
    activeStudents: 0,
    pendingFees: 0,
    attendanceToday: 0,
  })
  const [todaysClasses, setTodaysClasses] = useState<TodayClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      // Load in parallel for faster performance
      const [statsData, classesData] = await Promise.all([
        loadStatsOptimized(),
        loadTodaysClassesOptimized(),
      ])
      
      if (statsData) setStats(statsData)
      if (classesData) setTodaysClasses(classesData)
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStatsOptimized = async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const dayOfWeek = format(new Date(), 'EEEE').toUpperCase()

    // Get today's batches (batches that have classes on this day)
    const { data: sessions } = await db
      .from('sessions')
      .select('batch_id')
      .eq('day_of_week', dayOfWeek)

    const uniqueBatchIds = new Set(sessions?.map(s => s.batch_id) || [])
    const todaysBatches = uniqueBatchIds.size

    // Get active students from enrollments
    const { data: enrollments } = await db
      .from('enrollments')
      .select('id')
      .eq('status', 'ACTIVE')

    const activeStudents = enrollments?.length || 0

    // Get pending fees (fee_due entries with status PENDING)
    const { data: feeDues } = await db
      .from('fee_due')
      .select('amount_due')
      .eq('status', 'PENDING')

    const pendingFees = feeDues?.reduce((sum, fee) => sum + (fee.amount_due || 0), 0) || 0

    // Get today's attendance rate
    const { data: todayAttendance } = await db
      .from('attendance')
      .select('status')
      .eq('class_date', today)

    const totalMarked = todayAttendance?.length || 0
    const presentCount = todayAttendance?.filter(a => a.status === 'PRESENT').length || 0
    const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0

    return {
      todaysBatches,
      activeStudents,
      pendingFees,
      attendanceToday: attendanceRate,
    }
  }

  const loadTodaysClassesOptimized = async () => {
    const dayOfWeek = format(new Date(), 'EEEE').toUpperCase()

    // Get sessions for today
    const { data: sessions } = await db
      .from('sessions')
      .select('id, batch_id, start_time, end_time, day_of_week, class_type, duration_minutes')
      .eq('day_of_week', dayOfWeek)
      .order('start_time', { ascending: true })

    if (!sessions || sessions.length === 0) {
      return []
    }

    // Get batch names
    const batchIds = [...new Set(sessions.map(s => s.batch_id))]
    const { data: batches } = await db
      .from('batches')
      .select('id, name')
      .in('id', batchIds)

    const batchMap = new Map(batches?.map(b => [b.id, b.name]) || [])

    const classesWithNames: TodayClass[] = sessions.map(session => ({
      id: session.id,
      batch_name: batchMap.get(session.batch_id) || 'Unknown Batch',
      start_time: session.start_time,
      end_time: session.end_time,
      day_of_week: session.day_of_week,
      class_type: session.class_type,
      duration_minutes: session.duration_minutes,
    }))

    return classesWithNames
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {getGreeting()}, {user?.first_name} 👋
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Here's what's happening at the studio today
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="p-4 md:p-6 rounded-lg bg-white border border-border gradient-soft-indigo">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-art-indigo" />
            <p className="text-xs md:text-sm text-muted-foreground">Today's Batches</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.todaysBatches}</p>
        </div>
        
        <div className="p-4 md:p-6 rounded-lg bg-white border border-border gradient-sage">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
            <p className="text-xs md:text-sm text-muted-foreground">Active Students</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.activeStudents}</p>
        </div>
        
        <div className="p-4 md:p-6 rounded-lg bg-white border border-border gradient-peach">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
            <p className="text-xs md:text-sm text-muted-foreground">Pending Fees</p>
          </div>
          <p className="text-xl md:text-3xl font-bold text-foreground">₹{stats.pendingFees.toLocaleString()}</p>
        </div>
        
        <div className="p-4 md:p-6 rounded-lg bg-white border border-border gradient-lavender">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
            <p className="text-xs md:text-sm text-muted-foreground">Attendance Today</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {stats.attendanceToday > 0 ? `${stats.attendanceToday}%` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Today's Classes */}
      <div className="bg-white rounded-lg border border-border p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-art-indigo" />
          Today's Classes
        </h2>
        
        {todaysClasses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No classes scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysClasses.map((cls) => (
              <div
                key={cls.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-art-indigo transition-colors"
              >
                <div className="flex items-start gap-3 mb-2 md:mb-0">
                  <div className="p-2 rounded-lg bg-art-indigo/10">
                    <Calendar className="w-5 h-5 text-art-indigo" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{cls.batch_name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {cls.start_time} - {cls.end_time}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs">
                        {cls.class_type || 'Regular'}
                      </span>
                      <span>{cls.duration_minutes} mins</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
