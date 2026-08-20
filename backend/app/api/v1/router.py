from fastapi import APIRouter

# Import endpoint routers
from app.api.v1.endpoints import attendance, payments, enrollment, expenses, staff, automation, staff_auth_fix, database

api_router = APIRouter()

# Include implemented routers
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(enrollment.router, prefix="/enrollment", tags=["Enrollment"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(staff.router, prefix="/staff", tags=["Staff"])
api_router.include_router(automation.router, prefix="/automation", tags=["Automation"])
api_router.include_router(staff_auth_fix.router, prefix="/staff-auth-fix", tags=["Staff Auth Fix"])
api_router.include_router(database.router, prefix="/db", tags=["Database Proxy"])

# Future endpoints (to be implemented)
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# api_router.include_router(students.router, prefix="/students", tags=["students"])
# api_router.include_router(batches.router, prefix="/batches", tags=["batches"])
# api_router.include_router(compensations.router, prefix="/compensations", tags=["compensations"])
# api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
# api_router.include_router(fees.router, prefix="/fees", tags=["fees"])
# api_router.include_router(finance.router, prefix="/finance", tags=["finance"])
# api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
# api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
# api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
# api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
# api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])


@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "api": "v1"}
