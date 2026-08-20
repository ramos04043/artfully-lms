import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '@/lib/db-api'
import { ArrowLeft, Users, Clock, CheckCircle, AlertCircle, Save } from 'lucide-react'

interface Programme {
  id: string
  name: string
}

interface Batch {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  max_capacity: number
  programme_id: string
  is_active: boolean
  enrolled_count: number
  remaining_capacity: number
}

export default function EnrollmentPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Student form fields
  const [firstName, setFirstName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [grade, setGrade] = useState('')
  
  // Parent fields
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [relationship, setRelationship] = useState('')
  
  // Selected programme and batches
  const [selectedProgramme, setSelectedProgramme] = useState('')
  const [selectedBatches, setSelectedBatches] = useState<string[]>([])

  useEffect(() => {
    loadProgrammesAndBatches()
  }, [])

  const loadProgrammesAndBatches = async () => {
    try {
      setLoadingBatches(true)

      // Load programmes
      const { data: progData, error: progError } = await db
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
      
      setProgrammes(progData || [])

      // Select first programme by default
      if (progData && progData.length > 0) {
        setSelectedProgramme(progData[0].id)
        await loadBatchesForProgramme(progData[0].id)
      }
    } catch (err: any) {
      console.error('Error loading programmes:', err)
      setError(err.message || 'Failed to load programmes')
    } finally {
      setLoadingBatches(false)
    }
  }

  const loadBatchesForProgramme = async (programmeId: string) => {
    try {
      setLoadingBatches(true)

      // Load all batches for this programme
      const { data: batchData, error: batchError } = await db
        .from('batches')
        .select('*')
        .eq('programme_id', programmeId)
        .eq('is_active', true)
        .order('start_time')

      if (batchError) {
        console.error('Batch error:', batchError)
        const errorMsg = typeof batchError.message === 'string'
          ? batchError.message
          : batchError.message?.message || 'Failed to load batches'
        throw new Error(errorMsg)
      }

      // For each batch, count enrolled students from student_batches table
      const batchesWithCapacity = await Promise.all(
        (batchData || []).map(async (batch) => {
          // Count students in this specific batch
          const { data: studentBatches, error: enrollError } = await db
            .from('student_batches')
            .select('id', { count: 'exact', head: true })
            .eq('batch_id', batch.id)
            .eq('is_active', true)

          if (enrollError) {
            console.error('Enrollment count error:', enrollError)
          }

          // Get the count from the response
          const activeCount = studentBatches?.length || 0

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
      setLoadingBatches(false)
    }
  }

  const toggleBatchSelection = (batchId: string, dayOfWeek: string) => {
    // Check if already selected
    if (selectedBatches.includes(batchId)) {
      setSelectedBatches(selectedBatches.filter((id) => id !== batchId))
      return
    }

    // Check if same day already selected
    const selectedBatch = batches.find((b) => selectedBatches.includes(b.id))
    if (selectedBatch && selectedBatch.day_of_week === dayOfWeek) {
      setError('Cannot select two batches on the same day')
      setTimeout(() => setError(''), 3000)
      return
    }

    // Check capacity
    const batch = batches.find((b) => b.id === batchId)
    if (batch && batch.remaining_capacity <= 0) {
      setError('This batch is full')
      setTimeout(() => setError(''), 3000)
      return
    }

    setSelectedBatches([...selectedBatches, batchId])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Validation
      if (!firstName || !parentFirstName || !parentPhone) {
        throw new Error('Please fill in all required fields')
      }

      if (selectedBatches.length === 0) {
        throw new Error('Please select at least one batch')
      }

      // Generate student ID
      const studentId = `STU${Date.now().toString().slice(-8)}`

      console.log('Starting enrollment with new enrollments table...')
      console.log('Student data:', { firstName, studentId })

      // Convert batch IDs to array format for PostgreSQL
      const batchIdsArray = selectedBatches

      // Create enrollment in single table
      console.log('Inserting enrollment...')
      
      const enrollmentData = {
        student_id: studentId,
        student_first_name: firstName,
        student_last_name: '',
        student_date_of_birth: dateOfBirth || null,
        student_gender: gender || null,
        student_email: email || null,
        student_phone: phone || null,
        student_address: address || null,
        student_school_name: schoolName || null,
        student_grade: grade || null,
        parent_first_name: parentFirstName,
        parent_last_name: parentLastName || '',
        parent_email: '',
        parent_phone: parentPhone,
        parent_relationship: relationship || 'Parent',
        batch_ids: batchIdsArray,
        status: 'ACTIVE',
      }
      
      console.log('Enrollment insert data:', enrollmentData)
      
      // Call backend API instead of ZendBX directly
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/enrollment/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollmentData)
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const enrollmentResult = await response.json()
      console.log('Enrollment result:', enrollmentResult)

      if (!enrollmentResult || (Array.isArray(enrollmentResult) && enrollmentResult.length === 0)) {
        throw new Error('Failed to create enrollment - no data returned')
      }

      setSuccess('Student enrolled successfully!')
      
      // Redirect to students list
      setTimeout(() => {
        navigate('/admin/students')
      }, 1500)

    } catch (err: any) {
      console.error('Error enrolling student:', err)
      setError(err.message || 'Failed to enroll student')
    } finally {
      setLoading(false)
    }
  }

  const getBatchAvailabilityColor = (remaining: number, capacity: number) => {
    const percentage = (remaining / capacity) * 100
    if (percentage > 50) return 'border-green-300 bg-green-50'
    if (percentage > 20) return 'border-yellow-300 bg-yellow-50'
    if (percentage > 0) return 'border-orange-300 bg-orange-50'
    return 'border-red-300 bg-red-50'
  }

  const getBatchAvailabilityStatus = (remaining: number, capacity: number) => {
    const percentage = (remaining / capacity) * 100
    if (percentage > 50) return { text: 'Available', color: 'text-green-700' }
    if (percentage > 20) return { text: 'Filling Up', color: 'text-yellow-700' }
    if (percentage > 0) return { text: 'Almost Full', color: 'text-orange-700' }
    return { text: 'Full', color: 'text-red-700' }
  }

  const groupedBatches = batches.reduce((acc, batch) => {
    if (!acc[batch.day_of_week]) acc[batch.day_of_week] = []
    acc[batch.day_of_week].push(batch)
    return acc
  }, {} as Record<string, Batch[]>)

  const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/students')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Students
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Student Enrollment</h1>
        <p className="text-gray-600 mt-1">Add a new student and select their batch preferences</p>
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

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Student & Parent Info */}
          <div className="space-y-6">
            {/* Student Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Student Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Parent Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Parent/Guardian Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={parentFirstName}
                    onChange={(e) => setParentFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={parentLastName}
                    onChange={(e) => setParentLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Batch Selection */}
          <div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Select Batch Preferences
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Select preferred batch slots. Maximum 2 batches on different days.
              </p>

              {loadingBatches ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-art-indigo mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {weekdays.map((weekday) => {
                    const dayBatches = groupedBatches[weekday] || []
                    if (dayBatches.length === 0) return null

                    return (
                      <div key={weekday}>
                        <h3 className="font-medium text-gray-900 mb-2">{weekday}</h3>
                        <div className="space-y-2">
                          {dayBatches.map((batch) => {
                            const isSelected = selectedBatches.includes(batch.id)
                            const status = getBatchAvailabilityStatus(batch.remaining_capacity, batch.max_capacity)
                            const isFull = batch.remaining_capacity <= 0

                            return (
                              <button
                                key={batch.id}
                                type="button"
                                onClick={() => !isFull && toggleBatchSelection(batch.id, batch.day_of_week)}
                                disabled={isFull && !isSelected}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? 'border-art-indigo bg-art-indigo/10'
                                    : isFull
                                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                    : `${getBatchAvailabilityColor(batch.remaining_capacity, batch.max_capacity)} hover:shadow-md`
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-600" />
                                    <span className="font-medium text-gray-900">
                                      {batch.start_time} - {batch.end_time}
                                    </span>
                                  </div>
                                  {isSelected && <CheckCircle className="w-5 h-5 text-art-indigo" />}
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600">
                                      {batch.enrolled_count}/{batch.max_capacity} enrolled
                                    </span>
                                  </div>
                                  <span className={`font-medium ${status.color}`}>
                                    {status.text}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Selected Batches Summary */}
              {selectedBatches.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Selected Batches ({selectedBatches.length})
                  </p>
                  <div className="space-y-1">
                    {selectedBatches.map((batchId) => {
                      const batch = batches.find((b) => b.id === batchId)
                      if (!batch) return null
                      return (
                        <div key={batchId} className="text-sm text-gray-600">
                          � {batch.day_of_week} {batch.start_time} - {batch.end_time}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/students')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || selectedBatches.length === 0}
            className="px-6 py-3 bg-art-indigo hover:bg-art-indigo/90 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Enrolling...' : 'Enroll Student'}
          </button>
        </div>
      </form>
    </div>
  )
}
