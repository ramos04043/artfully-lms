import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { Clock, Calendar, Users, Plus, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface Session {
  id: string
  batch_id: string
  batch_name?: string
  day_of_week: string
  start_time: string
  end_time: string
  class_type: string
  duration_minutes: number
  created_at: string
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDay, setFilterDay] = useState<string>('all')

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      
      // Load sessions and batches in parallel
      const [sessionsResult, batchesResult] = await Promise.all([
        db.from('sessions').select('*').order('day_of_week'),
        db.from('batches').select('id, name')
      ])

      const sessionsData = sessionsResult.data
      const batches = batchesResult.data

      if (sessionsData && batches) {
        const batchMap = new Map(batches.map(b => [b.id, b.name]))

        const sessionsWithBatchNames = sessionsData.map(session => ({
          ...session,
          batch_name: batchMap.get(session.batch_id) || 'Unknown Batch',
        }))

        setSessions(sessionsWithBatchNames)
      }
    } catch (err) {
      console.error('Error loading sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

  const filteredSessions = filterDay === 'all'
    ? sessions
    : sessions.filter(s => s.day_of_week === filterDay)

  const groupedSessions = daysOfWeek.reduce((acc, day) => {
    acc[day] = filteredSessions.filter(s => s.day_of_week === day)
    return acc
  }, {} as Record<string, Session[]>)

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
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Clock className="w-8 h-8 text-art-indigo" />
            Class Sessions
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Weekly class schedule for all batches
          </p>
        </div>
      </div>

      {/* Filter by Day */}
      <div className="bg-white rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-5 h-5 text-art-indigo" />
          <span className="font-medium">Filter by Day:</span>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
          >
            <option value="all">All Days</option>
            {daysOfWeek.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessions by Day */}
      <div className="space-y-6">
        {daysOfWeek.map(day => {
          const daySessions = groupedSessions[day]
          if (filterDay !== 'all' && filterDay !== day) return null
          if (daySessions.length === 0 && filterDay === 'all') return null

          return (
            <div key={day} className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-art-indigo" />
                {day}
                <span className="text-sm font-normal text-gray-500">({daySessions.length} classes)</span>
              </h2>

              {daySessions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No classes scheduled for {day}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {daySessions.map(session => (
                    <div
                      key={session.id}
                      className="p-4 rounded-lg border border-gray-200 hover:border-art-indigo transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-foreground">{session.batch_name}</h3>
                        <span className="px-2 py-1 bg-art-indigo/10 text-art-indigo text-xs rounded-full">
                          {session.class_type || 'Regular'}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{session.start_time} - {session.end_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{session.duration_minutes} minutes</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {sessions.length === 0 && (
          <div className="bg-white rounded-lg border border-border p-8 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-600">No sessions configured</p>
            <p className="text-sm text-gray-500 mt-2">
              Class sessions will appear here once they are created
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
