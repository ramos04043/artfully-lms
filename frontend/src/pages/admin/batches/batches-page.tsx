import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { Users, Clock, Plus, Edit, AlertCircle, X, Save, CheckCircle, Search } from 'lucide-react'
import { format } from 'date-fns'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

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

interface BatchStudent {
  id: string
  student_id: string
  student_first_name: string
  student_last_name: string
  status: string
  batch_ids: string[]
  student_grade: string  // To identify FOUNDATION vs ADVANCED
}

interface AdvancedStudent {
  id: string
  student_id: string
  student_first_name: string
  student_last_name: string
  status: string
  days: string[]  // Days they attend (stored in student_school_name field)
  grade: string
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Tab state for Foundation vs Advanced
  const [activeTab, setActiveTab] = useState<'foundation' | 'advanced'>('foundation')
  
  // Student view states
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [batchStudents, setBatchStudents] = useState<BatchStudent[]>([])
  const [advancedStudents, setAdvancedStudents] = useState<AdvancedStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [allBatches, setAllBatches] = useState<Batch[]>([])
  const [reassigningStudent, setReassigningStudent] = useState<string | null>(null)
  
  // Advanced students modal
  const [showAdvancedModal, setShowAdvancedModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string>('')
  
  // Confirmation dialog state
  const [showAssignConfirm, setShowAssignConfirm] = useState(false)
  const [showReassignConfirm, setShowReassignConfirm] = useState(false)
  const [pendingAssignment, setPendingAssignment] = useState<{
    enrollmentId: string
    student: BatchStudent
    batchId: string
  } | null>(null)
  
  // Removed add student functionality - use student detail page for batch assignment

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
    if (activeTab === 'advanced') {
      loadAdvancedStudents()
    }
  }, [activeTab])

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

      // For each batch, count enrolled students from enrollments table
      // First, get all enrollments once
      const { data: allEnrollments } = await db
        .from('enrollments')
        .select('id, batch_ids, status')
      
      const batchesWithCapacity = (batchData || []).map(batch => {
        // Count students who have this batch in their batch_ids array and are active
        const activeCount = (allEnrollments || []).filter(enrollment => 
          enrollment.batch_ids && 
          enrollment.batch_ids.includes(batch.id) &&
          enrollment.status === 'ACTIVE'
        ).length

        return {
          ...batch,
          enrolled_count: activeCount,
          remaining_capacity: batch.max_capacity - activeCount,
        }
      })

      setBatches(batchesWithCapacity)
      setAllBatches(batchesWithCapacity) // Store for batch reassignment dropdown
    } catch (err: any) {
      console.error('Error loading batches:', err)
      setError(err.message || 'Failed to load batches')
    } finally {
      setLoading(false)
    }
  }

  const loadAdvancedStudents = async () => {
    try {
      setLoading(true)
      setError('')

      // Load all ADVANCED students
      const { data: enrollments, error } = await db
        .from('enrollments')
        .select('*')
        .eq('status', 'ACTIVE')

      if (error) {
        console.error('Error loading advanced students:', error)
        throw error
      }

      // Filter for ADVANCED students (student_grade starts with "ADVANCED|")
      const advancedList: AdvancedStudent[] = (enrollments || [])
        .filter(e => e.student_grade && e.student_grade.startsWith('ADVANCED|'))
        .map(e => ({
          id: e.id,
          student_id: e.student_id,
          student_first_name: e.student_first_name,
          student_last_name: e.student_last_name,
          status: e.status,
          days: e.student_school_name ? e.student_school_name.split(',') : [],
          grade: e.student_grade ? e.student_grade.split('|')[1] : '',
        }))

      setAdvancedStudents(advancedList)
    } catch (err: any) {
      console.error('Error loading advanced students:', err)
      setError(err.message || 'Failed to load advanced students')
    } finally {
      setLoading(false)
    }
  }

  const handleBatchClick = async (batch: Batch) => {
    setSelectedBatch(batch)
    setLoadingStudents(true)
    setBatchStudents([])
    
    try {
      // Get ALL active enrollments (not just ones assigned to this batch)
      const { data: allEnrollments, error: enrollError } = await db
        .from('enrollments')
        .select('*')
        .eq('status', 'ACTIVE')
      
      console.log('📊 Batch clicked:', batch.name, batch.id)
      console.log('📊 Total active students found:', allEnrollments?.length || 0)
      
      if (enrollError) {
        console.error('❌ Error fetching enrollments:', enrollError)
        throw enrollError
      }
      
      // Show ALL active students, not just ones in this batch
      setBatchStudents((allEnrollments || []) as BatchStudent[])
    } catch (err) {
      console.error('Error loading students:', err)
      setError('Failed to load students')
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleAssignStudent = async (studentEnrollmentId: string, student: BatchStudent, newBatchId: string) => {
    setReassigningStudent(studentEnrollmentId)
    setShowAssignConfirm(false)
    try {
      // Find the target batch
      const targetBatch = allBatches.find(b => b.id === newBatchId)
      if (!targetBatch) {
        throw new Error('Target batch not found')
      }
      
      if (targetBatch.remaining_capacity <= 0) {
        throw new Error(`Cannot assign student: ${targetBatch.name} is at full capacity`)
      }
      
      // Get current enrollment record
      const { data: enrollmentData, error: fetchError } = await db
        .from('enrollments')
        .select('*')
        .eq('id', studentEnrollmentId)
      
      if (fetchError) throw fetchError
      if (!enrollmentData || enrollmentData.length === 0) throw new Error('Student not found')
      
      const enrollment = enrollmentData[0]
      
      // Add batch to batch_ids array
      const currentBatchIds = enrollment.batch_ids || []
      
      // Check if already in target batch
      if (currentBatchIds.includes(newBatchId)) {
        throw new Error('Student is already enrolled in this batch')
      }
      
      const newBatchIds = [...currentBatchIds, newBatchId]
      
      // Update enrollment with new batch_ids
      const { error: updateError } = await db
        .from('enrollments')
        .update({ batch_ids: newBatchIds })
        .eq('id', studentEnrollmentId)
      
      if (updateError) throw updateError
      
      setSuccess(
        `Successfully assigned ${student.student_first_name} ${student.student_last_name} to ${targetBatch.name}`
      )
      
      // Reload students and update batch counts
      await handleBatchClick(selectedBatch!)
      await loadBatches()
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      console.error('Error assigning student:', err)
      setError(err.message || 'Failed to assign student')
      setTimeout(() => setError(''), 5000)
    } finally {
      setReassigningStudent(null)
      setPendingAssignment(null)
    }
  }

  const confirmAssignStudent = (studentEnrollmentId: string, student: BatchStudent, newBatchId: string) => {
    setPendingAssignment({ enrollmentId: studentEnrollmentId, student, batchId: newBatchId })
    setShowAssignConfirm(true)
  }

  const handleReassignStudent = async (studentEnrollmentId: string, student: BatchStudent, newBatchId: string) => {
    if (!selectedBatch) return
    
    setReassigningStudent(studentEnrollmentId)
    setShowReassignConfirm(false)
    try {
      // Prevent reassigning to the same batch
      if (selectedBatch.id === newBatchId) {
        throw new Error('Student is already in this batch')
      }
      
      // Find the target batch to check capacity
      const targetBatch = allBatches.find(b => b.id === newBatchId)
      if (!targetBatch) {
        throw new Error('Target batch not found')
      }
      
      if (targetBatch.remaining_capacity <= 0) {
        throw new Error(`Cannot move student: ${targetBatch.name} is at full capacity`)
      }
      
      // Get current enrollment record
      const { data: enrollmentData, error: fetchError } = await db
        .from('enrollments')
        .select('*')
        .eq('id', studentEnrollmentId)
      
      if (fetchError) throw fetchError
      if (!enrollmentData || enrollmentData.length === 0) throw new Error('Student not found')
      
      const enrollment = enrollmentData[0]
      
      // Update batch_ids array: remove old batch, add new batch
      const currentBatchIds = enrollment.batch_ids || []
      const newBatchIds = currentBatchIds.filter((id: string) => id !== selectedBatch.id)
      
      // Check if already in target batch
      if (currentBatchIds.includes(newBatchId)) {
        throw new Error('Student is already enrolled in the target batch')
      }
      
      newBatchIds.push(newBatchId)
      
      // Update enrollment with new batch_ids
      const { error: updateError } = await db
        .from('enrollments')
        .update({ batch_ids: newBatchIds })
        .eq('id', studentEnrollmentId)
      
      if (updateError) throw updateError
      
      setSuccess(
        `Successfully moved ${student.student_first_name} ${student.student_last_name} from ${selectedBatch.name} to ${targetBatch.name}`
      )
      
      // Reload students for current batch and update batch counts
      await handleBatchClick(selectedBatch)
      await loadBatches()
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      console.error('Error reassigning student:', err)
      setError(err.message || 'Failed to reassign student')
      setTimeout(() => setError(''), 5000)
    } finally {
      setReassigningStudent(null)
      setPendingAssignment(null)
    }
  }

  const confirmReassignStudent = (studentEnrollmentId: string, student: BatchStudent, newBatchId: string) => {
    setPendingAssignment({ enrollmentId: studentEnrollmentId, student, batchId: newBatchId })
    setShowReassignConfirm(true)
  }

  const closeStudentModal = () => {
    setSelectedBatch(null)
    setBatchStudents([])
  }

  // Removed add student functions - batch assignment should be done from student detail page

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
      if (!programmeId || !dayOfWeek || !startTime || !endTime) {
        throw new Error('Please fill in all required fields')
      }

      if (startTime >= endTime) {
        throw new Error('End time must be after start time')
      }

      const capacity = parseInt(maxCapacity)
      if (isNaN(capacity) || capacity < 1) {
        throw new Error('Capacity must be at least 1')
      }

      // Auto-generate batch name based on day of week if not provided
      let finalBatchName = batchName.trim()
      if (!finalBatchName) {
        // Count existing batches for this day to generate sequential number
        const existingBatchesForDay = batches.filter(b => b.day_of_week === dayOfWeek)
        const batchNumber = existingBatchesForDay.length + 1
        const dayName = dayOfWeek.charAt(0) + dayOfWeek.slice(1).toLowerCase()
        finalBatchName = `${dayName} Batch ${batchNumber}`
      }

      // Build batch data - use HH:MM format from inputs directly
      const batchParams = {
        p_name: finalBatchName,
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
VALUES ('${finalBatchName}', '${programmeId}', '${dayOfWeek}', '${startTime}:00'::time, '${endTime}:00'::time, ${capacity}, 0, ${roomNumber ? `'${roomNumber}'` : 'NULL'}, true);`

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
            <h1 className="text-3xl font-bold text-gray-900">Class Schedule & Students</h1>
            <p className="text-gray-600 mt-1">
              Manage Foundation batches and Advanced students
            </p>
          </div>
          {activeTab === 'foundation' && (
            <button 
              onClick={() => setShowModal(true)}
              className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Batch
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('foundation')}
            className={`pb-3 px-4 font-medium transition-colors relative ${
              activeTab === 'foundation'
                ? 'text-art-indigo border-b-2 border-art-indigo'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Foundation Batches
            <span className="ml-2 text-sm">({batches.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`pb-3 px-4 font-medium transition-colors relative ${
              activeTab === 'advanced'
                ? 'text-art-indigo border-b-2 border-art-indigo'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Advanced Students
            <span className="ml-2 text-sm">({advancedStudents.length})</span>
          </button>
        </div>

        {/* Summary Stats - Foundation */}
        {activeTab === 'foundation' && (
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
        )}

        {/* Summary Stats - Advanced */}
        {activeTab === 'advanced' && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{advancedStudents.length}</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Available Days</p>
              <p className="text-2xl font-bold text-gray-900">6</p>
              <p className="text-xs text-gray-500 mt-1">Mon, Wed-Sun</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {advancedStudents.reduce((sum, s) => sum + s.days.length, 0)}
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

      {/* Weekly Timetable - Foundation Batches */}
      {activeTab === 'foundation' && (
        <>
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
                        onClick={() => handleBatchClick(batch)}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:shadow-md hover:border-art-indigo transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{batch.name}</h3>
                            {batch.room_number && (
                              <p className="text-sm text-gray-600">Room {batch.room_number}</p>
                            )}
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              // Edit functionality can be added here
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
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
                          
                          <div className="text-xs text-gray-500 mt-2 text-center">
                            Click to view students
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
        </>
      )}

      {/* Advanced Students View */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {/* Group by day */}
          {['MONDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => {
            const studentsForDay = advancedStudents.filter(s => s.days.includes(day))
            if (studentsForDay.length === 0) return null

            return (
              <div key={day} className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {day}
                  <span className="ml-3 text-sm font-normal text-gray-600">
                    ({studentsForDay.length} {studentsForDay.length === 1 ? 'student' : 'students'})
                  </span>
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentsForDay.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50/30"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                          <span className="text-purple-700 font-semibold text-lg">
                            {student.student_first_name[0]}
                            {student.student_last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {student.student_first_name} {student.student_last_name}
                          </p>
                          <p className="text-sm text-gray-600">{student.student_id}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600">Grade:</span>{' '}
                          <span className="font-medium text-gray-900">{student.grade || 'N/A'}</span>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-600">Attending:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {student.days.map((d) => (
                              <span
                                key={d}
                                className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                              >
                                {d.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {advancedStudents.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No advanced students found
              </h3>
              <p className="text-gray-600">Advanced students will appear here once enrolled</p>
            </div>
          )}
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
                    Batch Name <span className="text-gray-500 text-xs">(optional - auto-generated if empty)</span>
                  </label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Leave empty to auto-generate (e.g., Monday Batch 1)"
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

      {/* Batch Students Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedBatch.name}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedBatch.day_of_week} • {selectedBatch.start_time} - {selectedBatch.end_time}
                  {selectedBatch.room_number && ` • Room ${selectedBatch.room_number}`}
                </p>
              </div>
              <button
                onClick={closeStudentModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Student Assignments
                </h3>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {batchStudents.filter(s => s.batch_ids?.includes(selectedBatch.id)).length} in this batch
                  </span>
                  <span className="px-3 py-1 bg-art-indigo/10 text-art-indigo rounded-full text-sm font-medium">
                    {batchStudents.length} total students
                  </span>
                  <span className="text-sm text-gray-600">
                    {selectedBatch.remaining_capacity} spots available
                  </span>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> All active students are shown below. Use the dropdown to assign or change batch assignments.
                </p>
              </div>

              {loadingStudents ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-art-indigo mx-auto mb-3"></div>
                  <p className="text-gray-600">Loading students...</p>
                </div>
              ) : batchStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-lg">No active students found</p>
                  <p className="text-sm text-gray-500 mt-2">Enroll students to manage their batches</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batchStudents.map((student) => {
                    // Check if student is currently in the selected batch
                    const isInSelectedBatch = student.batch_ids?.includes(selectedBatch.id)
                    // Get student's current batch assignment (first batch in array)
                    const currentBatchId = student.batch_ids?.[0] || null
                    
                    return (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                          isInSelectedBatch 
                            ? 'border-art-indigo bg-art-indigo/5' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-art-indigo/10 rounded-full flex items-center justify-center">
                            <span className="text-art-indigo font-semibold">
                              {student.student_first_name[0]}
                              {student.student_last_name[0]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {student.student_first_name} {student.student_last_name}
                              </p>
                              {isInSelectedBatch && (
                                <span className="px-2 py-0.5 bg-art-indigo text-white text-xs rounded-full">
                                  In This Batch
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{student.student_id}</p>
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
                        
                        <div className="ml-4 min-w-[240px]">
                          <label className="text-xs text-gray-600 block mb-1">
                            {currentBatchId ? 'Change Batch:' : 'Assign to Batch:'}
                          </label>
                          <select
                            value={currentBatchId || ''}
                            onChange={(e) => {
                              const newBatchId = e.target.value
                              if (newBatchId && newBatchId !== currentBatchId) {
                                // If student has a batch, change it. If not, assign new batch
                                if (currentBatchId) {
                                  confirmReassignStudent(student.id, student, newBatchId)
                                } else {
                                  confirmAssignStudent(student.id, student, newBatchId)
                                }
                              }
                            }}
                            disabled={reassigningStudent === student.id}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-art-indigo focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {!currentBatchId && <option value="">-- Not Assigned --</option>}
                            <optgroup label="Same Day Batches">
                              {allBatches
                                .filter(b => b.day_of_week === selectedBatch.day_of_week)
                                .map((batch) => (
                                  <option key={batch.id} value={batch.id}>
                                    {batch.name} • {batch.start_time} • {batch.remaining_capacity} spots
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="Other Day Batches">
                              {allBatches
                                .filter(b => b.day_of_week !== selectedBatch.day_of_week)
                                .map((batch) => (
                                  <option key={batch.id} value={batch.id}>
                                    {batch.name} • {batch.day_of_week} • {batch.start_time} • {batch.remaining_capacity} spots
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          {reassigningStudent === student.id && (
                            <p className="text-xs text-art-indigo mt-1 flex items-center gap-1">
                              <span className="inline-block w-3 h-3 border-2 border-art-indigo border-t-transparent rounded-full animate-spin"></span>
                              Processing...
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                💡 <strong>Tip:</strong> Use the dropdown to move students between batches. Changes are immediate.
              </p>
              <button
                onClick={closeStudentModal}
                className="px-6 py-2 bg-art-indigo hover:bg-art-indigo/90 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showAssignConfirm}
        onClose={() => {
          setShowAssignConfirm(false)
          setPendingAssignment(null)
        }}
        onConfirm={() => {
          if (pendingAssignment) {
            handleAssignStudent(
              pendingAssignment.enrollmentId,
              pendingAssignment.student,
              pendingAssignment.batchId
            )
          }
        }}
        title="Assign Student to Batch?"
        message={
          pendingAssignment
            ? `Are you sure you want to assign ${pendingAssignment.student.student_first_name} ${pendingAssignment.student.student_last_name} to ${allBatches.find(b => b.id === pendingAssignment.batchId)?.name}?`
            : ''
        }
        confirmText="Assign"
        variant="info"
        loading={reassigningStudent === pendingAssignment?.enrollmentId}
      />
      
      <ConfirmationDialog
        isOpen={showReassignConfirm}
        onClose={() => {
          setShowReassignConfirm(false)
          setPendingAssignment(null)
        }}
        onConfirm={() => {
          if (pendingAssignment) {
            handleReassignStudent(
              pendingAssignment.enrollmentId,
              pendingAssignment.student,
              pendingAssignment.batchId
            )
          }
        }}
        title="Change Student Batch?"
        message={
          pendingAssignment && selectedBatch
            ? `Are you sure you want to move ${pendingAssignment.student.student_first_name} ${pendingAssignment.student.student_last_name} from ${selectedBatch.name} to ${allBatches.find(b => b.id === pendingAssignment.batchId)?.name}?`
            : ''
        }
        confirmText="Change Batch"
        variant="warning"
        loading={reassigningStudent === pendingAssignment?.enrollmentId}
      />
    </div>
  )
}
