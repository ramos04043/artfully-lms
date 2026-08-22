import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '@/lib/db-api'
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, 
  School, Edit, Pause, Play, X, Save, AlertCircle, CheckCircle,
  Users, Clock, FileText, Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

interface Student {
  id: string
  student_id: string  // This is the string like "STU18365652" from enrollments view
  student_first_name: string
  student_last_name: string
  student_date_of_birth: string | null
  student_gender: string | null
  student_email: string | null
  student_phone: string | null
  student_address: string | null
  student_school_name: string | null
  student_grade: string | null
  parent_first_name: string
  parent_last_name: string | null
  parent_phone: string
  parent_email: string | null
  parent_relationship: string | null
  batch_ids: string[]
  status: string
  created_at: string
  paused_at: string | null
  paused_reason: string | null
}

interface Batch {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
}

interface AvailableBatch {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  programme_id: string
}

interface AttendanceSummary {
  total_classes: number
  present: number
  absent: number
  percentage: number
}

export default function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<Student | null>(null)
  const [batches, setBatches] = useState<Batch[]>([])
  const [allBatches, setAllBatches] = useState<AvailableBatch[]>([])
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Confirmation dialog state
  const [showPauseConfirm, setShowPauseConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Editable fields
  const [editData, setEditData] = useState<Partial<Student>>({})

  useEffect(() => {
    if (id) {
      loadStudentDetails()
      loadAllBatches()
    }
  }, [id])

  const loadAllBatches = async () => {
    try {
      const { data: batchesData, error: batchesError } = await db
        .from('batches')
        .select('id, name, day_of_week, start_time, end_time, programme_id')
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })

      if (batchesError) throw batchesError
      setAllBatches((batchesData || []) as AvailableBatch[])
    } catch (err: any) {
      console.error('Error loading batches:', err)
    }
  }

  const loadStudentDetails = async () => {
    try {
      setLoading(true)
      setError('')

      // Load student from enrollments view
      const { data: studentRecords, error: studentError } = await db
        .from('enrollments')
        .select('*')
        .eq('id', id)

      const studentData = studentRecords?.[0]

      // Handle student not found without logging as error
      if (studentError) {
        if (studentError.status !== 404 && studentError.message !== 'No rows found') {
          console.error('Error loading student details:', studentError)
        }
        setStudent(null)
        setLoading(false)
        return
      }

      if (!studentData) {
        setStudent(null)
        setLoading(false)
        return
      }

      console.log('Loaded student data from enrollments:', studentData)

      // The enrollments view should have all the fields we need
      // student_id might be the string ID, so we'll need to get the UUID separately
      // for batch operations
      
      setStudent(studentData as Student)
      setEditData(studentData as Student)

      // Load batches from batch_ids array
      if (studentData.batch_ids && studentData.batch_ids.length > 0) {
        // Get batch details - fetch all batches and filter client-side
        // because .in() filter may not work correctly with the API
        const { data: allBatchDetails, error: batchError } = await db
          .from('batches')
          .select('id, name, day_of_week, start_time, end_time')
        
        if (batchError) {
          console.error('Error loading batch details:', batchError)
        }
        
        // Filter batches on the client side
        const studentBatches = (allBatchDetails || []).filter(batch => 
          studentData.batch_ids.includes(batch.id)
        )
        
        setBatches(studentBatches as Batch[])
      } else {
        setBatches([])
      }

      // Load attendance summary using student_id (the string like "STU18365652")
      const { data: attendanceData } = await db
        .from('attendance')
        .select('status')
        .eq('student_id', studentData.student_id)

      if (attendanceData) {
        const total = attendanceData.length
        const present = attendanceData.filter(
          (a) => a.status === 'PRESENT' || a.status === 'COMPENSATION_PRESENT'
        ).length
        const absent = attendanceData.filter((a) => a.status === 'ABSENT').length
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0

        setAttendance({ total_classes: total, present, absent, percentage })
      }
    } catch (err: any) {
      // Only log unexpected errors
      console.error('Unexpected error loading student details:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      // Update basic student info (these fields exist in students table through the view)
      const { error: updateError } = await db
        .from('enrollments')
        .update({
          student_first_name: editData.student_first_name,
          student_last_name: editData.student_last_name,
          student_date_of_birth: editData.student_date_of_birth,
          student_gender: editData.student_gender,
          student_email: editData.student_email,
          student_phone: editData.student_phone,
          student_address: editData.student_address,
          student_school_name: editData.student_school_name,
          student_grade: editData.student_grade,
          parent_first_name: editData.parent_first_name,
          parent_last_name: editData.parent_last_name,
          parent_relationship: editData.parent_relationship,
          parent_phone: editData.parent_phone,
          parent_email: editData.parent_email,
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Handle batch changes by updating the batch_ids array in enrollments table
      // The enrollments table stores batch_ids as an array, so we just update that directly
      if (student && editData.batch_ids) {
        const originalBatchIds = student.batch_ids || []
        const newBatchIds = editData.batch_ids
        
        // Check if batches have changed
        const batchesChanged = JSON.stringify(originalBatchIds.sort()) !== JSON.stringify(newBatchIds.sort())
        
        if (batchesChanged) {
          console.log('Updating batch_ids from:', originalBatchIds, 'to:', newBatchIds)
          
          // Update the batch_ids array in enrollments table
          const { error: batchUpdateError } = await db
            .from('enrollments')
            .update({ batch_ids: newBatchIds })
            .eq('id', id)
            .execute()
          
          if (batchUpdateError) {
            console.error('Error updating batches:', batchUpdateError)
            throw new Error(`Failed to update batches: ${batchUpdateError.message || batchUpdateError}`)
          }
          
          console.log('Successfully updated batch_ids')
        }
      }

      setSuccess('Student details updated successfully')
      setIsEditing(false)
      await loadStudentDetails()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating student:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleBatchToggle = (batchId: string) => {
    const currentBatchIds = editData.batch_ids || []
    const isSelected = currentBatchIds.includes(batchId)
    
    const newBatchIds = isSelected
      ? currentBatchIds.filter(id => id !== batchId)
      : [...currentBatchIds, batchId]
    
    setEditData({ ...editData, batch_ids: newBatchIds })
  }

  const handlePauseResume = async () => {
    if (!student) return

    try {
      setSaving(true)
      setShowPauseConfirm(false)
      const isPaused = student.status === 'PAUSED'
      const newStatus = isPaused ? 'ACTIVE' : 'PAUSED'

      console.log(`Updating enrollment ${id} status from ${student.status} to ${newStatus}`)

      // Call the backend API endpoint for status update
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/enrollment/enrollments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          paused_reason: isPaused ? null : 'Paused by admin'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('Status update result:', result)

      setSuccess(isPaused ? 'Student resumed successfully' : 'Student paused successfully')
      await loadStudentDetails()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error pausing/resuming student:', err)
      setError(err.message || 'Failed to update student status')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!student) return

    try {
      setDeleting(true)
      setShowDeleteConfirm(false)
      setError('')

      console.log('🗑️ Deleting student enrollment:', id)

      // Delete the enrollment record
      const { error: deleteError } = await db
        .from('enrollments')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw new Error(deleteError.message || 'Failed to delete student')
      }

      console.log('✅ Student deleted successfully')
      
      // Navigate back to students list
      navigate('/admin/students')
    } catch (err: any) {
      console.error('Error deleting student:', err)
      setError(err.message || 'Failed to delete student')
      setDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'LEFT':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'GRADUATED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student details...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Student Not Found</h2>
          <p className="text-gray-600 mb-4">The student you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/students')}
            className="text-art-indigo hover:text-art-indigo/80 font-medium"
          >
            ? Back to Students
          </button>
        </div>
      </div>
    )
  }

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

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-art-indigo/10 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-art-indigo">
                {student.student_first_name[0]}
                {student.student_last_name[0]}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {student.student_first_name} {student.student_last_name}
              </h1>
              <p className="text-gray-600 mt-1">{student.student_id}</p>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mt-2 ${getStatusColor(
                  student.status
                )}`}
              >
                {student.status}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditData(student)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-art-indigo hover:bg-art-indigo/90 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowPauseConfirm(true)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    student.status === 'PAUSED'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  {student.status === 'PAUSED' ? (
                    <>
                      <Play className="w-4 h-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Student Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Personal Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.student_first_name || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, student_first_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{student.student_first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.student_last_name || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, student_last_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{student.student_last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editData.student_date_of_birth || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, student_date_of_birth: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">
                    {student.student_date_of_birth
                      ? format(new Date(student.student_date_of_birth), 'MMM dd, yyyy')
                      : 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                {isEditing ? (
                  <select
                    value={editData.student_gender || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, student_gender: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{student.student_gender || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editData.student_email || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, student_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{student.student_email || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.student_phone || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, student_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{student.student_phone || 'Not provided'}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                {isEditing ? (
                  <textarea
                    value={editData.student_address || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, student_address: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{student.student_address || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <School className="w-4 h-4" />
                  School
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.student_school_name || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, student_school_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{student.student_school_name || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.student_grade || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, student_grade: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{student.student_grade || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Parents/Guardians */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Parent/Guardian Information
            </h2>

            {!student.parent_first_name && !student.parent_phone ? (
              <p className="text-gray-600">No parent information available</p>
            ) : isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editData.parent_first_name || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, parent_first_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editData.parent_last_name || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, parent_last_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship
                  </label>
                  <select
                    value={editData.parent_relationship || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, parent_relationship: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editData.parent_phone || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, parent_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={editData.parent_email || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, parent_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-3">
                  {student.parent_first_name && (
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">
                        {student.parent_first_name} {student.parent_last_name || ''}
                      </p>
                    </div>
                  )}
                  {student.parent_relationship && (
                    <div>
                      <p className="text-sm text-gray-600">Relationship</p>
                      <p className="font-medium text-gray-900">{student.parent_relationship}</p>
                    </div>
                  )}
                  {student.parent_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-900">{student.parent_phone}</span>
                    </div>
                  )}
                  {student.parent_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-900">{student.parent_email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Summary Cards */}
        <div className="space-y-6">
          {/* Enrollment Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Enrollment
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Enrolled On</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(student.created_at), 'MMM dd, yyyy')}
                </p>
              </div>
              {student.paused_at && (
                <div>
                  <p className="text-gray-600">Paused On</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(student.paused_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Batches */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Assigned Batches
            </h3>
            {isEditing ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  Select batches for this student
                </p>
                {allBatches.length === 0 ? (
                  <p className="text-sm text-gray-500">No batches available</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allBatches.map((batch) => {
                      const isSelected = editData.batch_ids?.includes(batch.id) || false
                      return (
                        <label
                          key={batch.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-art-indigo bg-art-indigo/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleBatchToggle(batch.id)}
                            className="mt-1 w-4 h-4 text-art-indigo border-gray-300 rounded focus:ring-art-indigo"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {batch.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {batch.day_of_week} • {batch.start_time} - {batch.end_time}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : batches.length === 0 ? (
              <p className="text-sm text-gray-600">No batches assigned</p>
            ) : (
              <div className="space-y-2">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <p className="font-medium text-gray-900 text-sm">
                      {batch.name || batch.day_of_week}
                    </p>
                    <p className="text-xs text-gray-600">
                      {batch.start_time} - {batch.end_time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Attendance Summary
            </h3>
            {attendance ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Classes</span>
                  <span className="font-semibold text-gray-900">
                    {attendance.total_classes}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Present</span>
                  <span className="font-semibold text-green-600">
                    {attendance.present}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Absent</span>
                  <span className="font-semibold text-red-600">
                    {attendance.absent}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Attendance Rate</span>
                    <span className="font-semibold text-gray-900">
                      {attendance.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-art-indigo rounded-full h-2 transition-all"
                      style={{ width: `${attendance.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">No attendance data</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Pause/Resume Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showPauseConfirm}
        onClose={() => setShowPauseConfirm(false)}
        onConfirm={handlePauseResume}
        title={student?.status === 'PAUSED' ? 'Resume Student?' : 'Pause Student?'}
        message={
          student?.status === 'PAUSED'
            ? `Are you sure you want to resume ${student.student_first_name}? They will be marked as active and can attend classes again.`
            : `Are you sure you want to pause ${student?.student_first_name}? They will not be able to attend classes until resumed.`
        }
        confirmText={student?.status === 'PAUSED' ? 'Resume' : 'Pause'}
        variant={student?.status === 'PAUSED' ? 'info' : 'warning'}
        loading={saving}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteStudent}
        title="Delete Student?"
        message={
          student
            ? `Are you sure you want to delete ${student.student_first_name} ${student.student_last_name}? This will permanently remove their enrollment record, including all attendance history and batch assignments. This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
