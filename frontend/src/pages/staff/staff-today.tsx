import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { format } from 'date-fns'
import { Calendar, Users, CheckCircle, XCircle, Clock } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Batch {
  id: string
  label: string
  weekday: string
  start_time: string
  end_time: string
  capacity: number
  programme_name: string
}

interface TodayBatch extends Batch {
  total_students: number
  marked_present: number
  marked_absent: number
  not_marked: number
}

export default function StaffToday() {
  const { user } = useAuthStore()
  const [todayBatches, setTodayBatches] = useState<TodayBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const today = new Date()
  const currentWeekday = format(today, 'EEEE').toUpperCase()
  const [selectedDay, setSelectedDay] = useState(currentWeekday)
  const dateStr = format(today, 'MMMM dd, yyyy')

  const weekDays = [
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
    { value: 'FRIDAY', label: 'Friday' },
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' },
  ]

  useEffect(() => {
    loadTodayBatches()
  }, [selectedDay]) // Reload when day changes

  const loadTodayBatches = async () => {
    try {
      setLoading(true)
      setError('')

      if (!user?.id) {
        setError('User not found')
        return
      }

      // Call backend API instead of direct ZendBX query
      const response = await fetch(
        `${API_URL}/api/staff/me/batches?user_id=${user.id}&day_of_week=${selectedDay}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const batches: TodayBatch[] = await response.json()
      setTodayBatches(batches)
      
      if (batches.length === 0) {
        setError('No batches assigned to you for this day.')
      }
    } catch (err: any) {
      console.error('Error loading today batches:', err)
      setError(err.message || 'Failed to load batches')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (notMarked: number, total: number) => {
    if (notMarked === 0 && total > 0) return 'bg-green-100 border-green-300'
    if (notMarked > 0 && notMarked < total) return 'bg-yellow-100 border-yellow-300'
    return 'bg-gray-100 border-gray-300'
  }

  const getStatusText = (notMarked: number, total: number) => {
    if (total === 0) return 'No students'
    if (notMarked === 0) return 'Complete'
    if (notMarked === total) return 'Not started'
    return 'In progress'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading today's batches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{dateStr}</span>
            </div>
            
            {/* Day Selector Dropdown */}
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {weekDays.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label} {day.value === currentWeekday && '(Today)'}
                </option>
              ))}
            </select>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.first_name}!
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {todayBatches.length} batch{todayBatches.length !== 1 ? 'es' : ''} scheduled for {weekDays.find(d => d.value === selectedDay)?.label}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {todayBatches.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Batches</h2>
            <p className="text-gray-600">No batches scheduled for {weekDays.find(d => d.value === selectedDay)?.label}.</p>
            <p className="text-sm text-gray-500 mt-2">Try selecting a different day from the dropdown above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayBatches.map((batch) => (
              <Link
                key={batch.id}
                to={`/staff/attendance/${batch.id}`}
                className={`block rounded-lg border-2 p-4 transition-all active:scale-95 ${getStatusColor(batch.not_marked, batch.total_students)}`}
              >
                {/* Batch Time */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-700" />
                    <span className="text-lg font-bold text-gray-900">
                      {batch.start_time} - {batch.end_time}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    batch.not_marked === 0 && batch.total_students > 0
                      ? 'bg-green-200 text-green-800'
                      : batch.not_marked > 0 && batch.not_marked < batch.total_students
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    {getStatusText(batch.not_marked, batch.total_students)}
                  </span>
                </div>

                {/* Programme */}
                <p className="text-sm text-gray-600 mb-3">{batch.programme_name}</p>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Total Students */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="text-2xl font-bold text-gray-900">{batch.total_students}</span>
                    </div>
                    <p className="text-xs text-gray-600">Students</p>
                  </div>

                  {/* Present */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">{batch.marked_present}</span>
                    </div>
                    <p className="text-xs text-gray-600">Present</p>
                  </div>

                  {/* Absent */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-2xl font-bold text-red-600">{batch.marked_absent}</span>
                    </div>
                    <p className="text-xs text-gray-600">Absent</p>
                  </div>
                </div>

                {/* Not Marked Badge */}
                {batch.not_marked > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-center text-sm font-medium text-gray-700">
                      {batch.not_marked} student{batch.not_marked !== 1 ? 's' : ''} not marked
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
