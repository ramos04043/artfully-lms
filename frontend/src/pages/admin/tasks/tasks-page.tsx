import { useEffect, useState } from 'react'
import { db } from '@/lib/db-api'
import { format } from 'date-fns'
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle,
  ListTodo,
  Edit,
  Save,
  X,
  Trash2,
  User,
  PlayCircle,
  RotateCcw
} from 'lucide-react'
import ConfirmationDialog from '@/components/ui/confirmation-dialog'

interface Task {
  id: string
  task_name: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  assigned_to?: string
  created_by?: string
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

// Hardcoded staff members for task assignment
const STAFF_MEMBERS = [
  { id: 'sajeeth', name: 'Sajeeth' },
  { id: 'akshaya', name: 'Akshaya' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add Task Form
  const [showAddForm, setShowAddForm] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  // Confirmation dialog state
  const [showAddConfirm, setShowAddConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Task>>({})

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load tasks
      const { data: tasksData, error: tasksError } = await db
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError
      setTasks((tasksData || []) as Task[])
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTask = async () => {
    try {
      setSaving(true)
      setShowAddConfirm(false)
      setError('')
      setSuccess('')

      if (!taskName.trim()) {
        setError('Please enter a task name')
        return
      }

      const { error: insertError } = await db
        .from('tasks')
        .insert({
          task_name: taskName,
          description: description || null,
          priority: priority,
          status: 'TODO',
          assigned_to: assignedTo || null,
          due_date: dueDate || null,
        })

      if (insertError) throw insertError

      setSuccess('Task created successfully!')
      
      // Reset form
      setTaskName('')
      setDescription('')
      setPriority('MEDIUM')
      setAssignedTo('')
      setDueDate('')
      setShowAddForm(false)

      // Reload data
      await loadData()

      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      console.error('Error adding task:', err)
      setError(err.message || 'Failed to add task')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id)
    setEditData({
      task_name: task.task_name,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to,
      due_date: task.due_date,
    })
  }

  const cancelEdit = () => {
    setEditingTaskId(null)
    setEditData({})
  }

  const handleSaveEdit = async (taskId: string) => {
    try {
      setSaving(true)
      setError('')

      const updateData: any = {
        task_name: editData.task_name,
        description: editData.description,
        priority: editData.priority,
        status: editData.status,
        assigned_to: editData.assigned_to || null,
        due_date: editData.due_date || null,
        updated_at: new Date().toISOString(),
      }

      // If marking as completed, set completed_at
      if (editData.status === 'COMPLETED' && !tasks.find(t => t.id === taskId)?.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }

      const { error: updateError } = await db
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)

      if (updateError) throw updateError

      setSuccess('Task updated successfully!')
      setEditingTaskId(null)
      setEditData({})
      await loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating task:', err)
      setError(err.message || 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    setTaskToDelete(taskId)
    setShowDeleteConfirm(true)
  }

  const handleQuickStatusChange = async (taskId: string, newStatus: 'COMPLETED' | 'IN_PROGRESS' | 'TODO') => {
    try {
      setSaving(true)
      setError('')

      console.log('Updating task:', taskId, 'to status:', newStatus)

      // Try using the same update pattern as edit
      const updateData = {
        status: newStatus,
      }

      console.log('Update data:', updateData)

      const result = await db
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)

      console.log('Update result:', result)

      if (result.error) {
        console.error('Update error:', result.error)
        throw result.error
      }

      setSuccess(`Task marked as ${newStatus === 'COMPLETED' ? 'Complete' : newStatus === 'IN_PROGRESS' ? 'In Progress' : 'To Do'}!`)
      await loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating task status:', err)
      setError(err.message || 'Failed to update task status')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      setSaving(true)
      setShowDeleteConfirm(false)
      setError('')

      const { error: deleteError } = await db
        .from('tasks')
        .delete()
        .eq('id', taskToDelete)

      if (deleteError) throw deleteError

      setSuccess('Task deleted successfully!')
      setTaskToDelete(null)
      await loadData()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      console.error('Error deleting task:', err)
      setError(err.message || 'Failed to delete task')
    } finally {
      setSaving(false)
    }
  }

  // Get staff member name
  const getStaffName = (staffId?: string) => {
    if (!staffId) return 'Unassigned'
    const member = STAFF_MEMBERS.find((s) => s.id === staffId)
    return member ? member.name : 'Unknown'
  }

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchQuery === '' ||
      task.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    const matchesAssignedTo = filterAssignedTo === 'all' || task.assigned_to === filterAssignedTo

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignedTo
  })

  // Calculate stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    high: tasks.filter((t) => t.priority === 'HIGH' || t.priority === 'URGENT').length,
  }

  // Priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS':
        return 'bg-purple-100 text-purple-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Tasks</h1>
          <p className="text-sm md:text-base text-gray-600">Manage and track work items</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors w-full md:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
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

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Task</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter task name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {STAFF_MEMBERS.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add task details..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowAddConfirm(true)}
              disabled={saving}
              className="bg-art-indigo hover:bg-art-indigo/90 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Add Task'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setError('')
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Total Tasks</p>
              <p className="text-xl md:text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <ListTodo className="w-8 md:w-10 h-8 md:h-10 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">To Do</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600">{stats.todo}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">In Progress</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-lg md:text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">High Priority</p>
              <p className="text-lg md:text-2xl font-bold text-red-600">{stats.high}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Search & Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Assigned To Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
            <select
              value={filterAssignedTo}
              onChange={(e) => setFilterAssignedTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-art-indigo focus:border-transparent"
            >
              <option value="all">All Assignees</option>
              {STAFF_MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSearchQuery('')
            setFilterStatus('all')
            setFilterPriority('all')
            setFilterAssignedTo('all')
          }}
          className="mt-4 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No tasks found</p>
                      <p className="text-sm mt-1">Add your first task to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isEditing = editingTaskId === task.id

                  return (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.task_name || ''}
                            onChange={(e) => setEditData({ ...editData, task_name: e.target.value })}
                            className="text-sm px-2 py-1 border rounded w-full"
                          />
                        ) : (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{task.task_name}</div>
                            {task.description && (
                              <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editData.priority || ''}
                            onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                            className="text-sm px-2 py-1 border rounded"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editData.status || ''}
                            onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                            className="text-sm px-2 py-1 border rounded"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editData.assigned_to || ''}
                            onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value })}
                            className="text-sm px-2 py-1 border rounded"
                          >
                            <option value="">Unassigned</option>
                            {STAFF_MEMBERS.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-sm text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {getStaffName(task.assigned_to)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editData.due_date || ''}
                            onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                            className="text-sm px-2 py-1 border rounded"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">
                            {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : '-'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(task.id)}
                              disabled={saving}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-600 hover:text-gray-800"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {/* Quick action buttons based on current status */}
                            {task.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleQuickStatusChange(task.id, 'COMPLETED')}
                                disabled={saving}
                                className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                title="Mark as Complete"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {task.status === 'TODO' && (
                              <button
                                onClick={() => handleQuickStatusChange(task.id, 'IN_PROGRESS')}
                                disabled={saving}
                                className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                                title="Mark as In Progress"
                              >
                                <PlayCircle className="w-4 h-4" />
                              </button>
                            )}
                            {task.status === 'COMPLETED' && (
                              <button
                                onClick={() => handleQuickStatusChange(task.id, 'TODO')}
                                disabled={saving}
                                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                title="Mark as To Do"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => startEdit(task)}
                              className="text-art-indigo hover:text-art-indigo/80"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      {filteredTasks.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </div>
      )}
      
      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showAddConfirm}
        onClose={() => setShowAddConfirm(false)}
        onConfirm={handleAddTask}
        title="Add Task?"
        message={`Are you sure you want to add the task "${taskName}"?`}
        confirmText="Add Task"
        variant="warning"
        loading={saving}
      />
      
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setTaskToDelete(null)
        }}
        onConfirm={confirmDeleteTask}
        title="Delete Task?"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete Task"
        variant="danger"
        loading={saving}
      />
    </div>
  )
}
