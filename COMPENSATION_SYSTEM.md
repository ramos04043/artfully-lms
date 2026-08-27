# Compensation/Makeup Class System

## Overview
When students are marked absent, they automatically get a compensation/makeup class request that admin can assign to another batch.

---

## Complete Workflow

### 1. Student Marked Absent
**Who:** Staff member marking attendance  
**What happens:**
- Staff marks student as ABSENT in daily attendance
- System automatically creates a compensation request (status: `PENDING_APPROVAL`)
- Admin receives notification
- Parent receives absence email mentioning makeup class will be scheduled

**Technical:**
- File: `backend/app/api/v1/endpoints/attendance.py`
- When status = 'ABSENT', creates record in `compensations` table
- Sends notification to `notifications` table
- Queues email to `email_events` table

---

### 2. Admin Reviews Pending Requests
**Who:** Admin  
**Where:** Compensation page (`/admin/compensation`)  
**What they see:**
- Dashboard with stats:
  - Pending Approval count
  - Assigned count
  - Attended count
  - Rejected count
- Filterable list of compensation requests
- Student info, original absence details

**Technical:**
- File: `frontend/src/pages/admin/compensation/compensation-page.tsx`
- Loads compensations from database filtered by status
- Enriches with student and batch information

---

### 3. Admin Assigns Compensation Class
**Who:** Admin  
**Actions:**
1. Click "Approve" on a pending request
2. Modal opens showing:
   - Student name and details
   - Original absence date and batch
   - Dropdown to select compensation batch
   - Date picker for compensation date
3. Admin selects batch and future date
4. Clicks "Assign Compensation"

**Business Rules Enforced:**
- ✅ Compensation date must be in the future
- ✅ Student cannot have another class on that date
- ✅ Batch must have available capacity
- ✅ Validates batch exists and is active

**What happens:**
- Status changes from `PENDING_APPROVAL` → `ASSIGNED`
- `compensation_batch_id` and `compensation_date` saved
- `approved_by` and `approved_at` recorded
- Email sent to student/parent with makeup class details

**Technical:**
- API: `POST /api/v1/compensations/assign`
- File: `backend/app/api/v1/endpoints/compensations.py`
- Validates all business rules
- Updates compensation record
- Sends email notification

---

### 4. Admin Rejects Compensation Request
**Who:** Admin  
**Actions:**
1. Click "Reject" on a pending request
2. Enter rejection reason in prompt
3. Confirm

**What happens:**
- Status changes to `REJECTED`
- Rejection reason saved
- No makeup class scheduled

**Technical:**
- API: `POST /api/v1/compensations/reject`
- Updates status and saves reason

---

### 5. Student Attends Makeup Class
**Who:** Admin (after student attends)  
**Actions:**
1. When compensation date arrives and student attends
2. Admin clicks "Mark Attended" on the assigned compensation
3. System creates attendance record with status `COMPENSATION_PRESENT`

**What happens:**
- Status changes to `ATTENDED`
- Attendance record created in `attendance` table
- Links attendance to compensation via `attendance_id`
- Counts toward student's session progress

**Technical:**
- Creates attendance with `attendance_type: 'COMPENSATION'`
- Links back to compensation record

---

## Database Schema

### `compensations` Table
```sql
- id: UUID (Primary Key)
- student_id: UUID → students.id
- original_attendance_id: UUID → attendance.id (the ABSENT record)
- original_batch_id: UUID → batches.id (where they were absent)
- original_date: DATE (absence date)
- compensation_batch_id: UUID → batches.id (assigned makeup batch)
- compensation_date: DATE (scheduled makeup date)
- status: VARCHAR (PENDING_APPROVAL | ASSIGNED | ATTENDED | EXPIRED | CANCELLED | REJECTED)
- approved_by: UUID → users.id
- approved_at: TIMESTAMP
- rejection_reason: TEXT
- attendance_id: UUID → attendance.id (when attended)
- notes: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

---

## API Endpoints

### 1. Request Compensation (Optional - Auto-created on absence)
```http
POST /api/v1/compensations/request
Authorization: Staff or Admin

Body:
{
  "student_id": "uuid",
  "original_attendance_id": "uuid",
  "notes": "optional text"
}

Response:
{
  "success": true,
  "message": "Compensation request submitted successfully",
  "compensation_id": "uuid"
}
```

### 2. Assign Compensation (Admin)
```http
POST /api/v1/compensations/assign
Authorization: Admin only

Body:
{
  "compensation_id": "uuid",
  "compensation_batch_id": "uuid",
  "compensation_date": "2024-12-25"
}

Response:
{
  "success": true,
  "message": "Compensation class assigned successfully",
  "compensation_id": "uuid"
}
```

### 3. Reject Compensation (Admin)
```http
POST /api/v1/compensations/reject
Authorization: Admin only

