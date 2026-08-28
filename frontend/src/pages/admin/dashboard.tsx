import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGreeting } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { db } from '@/lib/db-api'
import { format } from 'date-fns'
import { Calendar, Users, Wallet, TrendingUp, Clock, X } from 'lucide-react'

interface DashboardStats {
  todaysBatches: number
  activeStudents: number
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

interface BatchStudent {
  id: string
  student_id: string
  student_first_name: string
  student_last_name: string
  status: string
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    todaysBatches: 0,
    activeStudents: 0,
    attendanceToday: 0,
  })
  const [todaysClasses, setTodaysClasses] = useState<TodayClass[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<TodayClass | null>(null)
  const [batchStudents, setBatchStudents] = useState<BatchStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

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
    const { data: batches } = await db
      .from('batches')
      .select('id')
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)

    const todaysBatches = batches?.length || 0

    // Get active students from enrollments table
    const { data: enrollments } = await db
      .from('enrollments')
      .select('id')
      .eq('status', 'ACTIVE')

    const activeStudents = enrollments?.length || 0

    // Get today's attendance rate
    const { data: todayAttendance } = await db
      .from('attendance')
      .select('status')
      .eq('class_date', today)

    const totalMarked = todayAttendance?.length || 0
    const presentCount = todayAttendance?.filter(a => a.status === 'PRESENT' || a.status === 'COMPENSATION_PRESENT').length || 0
    const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0

    console.log('📊 Dashboard Stats:', {
      todaysBatches,
      activeStudents,
      attendanceToday: attendanceRate,
      todayAttendanceData: { totalMarked, presentCount }
    })

    return {
      todaysBatches,
      activeStudents,
      attendanceToday: attendanceRate,
    }
  }

  const loadTodaysClassesOptimized = async () => {
    const dayOfWeek = format(new Date(), 'EEEE').toUpperCase()

    // Get batches for today with programme info
    const { data: batches } = await db
      .from('batches')
      .select('id, name, programme_id, start_time, end_time, day_of_week')
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .order('start_time', { ascending: true })

    if (!batches || batches.length === 0) {
      return []
    }

    // Convert batches to today's classes format
    const classesWithNames: TodayClass[] = batches.map(batch => ({
      id: batch.id,
      batch_name: batch.name,
      start_time: batch.start_time,
      end_time: batch.end_time,
      day_of_week: batch.day_of_week,
      class_type: 'Regular',
      duration_minutes: 75, // 1 hour 15 minutes per class
    }))

    return classesWithNames
  }

  const handleBatchClick = async (batch: TodayClass) => {
    setSelectedBatch(batch)
    setLoadingStudents(true)
    setBatchStudents([])
    
    try {
      // Query student_batches to get students in this specific batch
      const { data: studentBatches, error } = await db
        .from('student_batches')
        .select(`
          id,
          student_id,
          students!inner (
            student_id,
            first_name,
            last_name,
            status
          )
        `)
        .eq('batch_id', batch.id)
        .eq('is_active', true)
      
      if (error) {
        console.error('Error fetching students:', error)
        return
      }

      // Transform the data to match the expected BatchStudent interface
      const studentsInBatch = (studentBatches || []).map((sb: any) => ({
        id: sb.id,
        student_id: sb.students.student_id,
        student_first_name: sb.students.first_name,
        student_last_name: sb.students.last_name,
        status: sb.students.status,
      }))
      
      setBatchStudents(studentsInBatch)
    } catch (err) {
      console.error('Error loading batch students:', err)
    } finally {
      setLoadingStudents(false)
    }
  }

  const closeModal = () => {
    setSelectedBatch(null)
    setBatchStudents([])
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
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
        <div 
          onClick={() => navigate('/admin/batches')}
          className="p-4 md:p-6 rounded-lg bg-white border border-border gradient-soft-indigo cursor-pointer hover:shadow-lg hover:border-art-indigo transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-art-indigo" />
            <p className="text-xs md:text-sm text-muted-foreground">Today's Batches</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.todaysBatches}</p>
          <p className="text-xs text-art-indigo mt-2 font-medium">Click to view →</p>
        </div>
        
        <div 
          onClick={() => navigate('/admin/students')}
          className="p-4 md:p-6 rounded-lg bg-white border border-border gradient-sage cursor-pointer hover:shadow-lg hover:border-green-600 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
            <p className="text-xs md:text-sm text-muted-foreground">Active Students</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.activeStudents}</p>
          <p className="text-xs text-green-600 mt-2 font-medium">Click to view →</p>
        </div>
        
        <div 
          onClick={() => navigate('/admin/attendance')}
          className="p-4 md:p-6 rounded-lg bg-white border border-border gradient-lavender cursor-pointer hover:shadow-lg hover:border-purple-600 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
            <p className="text-xs md:text-sm text-muted-foreground">Attendance Today</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {stats.attendanceToday}%
          </p>
          <p className="text-xs text-purple-600 mt-2 font-medium">Click to view →</p>
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
                onClick={() => handleBatchClick(cls)}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-art-indigo hover:shadow-md transition-all cursor-pointer"
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
                <div className="text-sm text-gray-500">
                  Click to view students →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch Students Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedBatch.batch_name}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedBatch.start_time} - {selectedBatch.end_time} • {selectedBatch.duration_minutes} mins
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Students in this Batch
                </h3>
                <span className="px-3 py-1 bg-art-indigo/10 text-art-indigo rounded-full text-sm font-medium">
                  {batchStudents.length} {batchStudents.length === 1 ? 'Student' : 'Students'}
                </span>
              </div>

              {loadingStudents ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-art-indigo mx-auto mb-3"></div>
                  <p className="text-gray-600">Loading students...</p>
                </div>
              ) : batchStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No students assigned to this batch yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {batchStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-art-indigo transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-art-indigo/10 rounded-full flex items-center justify-center">
                          <span className="text-art-indigo font-semibold text-sm">
                            {student.student_first_name[0]}
                            {student.student_last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {student.student_first_name} {student.student_last_name}
                          </p>
                          <p className="text-sm text-gray-500">{student.student_id}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          student.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : student.status === 'PAUSED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {student.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-art-indigo hover:bg-art-indigo/90 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
