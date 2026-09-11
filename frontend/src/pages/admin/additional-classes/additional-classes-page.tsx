import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { Plus, Users, X, Search, AlertCircle, CheckCircle, Trash2, ChevronRight } from 'lucide-react'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'
import { useAuthStore } from '@/stores/auth-store'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Student {
  student_id: string
  student_first_name: string
  student_last_name: string
  status: string
  batch_ids: string[]
  student_grade: string
}

interface Batch {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
}

interface AdditionalClassAssignment {
  id: string
  batch_id: string
  assigned_at: string
  notes?: string
}

interface StudentWithAssignments extends Student {
  regularBatches: Batch[]
  additionalBatches: Array<Batch & { assignmentId: string }>
}

export default function AdditionalClassesPage() {
  const { token } = useAuthStore()
  const [students, setStudents] = useState<StudentWithAssignments[]>([])
  const [allBatches, setAllBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Selected student modal
  const [selectedStudent, setSelectedStudent] = useState<StudentWithAssignments | null>(null)
  const [showStudentModal, setShowStudentModal] = useState(false)

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState('')
  const [notes, setNotes] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Use refreshing state if already loaded, loading state if initial load
      if (students.length > 0) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError('')

      // Load all active students from enrollments
      const { data: enrollmentsData, error: enrollError } = await db
        .from('enrollments')
        .select('student_id, student_first_name, student_last_name, status, batch_ids, student_grade')
        .eq('status', 'ACTIVE')
        .order('student_first_name')

      if (enrollError) throw enrollError

      // Load all batches
      const { data: batchesData, error: batchError } = await db
        .from('batches')
        .select('id, name, day_of_week, start_time, end_time')
        .eq('is_active', true)

      if (batchError) throw batchError

      setAllBatches(batchesData || [])

      // Load additional class assignments
      const response = await fetch(`${API_URL}/api/additional-classes/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      let additionalAssignments: any[] = []
      if (response.ok) {
        try {
          additionalAssignments = await response.json()
        } catch (e) {
          console.warn('Could not parse additional classes response:', e)
          additionalAssignments = []
        }
      } else {
        console.warn('Additional classes API returned:', response.status)
      }

      // Create batch lookup
      const batchLookup = new Map(
        (batchesData || []).map((b: Batch) => [b.id, b])
      )

      // Process students with their regular and additional batches
      const studentsWithAssignments: StudentWithAssignments[] = (enrollmentsData || []).map(student => {
        const regularBatchIds = student.batch_ids || []
        const regularBatches = regularBatchIds
          .map((id: string) => batchLookup.get(id))
          .filter(b => b !== undefined) as Batch[]

        // Find additional assignments for this student
        const studentAdditionalAssignments = additionalAssignments.filter(
          a => a.student_id === student.student_id
        )

        const additionalBatches = studentAdditionalAssignments
          .map(assignment => {
            const batch = batchLookup.get(assignment.batch_id)
            if (batch) {
              return {
                ...batch,
                assignmentId: assignment.id
              }
            }
            return null
          })
          .filter(b => b !== null) as Array<Batch & { assignmentId: string }>

        return {
          ...student,
          regularBatches,
          additionalBatches
        }
      })

      // Sort students numerically by student_id (e.g., ART1001, ART1002, etc.)
      studentsWithAssignments.sort((a, b) => {
        const extractNumber = (id: string) => {
          const match = id.match(/\d+/)
          return match ? parseInt(match[0]) : 0
        }
        return extractNumber(a.student_id) - extractNumber(b.student_id)
      })

      setStudents(studentsWithAssignments)
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleStudentClick = (student: StudentWithAssignments) => {
    setSelectedStudent(student)
    setShowStudentModal(true)
  }

  const handleCloseStudentModal = () => {
    setSelectedStudent(null)
    setShowStudentModal(false)
  }

  const handleOpenAssignModal = () => {
    setShowAssignModal(true)
    setSelectedBatch('')
    setNotes('')
  }

  const handleCloseAssignModal = () => {
    setShowAssignModal(false)
    setSelectedBatch('')
    setNotes('')
  }

  const handleAssign = async () => {
    if (!selectedStudent || !selectedBatch) {
      setError('Please select a batch')
      return
    }

    try {
      setAssigning(true)
      setError('')

      const response = await fetch(`${API_URL}/api/additional-classes/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: selectedStudent.student_id,
          batch_id: selectedBatch,
          notes: notes || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to assign additional class')
      }

      const data = await response.json()
      setSuccess(data.message)
      handleCloseAssignModal()
      
      // Refresh data and wait for it to complete
      await loadData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error assigning additional class:', err)
      setError(err.message || 'Failed to assign additional class')
    } finally {
      setAssigning(false)
    }
  }

  const handleDeleteClick = (assignmentId: string) => {
    setAssignmentToDelete(assignmentId)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return

    try {
      setDeleting(true)
      setError('')

      const response = await fetch(`${API_URL}/api/additional-classes/assignments/${assignmentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to remove assignment')
      }

      setSuccess('Additional class assignment removed')
      
      // Refresh data and wait for it to complete
      await loadData()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error removing assignment:', err)
      setError(err.message || 'Failed to remove assignment')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
      setAssignmentToDelete(null)
    }
  }

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase()
    return (
      student.student_first_name.toLowerCase().includes(query) ||
      student.student_last_name.toLowerCase().includes(query) ||
      student.student_id.toLowerCase().includes(query)
    )
  })

  // Get available batches for assignment (exclude regular and already assigned)
  const getAvailableBatches = () => {
    if (!selectedStudent) return []
    
    const regularBatchIds = selectedStudent.batch_ids || []
    const additionalBatchIds = selectedStudent.additionalBatches.map(b => b.id)
    const excludedIds = [...regularBatchIds, ...additionalBatchIds]
    
    return allBatches.filter(b => !excludedIds.includes(b.id))
  }

  // Calculate stats
  const totalAdditionalAssignments = students.reduce(
    (sum, student) => sum + student.additionalBatches.length,
    0
  )
  const studentsWithAdditional = students.filter(s => s.additionalBatches.length > 0).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Additional Classes</h1>
            <p className="text-gray-600 mt-2">
              Click on any student to manage their additional class assignments
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">With Additional Classes</p>
              <p className="text-3xl font-bold text-gray-900">{studentsWithAdditional}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users size={24} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Additional Assignments</p>
              <p className="text-3xl font-bold text-gray-900">{totalAdditionalAssignments}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Users size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by student name, ID, or batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Loading students...
          </div>
        ) : refreshing ? (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
            <p>Refreshing data...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">
              {searchQuery ? 'No students match your search' : 'No students found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regular Batches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Additional Batches
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.student_id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleStudentClick(student)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {student.student_first_name[0]}{student.student_last_name[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.student_first_name} {student.student_last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{student.student_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {student.regularBatches.map((batch) => (
                          <span key={batch.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {batch.name}
                          </span>
                        ))}
                        {student.regularBatches.length === 0 && (
                          <span className="text-sm text-gray-400">No regular batches</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {student.additionalBatches.map((batch) => (
                          <span key={batch.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🏷️ {batch.name}
                          </span>
                        ))}
                        {student.additionalBatches.length === 0 && (
                          <span className="text-sm text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStudentClick(student)
                        }}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedStudent.student_first_name} {selectedStudent.student_last_name}
                </h2>
                <p className="text-sm text-gray-600">{selectedStudent.student_id}</p>
              </div>
              <button
                onClick={handleCloseStudentModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Regular Batches */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Regular Batches</h3>
                {selectedStudent.regularBatches.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.regularBatches.map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <p className="font-medium text-gray-900">{batch.name}</p>
                          <p className="text-sm text-gray-600">
                            {batch.day_of_week} • {batch.start_time} - {batch.end_time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No regular batches assigned</p>
                )}
              </div>

              {/* Additional Batches */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Additional Classes</h3>
                  <button
                    onClick={handleOpenAssignModal}
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <Plus size={16} />
                    Add Batch
                  </button>
                </div>
                {selectedStudent.additionalBatches.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.additionalBatches.map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div>
                          <p className="font-medium text-gray-900">🏷️ {batch.name}</p>
                          <p className="text-sm text-gray-600">
                            {batch.day_of_week} • {batch.start_time} - {batch.end_time}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(batch.assignmentId)}
                          className="text-red-600 hover:text-red-900 p-2"
                          title="Remove additional class"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm mb-3">No additional classes assigned</p>
                    <button
                      onClick={handleOpenAssignModal}
                      className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                    >
                      + Assign First Additional Class
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseStudentModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Additional Class Modal */}
      {showAssignModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Assign Additional Class
              </h2>
              <button
                onClick={handleCloseAssignModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student
                </label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-900">
                    {selectedStudent.student_first_name} {selectedStudent.student_last_name}
                  </p>
                  <p className="text-sm text-gray-600">{selectedStudent.student_id}</p>
                </div>
              </div>

              {/* Batch Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Batch
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select batch</option>
                  {getAvailableBatches().map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name} - {batch.day_of_week} ({batch.start_time} - {batch.end_time})
                    </option>
                  ))}
                </select>
                {getAvailableBatches().length === 0 && (
                  <p className="text-sm text-orange-600 mt-2">
                    All batches are already assigned (regular or additional)
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add any notes about this assignment..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseAssignModal}
                disabled={assigning}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || !selectedBatch}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setAssignmentToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Remove Additional Class Assignment"
        message="Are you sure you want to remove this additional class assignment? This action cannot be undone."
        confirmText="Remove"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        loading={deleting}
      />
    </div>
  )
}