Body:
{
  "compensation_id": "uuid",
  "rejection_reason": "Reason text"
}

Response:
{
  "success": true,
  "message": "Compensation request rejected",
  "compensation_id": "uuid"
}
```

### 4. Get Pending Requests (Admin)
```http
GET /api/v1/compensations/pending
Authorization: Admin only

Response:
{
  "compensations": [
    {
      "id": "uuid",
      "student_name": "John Doe",
      "student_code": "STU12345",
      "original_date": "2024-12-15",
      "original_batch_name": "Morning Batch",
      "status": "PENDING_APPROVAL",
      ...
    }
  ],
  "count": 5
}
```

### 5. Get Student Compensations (Staff/Admin)
```http
GET /api/v1/compensations/student/{student_id}
Authorization: Staff or Admin

Response:
{
  "compensations": [...],
  "count": 3
}
```

### 6. Get All Compensations (Admin)
```http
GET /api/v1/compensations/all?status_filter=ASSIGNED
Authorization: Admin only

Response:
{
  "compensations": [...],
  "count": 10
}
```

---

## Status Flow

```
PENDING_APPROVAL
    ↓
    ├─→ ASSIGNED (admin assigns batch & date)
    │      ↓
    │      └─→ ATTENDED (student attends makeup class)
    │
    ├─→ REJECTED (admin rejects request)
    │
    ├─→ CANCELLED (admin/system cancels)
    │
    └─→ EXPIRED (date passed without assignment)
```

---

## Email Notifications

### 1. Absence Notification (to parent)
**When:** Student marked absent  
**Subject:** Absence Notification - [Student Name]  
**Body:** Student was marked absent. Makeup class will be scheduled by admin.

### 2. Compensation Assigned (to student/parent)
**When:** Admin assigns makeup class  
**Subject:** Makeup Class Assigned  
**Body:** Your makeup class has been scheduled for [date] in [batch]. Please attend on time.

---

## Admin Notifications

### Dashboard Notifications
**When:** New compensation request created  
**Type:** COMPENSATION_REQUEST  
**Title:** "New Compensation Request"  
**Message:** "[Student Name] was absent on [date]. Compensation request created automatically."  
**Priority:** NORMAL

---

## Files Modified/Created

### Backend
- ✅ **Created:** `backend/app/api/v1/endpoints/compensations.py` (new endpoint)
- ✅ **Modified:** `backend/app/api/v1/router.py` (registered compensation router)
- ✅ **Modified:** `backend/app/api/v1/endpoints/attendance.py` (auto-create compensation on absence)

### Frontend
- ✅ **Modified:** `frontend/src/pages/admin/compensation/compensation-page.tsx` (added assignment modal)
- ✅ **Exists:** `frontend/src/types/compensation.ts` (types already defined)

### Database
- ✅ **Created:** `migrations/004_compensation_system.sql` (migration with views and indexes)
- ✅ **Exists:** `compensations` table in database (already present)

---

## Testing Checklist

### 1. Test Absence → Compensation Creation
- [ ] Mark student as ABSENT in attendance
- [ ] Verify compensation record created with status `PENDING_APPROVAL`
- [ ] Check admin notification created
- [ ] Check parent email queued

### 2. Test Admin Assignment
- [ ] Login as admin
- [ ] Go to Compensation page
- [ ] See pending request
- [ ] Click "Approve"
- [ ] Modal opens with student info
- [ ] Select batch and future date
- [ ] Click "Assign Compensation"
- [ ] Verify status changes to `ASSIGNED`
- [ ] Check email sent to student/parent

### 3. Test Validation Rules
- [ ] Try to assign past date → should fail
- [ ] Try to assign date when student has existing class → should fail
- [ ] Try to assign to full capacity batch → should fail

### 4. Test Rejection
- [ ] Click "Reject" on pending request
- [ ] Enter rejection reason
- [ ] Verify status changes to `REJECTED`
- [ ] Verify reason is saved

### 5. Test Mark Attended
- [ ] After student attends makeup class
- [ ] Click "Mark Attended"
- [ ] Verify attendance record created
- [ ] Verify status changes to `ATTENDED`

---

## Future Enhancements

### Possible Additions:
1. **Student Portal** - Students can view their assigned makeup classes
2. **Auto-Expire** - Background job to expire unassigned compensations after 30 days
3. **Reminder Emails** - Send reminder before makeup class date
4. **Analytics** - Track compensation completion rates
5. **Batch Recommendations** - Suggest suitable batches based on student's schedule
6. **Calendar View** - Show makeup classes on admin calendar
7. **Parent App** - Push notifications for makeup class assignments

---

## Support

For issues or questions about the compensation system:
1. Check backend logs: `backend/app/api/v1/endpoints/compensations.py`
2. Check frontend console for API errors
3. Verify database records in `compensations` table
4. Check `notifications` and `email_events` tables for communication logs
