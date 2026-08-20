import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { 
  BookOpen, Calendar, Users, Plus, X, Save, 
  AlertCircle, CheckCircle, Award, RefreshCw, Trash2 
} from 'lucide-react'
import { format } from 'date-fns'

interface Programme {
  id: string
  name: string
  session_class_count: number
  classes_per_week: number
}

interface Session {
  id: string
  programme_id: string
  name: string
  start_date: string
  end_date: string
  total_classes: number
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  created_at: string
}

interface StudentSession {
  id: string
  student_id: string
  student_code: string
  student_first_name: string
  student_last_name: string
  session_id: string
  classes_attended: number
  classes_compensated: number
  total_classes: number
  status: string
  progress_percentage: number
  completed_at: string | null
  attendance_details: AttendanceRecord[]
}

interface AttendanceRecord {
  id: string
  class_date: string
  status: string
  batch_id: string
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [students, setStudents] = useState<StudentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'students' | 'sessions'>('students') // Default to students view
  const [refreshing, setRefreshing] = useState(false)
  
  // Delete confirmation
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // View student sessions
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [studentSessions, setStudentSessions] = useState<StudentSession[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Form fields
  const [sessionName, setSessionName] = useState('')
  const [programmeId, setProgrammeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalClasses, setTotalClasses] = useState('8')

  useEffect(() => {
    loadProgrammes()
    loadSessions()
    loadAllStudents() // Load students on page load

    // Refresh data every 30 seconds to pick up attendance changes
    const interval = setInterval(() => {
      loadAllStudents()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadAllStudents = async () => {
    try {
      setRefreshing(true)
      console.log('📊 Loading all enrolled students...')
      
      // Get all enrollments (active students)
      const { data: enrollments, error: enrollError } = await db
        .from('enrollments')
        .select('*')
        .eq('status', 'ACTIVE')

      if (enrollError) throw enrollError

      console.log('📊 Found enrollments:', enrollments?.length || 0)

      if (!enrollments || enrollments.length === 0) {
        setStudents([])
        return
      }

      // For each student, count their total attendance
      const studentData = await Promise.all(
        enrollments.map(async (enrollment) => {
          // Get ALL attendance records for this student
          const { data: attendanceRecords } = await db
            .from('attendance')
            .select('*')
            .eq('student_id', enrollment.student_id)

          const totalAttended = (attendanceRecords || []).filter(
            a => a.status === 'PRESENT' || a.status === 'COMPENSATION_PRESENT'
          ).length

          const compensated = (attendanceRecords || []).filter(
            a => a.status === 'COMPENSATION_PRESENT'
          ).length

          const totalAbsent = (attendanceRecords || []).filter(
            a => a.status === 'ABSENT'
          ).length

          return {
            id: enrollment.id,
            student_id: enrollment.id,
            student_code: enrollment.student_id,
            student_first_name: enrollment.student_first_name,
            student_last_name: enrollment.student_last_name,
            session_id: '',
            classes_attended: totalAttended,
            classes_compensated: compensated,
            total_classes: totalAttended + totalAbsent, // Total classes they've been marked for
            status: 'IN_PROGRESS',
            progress_percentage: 0,
            completed_at: null,
            attendance_details: attendanceRecords || []
          }
        })
      )

      console.log('📊 Loaded students:', studentData.length)
      setStudents(studentData)
    } catch (err) {
      console.error('Error loading students:', err)
      setError('Failed to load students')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await loadAllStudents()
    setSuccess('Data refreshed successfully')
    setTimeout(() => setSuccess(''), 2000)
  }

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return

    setDeleting(true)
    setError('')

    try {
      console.log('🗑️ Deleting session:', sessionToDelete.id)

      const { error: deleteError } = await db
        .from('sessions')
        .delete()
        .eq('id', sessionToDelete.id)

      if (deleteError) {
        console.error('❌ Delete error:', deleteError)
        throw new Error(deleteError.message || 'Failed to delete session')
      }

      console.log('✅ Session deleted successfully')
      setSuccess(`Session "${sessionToDelete.name}" deleted successfully`)
      setSessionToDelete(null)
      await loadSessions()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('❌ Error deleting session:', err)
      setError(err.message || 'Failed to delete session')
    } finally {
      setDeleting(false)
    }
  }

  const loadProgrammes = async () => {
    try {
      const { data, error: progError } = await db
        .from('programmes')
        .select('*')
        .eq('is_active', true)

      if (progError) throw progError
      
      setProgrammes(data || [])
      
      if (data && data.length > 0) {
        setProgrammeId(data[0].id)
        setTotalClasses(data[0].session_class_count?.toString() || '8')
      }
    } catch (err: any) {
      console.error('Error loading programmes:', err)
      setError('Failed to load programmes')
    }
  }

  const loadSessions = async () => {
    try {
      setLoading(true)
      const { data, error: sessionError } = await db
        .from('sessions')
        .select('*')
        .order('start_date', { ascending: false })

      if (sessionError) throw sessionError

      setSessions(data || [])
    } catch (err: any) {
      console.error('Error loading sessions:', err)
      setError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (!sessionName || !programmeId || !startDate || !endDate) {
        throw new Error('Please fill in all required fields')
      }

      if (new Date(endDate) < new Date(startDate)) {
        throw new Error('End date must be after start date')
      }

      const classCount = parseInt(totalClasses)
      if (isNaN(classCount) || classCount < 1) {
        throw new Error('Total classes must be at least 1')
      }

      console.log('📝 Creating session with data:', {
        name: sessionName,
        programme_id: programmeId,
        start_date: startDate,
        end_date: endDate,
        total_classes: classCount,
        status: 'ACTIVE'
      })

      const { data, error: insertError } = await db
        .from('sessions')
        .insert({
          name: sessionName,
          programme_id: programmeId,
          start_date: startDate,
          end_date: endDate,
          total_classes: classCount,
          status: 'ACTIVE'
        })

      if (insertError) {
        console.error('❌ Insert error:', insertError)
        throw new Error(insertError.message || 'Failed to create session')
      }

      console.log('✅ Session created:', data)
      setSuccess('Session created successfully')
      setShowCreateModal(false)
      resetForm()
      await loadSessions()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('❌ Error creating session:', err)
      
      // Extract meaningful error message
      let errorMessage = 'Failed to create session'
      if (err.message) {
        if (err.message.includes('sessions')) {
          errorMessage = 'Sessions table may not exist in database. Please check DATABASE_SETUP.md'
        } else if (err.message.includes('programme_id')) {
          errorMessage = 'Invalid programme selected'
        } else if (err.message.includes('duplicate')) {
          errorMessage = 'A session with this name already exists'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleViewStudents = async (session: Session) => {
    setSelectedSession(session)
    setLoadingStudents(true)
    setStudentSessions([])

    try {
      console.log('📊 ===== SESSION DEBUG START =====')
      console.log('📊 Session:', session.name)
      console.log('📊 Session ID:', session.id)
      console.log('📊 Date Range:', session.start_date, 'to', session.end_date)
      console.log('📊 Total Classes:', session.total_classes)
      
      // Get all enrollments (active students)
      const { data: enrollments, error: enrollError } = await db
        .from('enrollments')
        .select('*')
        .eq('status', 'ACTIVE')

      if (enrollError) {
        console.error('❌ Error fetching enrollments:', enrollError)
        throw enrollError
      }

      console.log('📊 Found enrollments:', enrollments?.length || 0)
      if (enrollments && enrollments.length > 0) {
        console.log('📊 Sample enrollment:', enrollments[0])
        console.log('📊 Student IDs:', enrollments.map(e => e.student_id))
      }

      if (!enrollments || enrollments.length === 0) {
        console.log('⚠️ No active students found in enrollments table')
        setStudentSessions([])
        setLoadingStudents(false)
        return
      }

      // Get ALL attendance records in date range to check what data exists
      const { data: allAttendance, error: attError } = await db
        .from('attendance')
        .select('*')
        .gte('class_date', session.start_date)
        .lte('class_date', session.end_date)

      if (attError) {
        console.error('❌ Error fetching attendance:', attError)
      } else {
        console.log('📊 Total attendance records in date range:', allAttendance?.length || 0)
        if (allAttendance && allAttendance.length > 0) {
          console.log('📊 Sample attendance:', allAttendance[0])
          console.log('📊 Unique student IDs in attendance:', [...new Set(allAttendance.map(a => a.student_id))])
        }
      }

      // For each student, calculate their attendance in this session
      const studentData = await Promise.all(
        enrollments.map(async (enrollment) => {
          console.log(`\n📊 Processing student: ${enrollment.student_first_name} ${enrollment.student_last_name}`)
          console.log(`📊 Student ID from enrollment: "${enrollment.student_id}"`)
          
          // Get attendance records for this student during session period
          const { data: attendanceRecords, error: studentAttError } = await db
            .from('attendance')
            .select('*')
            .eq('student_id', enrollment.student_id)
            .gte('class_date', session.start_date)
            .lte('class_date', session.end_date)

          if (studentAttError) {
            console.error(`❌ Error fetching attendance for ${enrollment.student_first_name}:`, studentAttError)
          }

          console.log(`📊 Attendance records found: ${attendanceRecords?.length || 0}`)
          if (attendanceRecords && attendanceRecords.length > 0) {
            console.log(`📊 Sample record:`, attendanceRecords[0])
            console.log(`📊 All dates:`, attendanceRecords.map(a => a.class_date))
            console.log(`📊 All statuses:`, attendanceRecords.map(a => a.status))
          }

          const attended = (attendanceRecords || []).filter(
            a => a.status === 'PRESENT' || a.status === 'COMPENSATION_PRESENT'
          ).length

          const compensated = (attendanceRecords || []).filter(
            a => a.status === 'COMPENSATION_PRESENT'
          ).length

          console.log(`📊 Classes attended: ${attended} (${compensated} compensated)`)

          const progress = session.total_classes > 0 
            ? Math.round((attended / session.total_classes) * 100)
            : 0

          return {
            id: enrollment.id,
            student_id: enrollment.id,
            student_code: enrollment.student_id,
            student_first_name: enrollment.student_first_name,
            student_last_name: enrollment.student_last_name,
            session_id: session.id,
            classes_attended: attended,
            classes_compensated: compensated,
            total_classes: session.total_classes,
            status: attended >= session.total_classes ? 'COMPLETED' : 'IN_PROGRESS',
            progress_percentage: Math.min(progress, 100),
            completed_at: attended >= session.total_classes ? new Date().toISOString() : null,
            attendance_details: attendanceRecords || []
          }
        })
      )

      console.log('📊 Total students with data:', studentData.length)
      console.log('📊 ===== SESSION DEBUG END =====\n')
      setStudentSessions(studentData)
    } catch (err) {
      console.error('❌ Error loading student sessions:', err)
      setError('Failed to load student progress')
    } finally {
      setLoadingStudents(false)
    }
  }

  const resetForm = () => {
    setSessionName('')
    setStartDate('')
    setEndDate('')
    if (programmes.length > 0) {
      setProgrammeId(programmes[0].id)
      setTotalClasses(programmes[0].session_class_count?.toString() || '8')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'CLOSED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Class Tracking</h1>
            <p className="text-gray-600 mt-1">
              Track student attendance and class completion
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            {viewMode === 'students' && (
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {/* Toggle View Mode */}
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('students')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'students'
                    ? 'bg-white text-art-indigo shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Students
              </button>
              <button
                onClick={() => setViewMode('sessions')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'sessions'
                    ? 'bg-white text-art-indigo shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sessions
              </button>
            </div>
            {viewMode === 'sessions' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Session
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {viewMode === 'students' ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Classes Attended</p>
              <p className="text-2xl font-bold text-green-600">
                {students.reduce((sum, s) => sum + s.classes_attended, 0)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Compensation Classes</p>
              <p className="text-2xl font-bold text-blue-600">
                {students.reduce((sum, s) => sum + s.classes_compensated, 0)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Active Sessions</p>
              <p className="text-2xl font-bold text-green-600">
                {sessions.filter(s => s.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Draft Sessions</p>
              <p className="text-2xl font-bold text-gray-600">
                {sessions.filter(s => s.status === 'DRAFT').length}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Closed Sessions</p>
              <p className="text-2xl font-bold text-red-600">
                {sessions.filter(s => s.status === 'CLOSED').length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'students' ? (
        /* ALL STUDENTS VIEW */
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Enrolled Students</h2>
            <p className="text-sm text-gray-600 mt-1">View class attendance for all active students</p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-art-indigo mx-auto mb-3"></div>
              <p className="text-gray-600">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No enrolled students</h3>
              <p className="text-gray-600">Students will appear here once they are enrolled</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-art-indigo/10 rounded-full flex items-center justify-center">
                        <span className="text-art-indigo font-semibold text-lg">
                          {student.student_first_name[0]}
                          {student.student_last_name[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold text-gray-900 text-lg">
                            {student.student_first_name} {student.student_last_name}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500">{student.student_code}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Total Classes</p>
                        <p className="text-3xl font-bold text-art-indigo">{student.classes_attended}</p>
                      </div>
                      {student.classes_compensated > 0 && (
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Compensated</p>
                          <p className="text-2xl font-bold text-blue-600">{student.classes_compensated}</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Total Marked</p>
                        <p className="text-2xl font-bold text-gray-600">{student.total_classes}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* SESSIONS VIEW */
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Sessions</h2>
          </div>

          {sessions.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-600 mb-6">Create your first session to start tracking student progress</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create First Session
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleViewStudents(session)}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{session.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(session.start_date), 'MMM dd, yyyy')} - {format(new Date(session.end_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{session.total_classes} classes</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewStudents(session)
                      }}
                      className="px-4 py-2 bg-art-indigo hover:bg-art-indigo/90 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      View Progress
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSessionToDelete(session)
                      }}
                      className="p-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-sm transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create New Session</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="e.g., January 2026 Session"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Programme <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={programmeId}
                    onChange={(e) => {
                      setProgrammeId(e.target.value)
                      const prog = programmes.find(p => p.id === e.target.value)
                      if (prog) {
                        setTotalClasses(prog.session_class_count?.toString() || '8')
                      }
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  >
                    {programmes.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Classes <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={totalClasses}
                    onChange={(e) => setTotalClasses(e.target.value)}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of classes required to complete this session
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                    setError('')
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-art-indigo hover:bg-art-indigo/90 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Progress Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedSession.name}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {format(new Date(selectedSession.start_date), 'MMM dd, yyyy')} - {format(new Date(selectedSession.end_date), 'MMM dd, yyyy')} • {selectedSession.total_classes} classes
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Progress</h3>

              {loadingStudents ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-art-indigo mx-auto mb-3"></div>
                  <p className="text-gray-600">Loading student progress...</p>
                </div>
              ) : studentSessions.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No students found for this session</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentSessions.map((studentSession) => (
                    <div
                      key={studentSession.id}
                      className="p-4 rounded-lg border border-gray-200 hover:border-art-indigo/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-art-indigo/10 rounded-full flex items-center justify-center">
                            <span className="text-art-indigo font-semibold">
                              {studentSession.student_first_name[0]}
                              {studentSession.student_last_name[0]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-medium text-gray-900">
                                {studentSession.student_first_name} {studentSession.student_last_name}
                              </p>
                              {studentSession.status === 'COMPLETED' && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                  <Award className="w-3 h-3" />
                                  Completed
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{studentSession.student_code}</p>
                            
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600">
                                  {studentSession.classes_attended} / {studentSession.total_classes} classes
                                </span>
                                <span className="font-medium text-gray-900">
                                  {studentSession.progress_percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${getProgressColor(studentSession.progress_percentage)}`}
                                  style={{ width: `${studentSession.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {studentSession.classes_compensated > 0 && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600">Compensated</p>
                              <p className="text-lg font-bold text-blue-600">{studentSession.classes_compensated}</p>
                            </div>
                          )}
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Remaining</p>
                            <p className="text-lg font-bold text-orange-600">
                              {Math.max(0, studentSession.total_classes - studentSession.classes_attended)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedSession(null)}
                className="w-full px-6 py-2 bg-art-indigo hover:bg-art-indigo/90 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Session</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete this session?
                </p>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-900">{sessionToDelete.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(new Date(sessionToDelete.start_date), 'MMM dd, yyyy')} - {format(new Date(sessionToDelete.end_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSessionToDelete(null)
                    setError('')
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSession}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Session
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
