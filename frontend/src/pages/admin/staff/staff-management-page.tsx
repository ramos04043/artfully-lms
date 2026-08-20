import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { 
  Users, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  Mail,
  Phone,
  Trash2,
  Shield
} from 'lucide-react'
import StaffAuthSetup from './staff-auth-setup'

interface StaffMember {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  is_active: boolean
  created_at: string
}

interface Batch {
  id: string
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  programme_id: string
}

interface StaffBatch {
  id: string
  staff_id: string
  batch_id: string
  is_active: boolean
  assigned_at: string
}

export default function StaffManagementPage() {
  const [activeTab, setActiveTab] = useState<'staff' | 'auth'>('staff')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [staffBatches, setStaffBatches] = useState<StaffBatch[]>([])
  const [userToStaffMap, setUserToStaffMap] = useState<Record<string, string>>({}) // user_id -> staff_id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Add staff modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [addingStaff, setAddingStaff] = useState(false)
  const [newStaffForm, setNewStaffForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load all staff from app_users table
      const { data: staffData, error: staffError } = await db
        .from('app_users')
        .select('id, email, first_name, last_name, phone, is_active, created_at')
        .eq('role', 'STAFF')
        .order('first_name', { ascending: true })

      if (staffError) {
        console.error('Staff loading error:', staffError)
        throw staffError
      }

      setStaff((staffData || []) as StaffMember[])

      // Load staff records to build user_id -> staff_id mapping
      const { data: staffRecords, error: staffRecordsError } = await db
        .from('staff')
        .select('id, user_id')
        .eq('is_active', true)

      if (staffRecordsError) {
        console.error('Staff records loading error:', staffRecordsError)
        throw staffRecordsError
      }

      // Build mapping
      const mapping: Record<string, string> = {}
      staffRecords?.forEach((record: any) => {
        mapping[record.user_id] = record.id
      })
      setUserToStaffMap(mapping)
      console.log('?? User to Staff mapping:', mapping)

      // Load batches
      const { data: batchesData, error: batchError} = await db
        .from('batches')
        .select('id, name, day_of_week, start_time, end_time, programme_id')
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })

      if (batchError) throw batchError
      setBatches((batchesData || []) as Batch[])

      // Load staff-batch assignments
      const { data: staffBatchesData, error: sbError } = await db
        .from('staff_batches')
        .select('*')
        .eq('is_active', true)

      if (sbError) throw sbError
      setStaffBatches((staffBatchesData || []) as StaffBatch[])
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err?.message || err?.hint || err?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAssignModal = async (staffMember: StaffMember) => {
    setSelectedStaff(staffMember)
    
    try {
      // Get staff.id for this user
      const { data: staffRecords } = await db
        .from('staff')
        .select('id')
        .eq('user_id', staffMember.id)

      const staffRecord = staffRecords?.[0]

      if (!staffRecord) {
        setError('Staff record not found')
        return
      }

      // Pre-select already assigned batches
      const assignedBatches = staffBatches
        .filter((sb) => sb.staff_id === staffRecord.id)
        .map((sb) => sb.batch_id)
      
      setSelectedBatchIds(assignedBatches)
      setShowAssignModal(true)
    } catch (err: any) {
      console.error('Error opening assign modal:', err)
      setError('Failed to load batch assignments')
    }
  }

  const toggleBatchSelection = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId]
    )
  }

  const handleAssignBatches = async () => {
    if (!selectedStaff) return

    try {
      setAssigning(true)
      setError('')
      setSuccess('')

      console.log('?? Assigning batches via backend API for staff:', selectedStaff.id)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/staff/${selectedStaff.id}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          batch_ids: selectedBatchIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to assign batches' }))
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log('? Batches assigned:', result)

      setSuccess(`Batches updated for ${selectedStaff.first_name} ${selectedStaff.last_name}`)
      setShowAssignModal(false)
      setSelectedStaff(null)
      setSelectedBatchIds([])
      
      // Reload data
      await loadData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error assigning batches:', err)
      setError(err?.message || 'Failed to assign batches')
    } finally {
      setAssigning(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return

    try {
      setDeleting(true)
      setError('')
      setSuccess('')

      console.log('?? Deleting staff via backend API:', staffToDelete.id)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/staff/${staffToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to delete staff' }))
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log('? Staff deleted:', result)

      setSuccess(`Staff member ${staffToDelete.first_name} ${staffToDelete.last_name} deleted successfully`)
      setShowDeleteModal(false)
      setStaffToDelete(null)
      
      // Reload data
      await loadData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting staff:', err)
      setError(err?.message || 'Failed to delete staff member')
    } finally {
      setDeleting(false)
    }
  }

  const handleAddStaff = async () => {
    try {
      setAddingStaff(true)
      setError('')
      setSuccess('')

      // Validation
      if (!newStaffForm.firstName || !newStaffForm.lastName || !newStaffForm.email || !newStaffForm.password) {
        setError('Please fill in all required fields')
        return
      }

      if (newStaffForm.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }

      // Use backend API to create staff
      console.log('?? Creating staff via backend API:', newStaffForm.email)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newStaffForm.email,
          password: newStaffForm.password,
          first_name: newStaffForm.firstName,
          last_name: newStaffForm.lastName,
          phone: newStaffForm.phone || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to create staff' }))
        console.error('? Backend error:', errorData)
        const errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData)
        throw new Error(errorMessage)
      }

      const createdStaff = await response.json()
      console.log('? Staff created successfully:', createdStaff)

      setSuccess(`Staff member ${newStaffForm.firstName} ${newStaffForm.lastName} added successfully!`)
      setShowAddStaffModal(false)
      setNewStaffForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
      })

      // Reload data
      await loadData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error adding staff:', err)
      setError(err?.message || 'Failed to add staff member')
    } finally {
      setAddingStaff(false)
    }
  }

  // Get assigned batches for a staff member
  const getStaffBatches = (userId: string) => {
    const staffId = userToStaffMap[userId]
    if (!staffId) return []
    
    const assignedBatchIds = staffBatches
      .filter((sb) => sb.staff_id === staffId)
      .map((sb) => sb.batch_id)
    
    return batches.filter((b) => assignedBatchIds.includes(b.id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Staff Management</h1>
        <p className="text-sm md:text-base text-gray-600">
          Manage staff members and assign batches
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('staff')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'staff'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Staff List</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('auth')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'auth'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>Authentication Setup</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'auth' ? (
        <StaffAuthSetup />
      ) : (
        <>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <p className="text-xs md:text-sm text-gray-600">Total Staff</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{staff.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-xs md:text-sm text-gray-600">Active</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-green-600">
            {staff.filter((s) => s.is_active).length}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <p className="text-xs md:text-sm text-gray-600">Total Batches</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-purple-600">{batches.length}</p>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
          <button
            onClick={() => setShowAddStaffModal(true)}
            className="bg-art-indigo hover:bg-art-indigo/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {staff.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-lg font-medium">No staff members found</p>
              <p className="text-gray-400 text-sm mt-1">Staff members will appear here</p>
            </div>
          ) : (
            staff.map((staffMember) => {
              const assignedBatches = getStaffBatches(staffMember.id)
              
              return (
                <div key={staffMember.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Staff Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-art-indigo text-white flex items-center justify-center font-semibold flex-shrink-0">
                        {staffMember.first_name.charAt(0)}{staffMember.last_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-semibold text-gray-900">
                          {staffMember.first_name} {staffMember.last_name}
                        </h3>
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1">
                          <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {staffMember.email}
                          </div>
                          {staffMember.phone && (
                            <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              {staffMember.phone}
                            </div>
                          )}
                        </div>
                        
                        {/* Assigned Batches */}
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-2">
                            Assigned Batches ({assignedBatches.length})
                          </p>
                          {assignedBatches.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No batches assigned</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {assignedBatches.map((batch) => (
                                <span
                                  key={batch.id}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                >
                                  <Calendar className="w-3 h-3" />
                                  {batch.name} ({batch.day_of_week})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleOpenAssignModal(staffMember)}
                        className="bg-art-indigo hover:bg-art-indigo/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        <span className="hidden md:inline">Assign Batches</span>
                        <span className="md:hidden">Assign</span>
                      </button>
                      <button
                        onClick={() => {
                          setStaffToDelete(staffMember)
                          setShowDeleteModal(true)
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden md:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Assign Batches Modal */}
      {showAssignModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Assign Batches to {selectedStaff.first_name} {selectedStaff.last_name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Select batches to assign. Staff will see these in their portal.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                {batches.map((batch) => {
                  const isSelected = selectedBatchIds.includes(batch.id)
                  
                  return (
                    <div
                      key={batch.id}
                      onClick={() => toggleBatchSelection(batch.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-art-indigo bg-art-indigo/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-art-indigo border-art-indigo'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{batch.name}</p>
                          <p className="text-sm text-gray-600">
                            {batch.day_of_week} � {batch.start_time} - {batch.end_time}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {batches.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No batches available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleAssignBatches}
                disabled={assigning}
                className="flex-1 bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {assigning ? 'Saving...' : `Assign ${selectedBatchIds.length} Batch${selectedBatchIds.length !== 1 ? 'es' : ''}`}
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedStaff(null)
                  setSelectedBatchIds([])
                }}
                className="px-6 py-3 rounded-lg font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Staff Member</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create a new staff account with login credentials
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newStaffForm.firstName}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, firstName: e.target.value })}
                    placeholder="John"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newStaffForm.lastName}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, lastName: e.target.value })}
                    placeholder="Doe"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newStaffForm.email}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                    placeholder="john.doe@example.com"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={newStaffForm.phone}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                    placeholder="+1234567890"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newStaffForm.password}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                    placeholder="��������"
                    minLength={6}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-art-indigo focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleAddStaff}
                disabled={addingStaff}
                className="flex-1 bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addingStaff ? 'Adding...' : 'Add Staff Member'}
              </button>
              <button
                onClick={() => {
                  setShowAddStaffModal(false)
                  setNewStaffForm({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    password: '',
                  })
                }}
                className="px-6 py-3 rounded-lg font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && staffToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Delete Staff Member</h2>
              <p className="text-sm text-gray-600 mt-1">
                This action cannot be undone
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to delete{' '}
                <span className="font-semibold">
                  {staffToDelete.first_name} {staffToDelete.last_name}
                </span>
                ? This will remove their profile and all batch assignments.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleDeleteStaff}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Staff'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setStaffToDelete(null)
                }}
                className="px-6 py-3 rounded-lg font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
