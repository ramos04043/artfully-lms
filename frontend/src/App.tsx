import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/stores/auth-store'
import { initializeAuth } from '@/lib/zendbx-auth'

// Landing Page
import LandingPage from '@/pages/landing-page'

// Layouts
import AdminLayout from '@/layouts/admin-layout'
import StaffLayout from '@/layouts/staff-layout'

// Login Pages
import AdminLogin from '@/pages/admin/admin-login'
import StaffLogin from '@/pages/staff/staff-login'

// Admin Pages
import AdminDashboard from '@/pages/admin/dashboard'
import StudentsPage from '@/pages/admin/students/students-page'
import StudentDetailPage from '@/pages/admin/students/student-detail-page'
import EnrollmentPage from '@/pages/admin/students/enrollment-page'
import BatchesPage from '@/pages/admin/batches/batches-page'
import AttendancePage from '@/pages/admin/attendance/attendance-page'
import CompensationPage from '@/pages/admin/compensation/compensation-page'
import FeesPage from '@/pages/admin/fees/fees-page'
import FinanceOverviewPage from '@/pages/admin/finance/finance-overview-page'
import CapexPage from '@/pages/admin/finance/capex-page'
import OpexPage from '@/pages/admin/finance/opex-page'
import ExpensesPage from '@/pages/admin/finance/expenses-page'
import TransactionsPage from '@/pages/admin/finance/transactions-page'
import ManualRevenuePage from '@/pages/admin/finance/manual-revenue-page'
import ReportsPage from '@/pages/admin/reports/reports-page'
import NotificationsPage from '@/pages/admin/notifications/notifications-page'
import StaffManagementPage from '@/pages/admin/staff/staff-management-page'
import TasksPage from '@/pages/admin/tasks/tasks-page'
import SettingsPage from '@/pages/admin/settings/settings-page'

// Staff Pages
import StaffToday from '@/pages/staff/staff-today'
import StaffAttendance from '@/pages/staff/staff-attendance'
import StaffHistory from '@/pages/staff/staff-history'
import StaffProfile from '@/pages/staff/staff-profile'

function App() {
  const { user, isLoading } = useAuthStore()
  const [authInitialized, setAuthInitialized] = useState(false)

  // Initialize auth on mount
  useEffect(() => {
    const init = async () => {
      await initializeAuth()
      setAuthInitialized(true)
    }
    init()
  }, [])

  // Show loading until auth is initialized
  if (!authInitialized || isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-indigo"></div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - Portal Selection */}
        <Route 
          path="/" 
          element={
            user ? (
              user.role === 'ADMIN' ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/staff" replace />
              )
            ) : (
              <LandingPage />
            )
          } 
        />

        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Staff Login */}
        <Route path="/staff/login" element={<StaffLogin />} />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            user?.role === 'ADMIN' ? (
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/students/:id" element={<StudentDetailPage />} />
                  <Route path="/students/enroll" element={<EnrollmentPage />} />
                  <Route path="/batches" element={<BatchesPage />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/compensation" element={<CompensationPage />} />
                  <Route path="/fees" element={<FeesPage />} />
                  <Route path="/finance" element={<FinanceOverviewPage />} />
                  <Route path="/finance/capex" element={<CapexPage />} />
                  <Route path="/finance/opex" element={<OpexPage />} />
                  <Route path="/finance/expenses" element={<ExpensesPage />} />
                  <Route path="/finance/transactions" element={<TransactionsPage />} />
                  <Route path="/finance/revenue" element={<ManualRevenuePage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/staff" element={<StaffManagementPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </AdminLayout>
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />

        {/* Staff Routes */}
        <Route
          path="/staff/*"
          element={
            user?.role === 'STAFF' ? (
              <StaffLayout>
                <Routes>
                  <Route path="/" element={<StaffToday />} />
                  <Route path="/attendance/:batchId" element={<StaffAttendance />} />
                  <Route path="/history" element={<StaffHistory />} />
                  <Route path="/profile" element={<StaffProfile />} />
                </Routes>
              </StaffLayout>
            ) : (
              <Navigate to="/staff/login" replace />
            )
          }
        />

        {/* Legacy login route - redirect to landing */}
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </BrowserRouter>
  )
}

export default App
