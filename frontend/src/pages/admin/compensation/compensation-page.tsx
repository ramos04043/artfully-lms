import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { format } from 'date-fns'
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Filter, Users } from 'lucide-react'

interface Compensation {
  id: string
  student_id: string
  original_attendance_id: string
  original_batch_id: string
  original_date: string
  compensation_batch_id?: string
  compensation_date?: string
  status: string
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
}

interface EnrollmentInfo {
  id: string
  student_id: string
  student_first_name: string
  student_last_name: string
  student_phone: string
  status: string
}

interface BatchInfo {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
}

export default function CompensationPage() {
  const [compensations, setCompensations] = useState<Compensation[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentInfo[]>([])
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_APPROVAL')

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Assignment modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedCompensation, setSelectedCompensation] = useState<Compensation | null>(null)
  const [assignmentBatchId, setAssignmentBatchId] = useState('')
  const [assignmentDate, setAssignmentDate] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load enrollments
      const { data: enrollmentsData, error: enrollError } = await db
        .from('enrollments')
        .select('id, student_id, student_first_name, student_last_name, student_phone, status')

      if (enrollError) throw enrollError
      setEnrollments(enrollmentsData || [])

      // Load batches
      const { data: batchesData, error: batchError } = await db
        .from('batches')
        .select('id, name, day_of_week, start_time, end_time')
        .eq('is_active', true)

      if (batchError) throw batchError
      setBatches(batchesData || [])

      // Load compensations
      await loadCompensations()
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadCompensations = async () => {
    try {
      let query = db
        .from('compensations')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data: compensationsData, error: compensationsError } = await query

      if (compensationsError) throw compensationsError
      setCompensations(compensationsData || [])
    } catch (err: any) {
      console.error('Error loading compensations:', err)
      setError(err.message || 'Failed to load compensations')
    }
  }

  useEffect(() => {
    if (!loading) {
      loadCompensations()
    }
  }, [filterStatus])

  const handleApprove = async (compensationId: string) => {
    // Open assignment modal instead of direct approval
    const comp = compensations.find(c => c.id === compensationId)
    if (comp) {
      setSelectedCompensation(comp)
      setAssignModalOpen(true)
    }
  }

  const handleAssignCompensation = async () => {
    if (!selectedCompensation || !assignmentBatchId || !assignmentDate) {
      setError('Please select both batch and date')
      return
    }

    try {
      setActionLoading(selectedCompensation.id)
      setError('')
      setSuccess('')

      // Call backend API to assign compensation
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/compensations/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compensation_id: selectedCompensation.id,
          compensation_batch_id: assignmentBatchId,
          compensation_date: assignmentDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to assign compensation')
      }

      setSuccess('Compensation assigned successfully! Student will be notified.')
      await loadCompensations()
      
      // Reset modal
      setAssignModalOpen(false)
      setSelectedCompensation(null)
      setAssignmentBatchId('')
      setAssignmentDate('')

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error assigning compensation:', err)
      setError(err.message || 'Failed to assign compensation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (compensationId: string) => {
    try {
      const reason = prompt('Enter rejection reason:')
      if (!reason) return

      setActionLoading(compensationId)
      setError('')
      setSuccess('')

      // Call backend API to reject
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/compensations/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compensation_id: compensationId,
          rejection_reason: reason,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to reject compensation')
      }

      setSuccess('Compensation rejected successfully!')
      await loadCompensations()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error rejecting compensation:', err)
      setError(err.message || 'Failed to reject compensation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkAttended = async (compensationId: string, studentId: string, batchId: string, date: string) => {
    try {
      setActionLoading(compensationId)
      setError('')
      setSuccess('')

      // Create attendance record
      const attendanceRecord = {
        student_id: studentId,
        batch_id: batchId,
        class_date: date,
        status: 'COMPENSATION_PRESENT',
        attendance_type: 'COMPENSATION',
        marked_at: new Date().toISOString(),
      }

      // Use direct fetch API
      const response = await fetch('https://api.zendbx.in/p/artschoollms/v1/rest/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_ZENDBX_SERVICE_KEY}`,
          'apikey': import.meta.env.VITE_ZENDBX_SERVICE_KEY,
        },
        body: JSON.stringify(attendanceRecord),
      })

      if (!response.ok) {
        throw new Error('Failed to create attendance record')
      }

      const attendanceData = await response.json()
      const attendanceId = attendanceData[0]?.id

      // Update compensation status to ATTENDED
      const { error: updateError } = await db
        .from('compensations')
        .update({
          status: 'ATTENDED',
          attendance_id: attendanceId,
        })
        .eq('id', compensationId)

      if (updateError) throw updateError

      setSuccess('Compensation marked as attended!')
      await loadCompensations()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error marking attended:', err)
      setError(err.message || 'Failed to mark as attended')
    } finally {
      setActionLoading(null)
    }
  }

  // Get student info
  const getStudentInfo = (studentId: string) => {
    // student_id in compensations is now the student code (e.g., "ART1002"), not UUID
    // so we match against enrollment.student_id
    console.log('Looking up student:', studentId, 'in', enrollments.length, 'enrollments')
    console.log('Enrollments:', enrollments.map(e => e.student_id))
    const enrollment = enrollments.find((e) => e.student_id === studentId)
    console.log('Found enrollment:', enrollment)
    if (enrollment) {
      return {
        name: `${enrollment.student_first_name} ${enrollment.student_last_name}`,
        studentId: enrollment.student_id,
        phone: enrollment.student_phone,
      }
    }
    return {
      name: 'Unknown Student',
      studentId: studentId,
      phone: '-',
    }
  }

  // Get batch info
  const getBatchInfo = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId)
    if (batch) {
      return `${batch.name} (${batch.day_of_week} ${batch.start_time}-${batch.end_time})`
    }
    return 'Unknown Batch'
  }

  // Calculate stats
  const stats = {
    pending: compensations.filter((c) => c.status === 'PENDING_APPROVAL').length,
    assigned: compensations.filter((c) => c.status === 'ASSIGNED').length,
    attended: compensations.filter((c) => c.status === 'ATTENDED').length,
    rejected: compensations.filter((c) => c.status === 'REJECTED').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading compensations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Compensation Classes</h1>
        <p className="text-gray-600">Manage makeup classes for absent students</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Assigned</p>
              <p className="text-3xl font-bold text-blue-600">{stats.assigned}</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Attended</p>
              <p className="text-3xl font-bold text-green-600">{stats.attended}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rejected</p>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filter by Status</h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {[
            { value: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'yellow' },
            { value: 'ASSIGNED', label: 'Assigned', color: 'blue' },
            { value: 'ATTENDED', label: 'Attended', color: 'green' },
            { value: 'REJECTED', label: 'Rejected', color: 'red' },
            { value: 'all', label: 'All Status', color: 'gray' },
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setFilterStatus(status.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status.value
                  ? `bg-${status.color}-600 text-white`
                  : `bg-${status.color}-100 text-${status.color}-700 hover:bg-${status.color}-200`
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compensations List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compensation Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compensation Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {compensations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No compensation requests found</p>
                      <p className="text-sm mt-1">Requests will appear when students are marked absent</p>
                    </div>
                  </td>
                </tr>
              ) : (
                compensations.map((compensation) => {
                  const studentInfo = getStudentInfo(compensation.student_id)
                  const originalBatchInfo = getBatchInfo(compensation.original_batch_id)
                  const compBatchInfo = compensation.compensation_batch_id
                    ? getBatchInfo(compensation.compensation_batch_id)
                    : '-'

                  return (
                    <tr key={compensation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{studentInfo.name}</div>
                        <div className="text-xs text-gray-500">{studentInfo.studentId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{originalBatchInfo}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(compensation.original_date), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{compBatchInfo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {compensation.compensation_date
                            ? format(new Date(compensation.compensation_date), 'MMM dd, yyyy')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            compensation.status === 'PENDING_APPROVAL'
                              ? 'bg-yellow-100 text-yellow-800'
                              : compensation.status === 'ASSIGNED'
                              ? 'bg-blue-100 text-blue-800'
                              : compensation.status === 'ATTENDED'
                              ? 'bg-green-100 text-green-800'
                              : compensation.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {compensation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {compensation.status === 'PENDING_APPROVAL' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(compensation.id)}
                              disabled={actionLoading === compensation.id}
                              className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(compensation.id)}
                              disabled={actionLoading === compensation.id}
                              className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {compensation.status === 'ASSIGNED' &&
                          compensation.compensation_batch_id &&
                          compensation.compensation_date && (
                            <button
                              onClick={() =>
                                handleMarkAttended(
                                  compensation.id,
                                  compensation.student_id,
                                  compensation.compensation_batch_id!,
                                  compensation.compensation_date!
                                )
                              }
                              disabled={actionLoading === compensation.id}
                              className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                            >
                              Mark Attended
                            </button>
                          )}
                        {compensation.status === 'REJECTED' && compensation.rejection_reason && (
                          <div className="text-xs text-gray-500 max-w-xs">
                            Reason: {compensation.rejection_reason}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Records Count */}
      {compensations.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {compensations.length} compensation{compensations.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Assignment Modal */}
      {assignModalOpen && selectedCompensation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Assign Compensation Class
              </h2>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Student Information</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Student:</span> {getStudentInfo(selectedCompensation.student_id).name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Original Absence:</span> {format(new Date(selectedCompensation.original_date), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Original Batch:</span> {getBatchInfo(selectedCompensation.original_batch_id)}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Compensation Batch *
                  </label>
                  <select
                    value={assignmentBatchId}
                    onChange={(e) => setAssignmentBatchId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  >
                    <option value="">-- Select a batch --</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.day_of_week} {batch.start_time}-{batch.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Compensation Date *
                  </label>
                  <input
                    type="date"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be a future date
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setAssignModalOpen(false)
                    setSelectedCompensation(null)
                    setAssignmentBatchId('')
                    setAssignmentDate('')
                  }}
                  disabled={actionLoading === selectedCompensation.id}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCompensation}
                  disabled={actionLoading === selectedCompensation.id || !assignmentBatchId || !assignmentDate}
                  className="px-4 py-2 bg-art-indigo text-white rounded-lg hover:bg-art-indigo-dark font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === selectedCompensation.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Assign Compensation
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
