# PowerShell script to create all placeholder pages

$pages = @(
    @{Path="frontend/src/pages/admin/students/students-page.tsx"; Title="Students"; Description="Student management"},
    @{Path="frontend/src/pages/admin/students/student-detail-page.tsx"; Title="Student Details"; Description="Student profile and details"},
    @{Path="frontend/src/pages/admin/students/enrollment-page.tsx"; Title="New Enrollment"; Description="Enroll new student"},
    @{Path="frontend/src/pages/admin/batches/batches-page.tsx"; Title="Batches"; Description="Batch management"},
    @{Path="frontend/src/pages/admin/attendance/attendance-page.tsx"; Title="Attendance"; Description="Attendance overview"},
    @{Path="frontend/src/pages/admin/compensation/compensation-page.tsx"; Title="Compensation"; Description="Compensation management"},
    @{Path="frontend/src/pages/admin/sessions/sessions-page.tsx"; Title="Sessions"; Description="Session management"},
    @{Path="frontend/src/pages/admin/fees/fees-page.tsx"; Title="Fees"; Description="Fee management"},
    @{Path="frontend/src/pages/admin/finance/finance-overview-page.tsx"; Title="Finance Overview"; Description="Financial overview"},
    @{Path="frontend/src/pages/admin/finance/capex-page.tsx"; Title="CapEX"; Description="Capital expenditure"},
    @{Path="frontend/src/pages/admin/finance/opex-page.tsx"; Title="OpEX"; Description="Operational expenditure"},
    @{Path="frontend/src/pages/admin/finance/expenses-page.tsx"; Title="Expenses"; Description="Expense management"},
    @{Path="frontend/src/pages/admin/finance/transactions-page.tsx"; Title="Transactions"; Description="Transaction history"},
    @{Path="frontend/src/pages/admin/reports/reports-page.tsx"; Title="Reports"; Description="Reports and analytics"},
    @{Path="frontend/src/pages/admin/notifications/notifications-page.tsx"; Title="Notifications"; Description="Notification center"},
    @{Path="frontend/src/pages/admin/staff/staff-management-page.tsx"; Title="Staff Management"; Description="Staff management"},
    @{Path="frontend/src/pages/admin/audit/audit-logs-page.tsx"; Title="Audit Logs"; Description="Audit trail"},
    @{Path="frontend/src/pages/admin/settings/settings-page.tsx"; Title="Settings"; Description="System settings"},
    @{Path="frontend/src/pages/staff/staff-today.tsx"; Title="Today"; Description="Today's classes"; IsStaff=$true},
    @{Path="frontend/src/pages/staff/staff-attendance.tsx"; Title="Mark Attendance"; Description="Mark student attendance"; IsStaff=$true},
    @{Path="frontend/src/pages/staff/staff-history.tsx"; Title="History"; Description="Attendance history"; IsStaff=$true},
    @{Path="frontend/src/pages/staff/staff-profile.tsx"; Title="Profile"; Description="Your profile"; IsStaff=$true}
)

foreach ($page in $pages) {
    $content = @"
export default function $($page.Title.Replace(' ', ''))Page() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          $($page.Title)
        </h1>
        <p className="text-muted-foreground">
          $($page.Description)
        </p>
      </div>

      <div className="bg-white rounded-lg border border-border p-6">
        <p className="text-muted-foreground">
          This page will be implemented in the corresponding phase.
        </p>
      </div>
    </div>
  )
}
"@

    $content | Out-File -FilePath $page.Path -Encoding utf8
    Write-Host "Created $($page.Path)"
}

Write-Host "`nAll pages created successfully!"
