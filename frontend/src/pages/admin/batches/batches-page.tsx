import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { Users, Clock, Plus, Edit, AlertCircle, X, Save, CheckCircle } from 'lucide-react'

interface Batch {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  max_capacity: number
  room_number: string | null
  is_active: boolean
  enrolled_count: number
  remaining_capacity: number
}

interface Programme {
  id: string
  name: string
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [batchName, setBatchName] = useState('')
  const [programmeId, setProgrammeId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [maxCapacity, setMaxCapacity] = useState('15')
  const [roomNumber, setRoomNumber] = useState('')

  useEffect(() => {
    loadProgrammes()
    loadBatches()
  }, [])

  const loadProgrammes = async () => {
    try {
      const { data, error: progError } = await db
        .from('programmes')
        .select('*')
        .eq('is_active', true)

      if (progError) {
        console.error('Programme error:', progError)
        const errorMsg = typeof progError.message === 'string'
          ? progError.message
          : progError.message?.message || 'Failed to load programmes'
        throw new Error(errorMsg)
      }
      
      setProgrammes(data || [])
      
      // Set default programme
      if (data && data.length > 0) {
        setProgrammeId(data[0].id)
      }
    } catch (err: any) {
      console.error('Error loading programmes:', err)
      setError(err.message || 'Failed to load programmes')
    }
  }

  const loadBatches = async () => {
    try {
      setLoading(true)
      setError('')

      // Load all batches
      const { data: batchData, error: batchError } = await db
        .from('batches')
        .select('*')
        .eq('is_active', true)
        .order('start_time')

      if (batchError) {
        console.error('Batch error:', batchError)
        const errorMsg = typeof batchError.message === 'string'
          ? batchError.message
          : batchError.message?.message || 'Failed to load batches'
        throw new Error(errorMsg)
      }

      // For each batch, count enrolled students
      const batchesWithCapacity = await Promise.all(
        (batchData || []).map(async (batch) => {
          // Simply count all active student_batches records
          const { data: enrollments, error: enrollError } = await db
            .from('student_batches')
            .select('id')
            .eq('batch_id', batch.id)
            .eq('is_active', true)

          if (enrollError) {
            console.error('Enrollment count error:', enrollError)
          }

          const activeCount = enrollments?.length || 0

          return {
            ...batch,
            enrolled_count: activeCount,
            remaining_capacity: batch.max_capacity - activeCount,
          }
        })
      )

      setBatches(batchesWithCapacity)
    } catch (err: any) {
      console.error('Error loading batches:', err)
      setError(err.message || 'Failed to load batches')
    } finally {
      setLoading(false)
    }
  }

  const groupedBatches = batches.reduce((acc, batch) => {
    if (!acc[batch.day_of_week]) acc[batch.day_of_week] = []
    acc[batch.day_of_week].push(batch)
    return acc
  }, {} as Record<string, Batch[]>)

  const weekdays = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ]

  const getCapacityColor = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100
    if (percentage > 50) return 'text-green-600 bg-green-50'
    if (percentage > 20) return 'text-yellow-600 bg-yellow-50'
    if (percentage > 0) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      // Validation
      if (!batchName || !programmeId || !dayOfWeek || !startTime || !endTime) {
        throw new Error('Please fill in all required fields')
      }

      if (startTime >= endTime) {
        throw new Error('End time must be after start time')
      }

      const capacity = parseInt(maxCapacity)
      if (isNaN(capacity) || capacity < 1) {
        throw new Error('Capacity must be at least 1')
      }

      // Build batch data - use HH:MM format from inputs directly
      const batchParams = {
        p_name: batchName,
        p_programme_id: programmeId,
        p_day_of_week: dayOfWeek,
        p_start_time: startTime,  // HH:MM format
        p_end_time: endTime,      // HH:MM format
        p_max_capacity: capacity,
        p_room_number: roomNumber || null,
      }

      console.log('Batch creation attempted with TIME columns')

      // ZendBX SDK limitation: Cannot handle TIME columns and no .rpc() method
      // Show SQL that user needs to run manually
      const sqlQuery = `INSERT INTO batches (name, programme_id, day_of_week, start_time, end_time, max_capacity, current_enrollment, room_number, is_active)
VALUES ('${batchName}', '${programmeId}', '${dayOfWeek}', '${startTime}:00'::time, '${endTime}:00'::time, ${capacity}, 0, ${roomNumber ? `'${roomNumber}'` : 'NULL'}, true);`

      console.log('SQL to run:', sqlQuery)
      
      throw new Error(`ZendBX SDK cannot create batches with TIME columns. Please run this SQL in your ZendBX SQL editor:\n\n${sqlQuery}`)
    } catch (err: any) {
      console.error('Error creating batch:', err)
      setError(err.message || 'Failed to create batch')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setBatchName('')
    setDayOfWeek('')
    setStartTime('')
    setEndTime('')
    setMaxCapacity('15')
    setRoomNumber('')
    if (programmes.length > 0) {
      setProgrammeId(programmes[0].id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading batches...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Weekly Timetable</h1>
            <p className="text-gray-600 mt-1">
              View and manage batch schedules and capacity
            </p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Batch
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Batches</p>
            <p className="text-2xl font-bold text-gray-900">{batches.length}</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Capacity</p>
            <p className="text-2xl font-bold text-gray-900">
              {batches.reduce((sum, b) => sum + b.max_capacity, 0)}
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Enrolled</p>
            <p className="text-2xl font-bold text-gray-900">
              {batches.reduce((sum, b) => sum + b.enrolled_count, 0)}
            </p>
          </div>
        </div>
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

      {/* Weekly Timetable */}
      <div className="space-y-6">
        {weekdays.map((weekday) => {
          const dayBatches = groupedBatches[weekday] || []
          if (dayBatches.length === 0) return null

          return (
            <div key={weekday} className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {weekday}
                <span className="ml-3 text-sm font-normal text-gray-600">
                  ({dayBatches.length} {dayBatches.length === 1 ? 'batch' : 'batches'})
                </span>
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{batch.name}</h3>
                        {batch.room_number && (
                          <p className="text-sm text-gray-600">Room {batch.room_number}</p>
                        )}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {batch.start_time} - {batch.end_time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-900">
                          {batch.enrolled_count}/{batch.max_capacity} enrolled
                        </span>
                      </div>

                      <div
                        className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${getCapacityColor(
                          batch.remaining_capacity,
                          batch.max_capacity
                        )}`}
                      >
                        {batch.remaining_capacity > 0
                          ? `${batch.remaining_capacity} ${
                              batch.remaining_capacity === 1 ? 'spot' : 'spots'
                            } available`
                          : 'Full'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {batches.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No batches found
          </h3>
          <p className="text-gray-600 mb-6">Get started by creating your first batch</p>
          <button className="inline-flex items-center gap-2 bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg transition-colors">
            <Plus className="w-5 h-5" />
            Create First Batch
          </button>
        </div>
      )}

      {/* Create Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create New Batch</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                  setError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g., Morning Batch A"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Programme <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={programmeId}
                    onChange={(e) => setProgrammeId(e.target.value)}
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

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Week <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  >
                    <option value="">Select day</option>
                    <option value="MONDAY">Monday</option>
                    <option value="TUESDAY">Tuesday</option>
                    <option value="WEDNESDAY">Wednesday</option>
                    <option value="THURSDAY">Thursday</option>
                    <option value="FRIDAY">Friday</option>
                    <option value="SATURDAY">Saturday</option>
                    <option value="SUNDAY">Sunday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
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
                  {saving ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
