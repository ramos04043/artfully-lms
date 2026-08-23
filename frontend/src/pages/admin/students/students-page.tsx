import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '@/lib/db-api'
import { Search, Plus, UserCircle, Phone, Mail, Calendar, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface Student {
  id: string
  student_id: string
  student_first_name: string
  student_last_name: string
  student_date_of_birth: string | null
  student_email: string | null
  student_phone: string | null
  student_grade: string | null
  status: string
  created_at: string
  paused_at: string | null
  batch_ids: string[]
}

interface Batch {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    loadStudents()
    loadBatches()
  }, [])

  const loadBatches = async () => {
    try {
      const { data, error } = await db
        .from('batches')
        .select('id, name, day_of_week, start_time, end_time')
        .eq('is_active', true)

      if (error) throw error
      setBatches(data || [])
    } catch (err: any) {
      console.error('Error loading batches:', err)
    }
  }

  const loadStudents = async () => {
    try {
      setLoading(true)
      
      // Read from enrollments table
      const { data, error } = await db
        .from('enrollments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setStudents(data || [])
    } catch (err: any) {
      console.error('Error loading students:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStudentBatches = (batchIds: string[]) => {
    if (!batchIds || batchIds.length === 0) return []
    return batches.filter(batch => batchIds.includes(batch.id))
  }

  // Extract class level from grade field (format: "FOUNDATION|Grade")
  const getClassLevel = (grade: string | null): 'FOUNDATION' | 'ADVANCED' | null => {
    if (!grade) return null
    const parts = grade.split('|')
    if (parts[0] === 'FOUNDATION' || parts[0] === 'ADVANCED') {
      return parts[0] as 'FOUNDATION' | 'ADVANCED'
    }
    return null
  }

  const getClassLevelColor = (level: 'FOUNDATION' | 'ADVANCED' | null) => {
    if (level === 'FOUNDATION') return 'bg-blue-100 text-blue-800 border-blue-200'
    if (level === 'ADVANCED') return 'bg-purple-100 text-purple-800 border-purple-200'
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      `${student.student_first_name} ${student.student_last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_phone?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'ALL' || student.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const statusCounts = {
    ALL: students.length,
    ACTIVE: students.filter((s) => s.status === 'ACTIVE').length,
    PAUSED: students.filter((s) => s.status === 'PAUSED').length,
    INACTIVE: students.filter((s) => s.status === 'INACTIVE').length,
    LEFT: students.filter((s) => s.status === 'LEFT').length,
    GRADUATED: students.filter((s) => s.status === 'GRADUATED').length,
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
          <p className="text-gray-600">Loading students...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600 mt-1">
              Manage student enrollments, attendance, and profiles
            </p>
          </div>
          <Link
            to="/admin/students/enroll"
            className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Student
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`p-4 rounded-lg border-2 transition-all ${
                statusFilter === status
                  ? 'border-art-indigo bg-art-indigo/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600 capitalize">
                {status.toLowerCase()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
          />
        </div>
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No students found
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first student'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <Link
              to="/admin/students/enroll"
              className="inline-flex items-center gap-2 bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add First Student
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrolled
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-art-indigo/10 rounded-full flex items-center justify-center">
                          <span className="text-art-indigo font-semibold">
                            {student.student_first_name[0]}
                            {student.student_last_name[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {student.student_first_name} {student.student_last_name}
                            {(() => {
                              const classLevel = getClassLevel(student.student_grade)
                              if (classLevel) {
                                return (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getClassLevelColor(
                                      classLevel
                                    )}`}
                                  >
                                    {classLevel}
                                  </span>
                                )
                              }
                              return null
                            })()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.student_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const studentBatches = getStudentBatches(student.batch_ids || [])
                        if (studentBatches.length === 0) {
                          return <span className="text-sm text-gray-400">No batch assigned</span>
                        }
                        return (
                          <div className="space-y-1">
                            {studentBatches.map((batch) => (
                              <div key={batch.id} className="text-sm text-gray-900">
                                <span className="font-medium">{batch.name || batch.day_of_week}</span>
                                <span className="text-gray-500 text-xs ml-2">
                                  {batch.start_time} - {batch.end_time}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          student.status
                        )}`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(student.created_at), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/admin/students/${student.id}`}
                        className="text-art-indigo hover:text-art-indigo/80 font-medium text-sm"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Count */}
      {filteredStudents.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      )}
    </div>
  )
}
