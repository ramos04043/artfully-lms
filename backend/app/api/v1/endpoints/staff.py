"""
Staff Management API Endpoints
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, date
import logging
from uuid import UUID

from app.zendbx_client import db
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None


class StaffResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    is_active: bool
    created_at: datetime


class StaffBatchAssignment(BaseModel):
    staff_id: UUID
    batch_ids: List[UUID]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/debug/{email}")
async def debug_staff_data(email: str):
    """
    Debug endpoint to check staff data linkage
    """
    try:
        # Check app_users
        app_user = await db.select(
            'app_users',
            columns='id, email, role, auth_user_id',
            filters={'email': email},
            limit=1
        )
        
        if not app_user or len(app_user) == 0:
            return {"error": "No app_user found", "email": email}
        
        user_data = app_user[0]
        
        # Check staff record
        staff_record = await db.select(
            'staff',
            columns='id, user_id, employee_id, is_active',
            filters={'user_id': user_data['id']},
            limit=1
        )
        
        # Check staff_batches
        if staff_record and len(staff_record) > 0:
            staff_batches = await db.select(
                'staff_batches',
                columns='id, staff_id, batch_id, is_active',
                filters={'staff_id': staff_record[0]['id']}
            )
        else:
            staff_batches = []
        
        return {
            "app_user": user_data,
            "staff_record": staff_record[0] if staff_record else None,
            "staff_batches": staff_batches,
            "diagnosis": {
                "has_auth": user_data.get('auth_user_id') is not None,
                "has_staff_record": len(staff_record) > 0 if staff_record else False,
                "has_batch_assignments": len(staff_batches) > 0 if staff_batches else False
            }
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/", response_model=List[StaffResponse])
async def list_staff():
    """
    Get all staff members
    """
    try:
        # Query app_users table for staff
        result = await db.select(
            'app_users',
            columns='id, email, first_name, last_name, phone, is_active, created_at',
            filters={'role': 'STAFF'},
            order_by='first_name.asc'
        )
        
        return result if result else []
    
    except Exception as e:
        logger.error(f"Error listing staff: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list staff: {str(e)}")


@router.post("/", response_model=StaffResponse, status_code=201)
async def create_staff(staff: StaffCreate):
    """
    Create a new staff member with ZendBX auth account
    
    This creates:
    1. ZendBX auth account (for login)
    2. app_users record (for role management)
    3. staff record (for staff-specific data)
    """
    try:
        logger.info(f"Creating staff member: {staff.email}")
        
        # Check if user already exists in app_users
        existing_user = await db.select(
            'app_users',
            columns='id',
            filters={'email': staff.email},
            limit=1
        )
        
        if existing_user and len(existing_user) > 0:
            raise HTTPException(status_code=400, detail=f"Staff member with email {staff.email} already exists")
        
        # Step 1: Create ZendBX auth account  
        logger.info(f"Creating ZendBX auth account via HTTP for {staff.email}")
        auth_user_id = None
        
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.ZENDBX_URL}/p/artfully-database/v1/auth/signup",
                    json={"email": staff.email, "password": staff.password},
                    headers={"apikey": settings.ZENDBX_SERVICE_KEY, "Content-Type": "application/json"},
                    timeout=30.0
                )
                logger.info(f"HTTP Response: {response.status_code}")
                if response.status_code in [200, 201]:
                    data = response.json()
                    auth_user_id = data.get('user', {}).get('id') or data.get('id')
                    logger.info(f"Auth created! ID: {auth_user_id}")
                else:
                    logger.error(f"Failed: {response.text}")
        except Exception as e:
            logger.error(f"Auth error: {e}")
            auth_user_id = None
        
        # Step 2: Create app_users record
        logger.info(f"Creating app_users record for {staff.email}")
        user_data = {
            'email': staff.email,
            'role': 'STAFF',
            'first_name': staff.first_name,
            'last_name': staff.last_name,
            'phone': staff.phone,
            'is_active': True
        }
        
        # Add auth_user_id if available
        if auth_user_id:
            user_data['auth_user_id'] = auth_user_id
        
        user_result = await db.insert('app_users', user_data)
        
        if not user_result or len(user_result) == 0:
            logger.error("Failed to create app_users record")
            raise HTTPException(status_code=500, detail="Failed to create user record")
        
        user_record = user_result[0]
        logger.info(f"App user created with ID: {user_record['id']}")
        
        # Step 3: Create staff record
        logger.info(f"Creating staff record")
        staff_data = {
            'user_id': user_record['id'],
            'employee_id': f"EMP-{int(datetime.now().timestamp())}",
            'date_of_joining': date.today().isoformat(),
            'is_active': True
        }
        
        staff_result = await db.insert('staff', staff_data)
        
        if not staff_result or len(staff_result) == 0:
            # Cleanup: delete app_users record
            logger.error("❌ Failed to create staff record - INSERT returned empty")
            logger.error(f"Staff data attempted: {staff_data}")
            await db.delete('app_users', {'id': user_record['id']})
            raise HTTPException(status_code=500, detail="Failed to create staff record in database")
        
        staff_record = staff_result[0]
        logger.info(f"✅ Staff record created with ID: {staff_record['id']}")
        logger.info(f"✅ Staff member created successfully")
        logger.info(f"   Email: {staff.email}")
        
        if auth_user_id:
            logger.info(f"   ✅ Login enabled - they can login at /staff/login")
            logger.info(f"   Password: [HIDDEN]")
        else:
            logger.warning(f"   ⚠️  Login NOT enabled - auth account creation failed")
            logger.warning(f"   Manual step required: Create auth account in ZendBX dashboard")
            logger.warning(f"   Go to: ZendBX Console → Authentication → Users → Add User")
            logger.warning(f"   Email: {staff.email}")
        
        # Return the user record
        response = StaffResponse(**user_record)
        
        # Add warning to response if auth failed
        if not auth_user_id:
            # This won't show in StaffResponse but will be in logs
            logger.info("Returning staff record without auth")
            
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating staff: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create staff: {str(e)}")


@router.post("/{staff_id}/batches")
async def assign_batches(
    staff_id: UUID,
    assignment: StaffBatchAssignment
):
    """
    Assign batches to a staff member
    """
    try:
        logger.info(f"Assigning batches to staff {staff_id}")
        
        # Get staff record ID from app_users ID
        staff_result = await db.select(
            'staff',
            columns='id',
            filters={'user_id': str(staff_id)},
            limit=1
        )
        
        if not staff_result or len(staff_result) == 0:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        staff_record_id = staff_result[0]['id']
        
        # Get current assignments
        current_assignments = await db.select(
            'staff_batches',
            columns='batch_id',
            filters={'staff_id': staff_record_id, 'is_active': True}
        )
        
        current_batch_ids = [a['batch_id'] for a in (current_assignments or [])]
        
        # Find batches to add and remove
        batches_to_add = [b for b in assignment.batch_ids if str(b) not in current_batch_ids]
        batches_to_remove = [b for b in current_batch_ids if b not in [str(bid) for bid in assignment.batch_ids]]
        
        # Add new assignments
        if batches_to_add:
            # Insert each batch assignment individually
            for batch_id in batches_to_add:
                assignment_data = {
                    'staff_id': staff_record_id,
                    'batch_id': str(batch_id),
                    'is_active': True
                }
                await db.insert('staff_batches', assignment_data)
        
        # Remove old assignments
        if batches_to_remove:
            # First, get all assignments for this staff member
            all_assignments = await db.select(
                'staff_batches',
                columns='id, batch_id',
                filters={'staff_id': staff_record_id}
            )
            
            # Filter to only those batch_ids we want to remove
            ids_to_delete = [
                a['id'] for a in (all_assignments or []) 
                if a['batch_id'] in batches_to_remove
            ]
            
            # Delete each one by ID
            for assignment_id in ids_to_delete:
                await db.delete('staff_batches', {'id': assignment_id})
        
        logger.info(f"Batch assignments updated for staff {staff_id}")
        
        return {
            "message": "Batches assigned successfully",
            "added": len(batches_to_add),
            "removed": len(batches_to_remove)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning batches: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to assign batches: {str(e)}")


@router.post("/{staff_id}/create-auth")
async def create_auth_for_staff(staff_id: UUID, password: str):
    """
    Create ZendBX auth account for existing staff member
    
    Use this to fix staff members who were created before automatic auth creation.
    
    Example:
    POST /api/staff/{staff_id}/create-auth?password=SecurePassword123
    """
    try:
        logger.info(f"Creating auth account for staff: {staff_id}")
        
        # Get staff user details
        user_result = await db.select(
            'app_users',
            columns='email, first_name, last_name, auth_user_id',
            filters={'id': str(staff_id), 'role': 'STAFF'},
            limit=1
        )
        
        if not user_result or len(user_result) == 0:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        user = user_result[0]
        
        # Check if auth already exists
        if user.get('auth_user_id'):
            return {
                "message": "Auth account already exists",
                "email": user['email'],
                "can_login": True
            }
        
        # Create ZendBX auth account
        logger.info(f"Creating ZendBX auth account for {user['email']}")
        try:
            # ZendBX signUp is async and needs to be awaited
            auth_response = await zendbx_client.auth.signUp(
                user['email'],
                password
            )
            
            logger.info(f"ZendBX auth account created: {auth_response}")
            
            # Extract auth_user_id from response
            auth_user_id = None
            if isinstance(auth_response, dict):
                auth_user_id = auth_response.get('user', {}).get('id')
                if not auth_user_id:
                    auth_user_id = auth_response.get('id')
            
            # Update app_users with auth_user_id
            if auth_user_id:
                await db.update(
                    'app_users',
                    data={'auth_user_id': auth_user_id},
                    filters={'id': str(staff_id)}
                )
            
            logger.info(f"✅ Auth account created successfully for {user['email']}")
            
            return {
                "message": "Auth account created successfully",
                "email": user['email'],
                "password": password,
                "can_login": True,
                "login_url": "/staff/login"
            }
            
        except Exception as auth_error:
            error_msg = str(auth_error)
            logger.error(f"Failed to create ZendBX auth account: {error_msg}")
            
            # Check if user already exists in ZendBX
            if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
                return {
                    "message": "Auth account already exists in ZendBX",
                    "email": user['email'],
                    "note": "User can login with their existing password"
                }
            
            raise HTTPException(status_code=500, detail=f"Failed to create auth account: {error_msg}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating auth: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create auth: {str(e)}")


@router.delete("/{staff_id}")
async def delete_staff(staff_id: UUID):
    """
    Delete a staff member and all related records
    """
    try:
        logger.info(f"Deleting staff member: {staff_id}")
        
        # Get staff record
        staff_result = await db.select(
            'staff',
            columns='id',
            filters={'user_id': str(staff_id)},
            limit=1
        )
        
        if not staff_result or len(staff_result) == 0:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        staff_record_id = staff_result[0]['id']
        
        # Delete batch assignments - need to query first, then delete by ID
        try:
            batch_assignments = await db.select(
                'staff_batches',
                columns='id',
                filters={'staff_id': staff_record_id}
            )
            
            if batch_assignments:
                for assignment in batch_assignments:
                    await db.delete('staff_batches', {'id': assignment['id']})
                    
            logger.info(f"Deleted {len(batch_assignments)} batch assignments")
        except Exception as e:
            logger.warning(f"Error deleting batch assignments: {e}")
            # Continue even if batch deletion fails
        
        # Delete staff record
        await db.delete('staff', {'id': staff_record_id})
        
        # Delete app_users record
        await db.delete('app_users', {'id': str(staff_id)})
        
        logger.info(f"Staff member deleted successfully")
        
        return {"message": "Staff member deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting staff: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete staff: {str(e)}")


# ============================================================================
# STAFF PORTAL API ENDPOINTS (Bypass CORS)
# ============================================================================

@router.get("/me/batches")
async def get_my_batches(user_id: str, day_of_week: Optional[str] = None):
    """
    Get batches assigned to the logged-in staff member
    Used by staff portal to bypass CORS issues
    
    Query params:
    - user_id: The app_users.id of the logged-in staff
    - day_of_week: Optional filter by day (MONDAY, TUESDAY, etc.)
    """
    try:
        logger.info(f"Fetching batches for staff user_id: {user_id}, day: {day_of_week}")
        
        # Get staff record
        staff_result = await db.select(
            'staff',
            columns='id',
            filters={'user_id': user_id},
            limit=1
        )
        
        if not staff_result or len(staff_result) == 0:
            logger.error(f"Staff record not found for user_id: {user_id}")
            raise HTTPException(status_code=404, detail="Staff record not found")
        
        staff_id = staff_result[0]['id']
        logger.info(f"Found staff_id: {staff_id}")
        
        # Get batch assignments
        assignments = await db.select(
            'staff_batches',
            columns='batch_id',
            filters={'staff_id': staff_id}
        )
        
        if not assignments:
            logger.info(f"No batch assignments found for staff {staff_id}")
            return []
        
        batch_ids = [a['batch_id'] for a in assignments]
        logger.info(f"Found {len(batch_ids)} assigned batches")
        
        # Get ALL active batches first (without filters to avoid ZendBX issues)
        all_batches = await db.select(
            'batches',
            columns='id, name, day_of_week, start_time, end_time, max_capacity, programme_id, is_active'
        )
        
        if not all_batches:
            logger.warning("No batches found in database")
            return []
        
        # Filter to only assigned, active batches, and optionally by day
        assigned_batches = []
        for b in all_batches:
            if (b['id'] in batch_ids and 
                b.get('is_active', True) and 
                (not day_of_week or b['day_of_week'] == day_of_week)):
                assigned_batches.append(b)
        
        logger.info(f"After filtering: {len(assigned_batches)} batches")
        
        # For each batch, get programme name and student counts
        result = []
        for batch in assigned_batches:
            try:
                # Get programme name
                programme = await db.select(
                    'programmes',
                    columns='name',
                    filters={'id': batch['programme_id']},
                    limit=1
                )
                
                # Get enrollment count from enrollments table
                all_enrollments = await db.select(
                    'enrollments',
                    columns='id, student_id, batch_ids, status'
                )
                
                # Count active enrollments that include this batch
                enrollments_with_batch = []
                if all_enrollments:
                    for enrollment in all_enrollments:
                        if (enrollment.get('batch_ids') and 
                            batch['id'] in enrollment['batch_ids'] and
                            enrollment.get('status') == 'ACTIVE'):
                            enrollments_with_batch.append(enrollment['student_id'])
                
                total_students = len(enrollments_with_batch)
                
                # Get today's attendance
                from datetime import date
                today_str = date.today().isoformat()
                
                attendance = await db.select(
                    'attendance',
                    columns='status',
                    filters={'batch_id': batch['id'], 'class_date': today_str}
                )
                
                present_count = len([a for a in (attendance or []) if a['status'] == 'PRESENT'])
                absent_count = len([a for a in (attendance or []) if a['status'] == 'ABSENT'])
                not_marked = total_students - (present_count + absent_count)
                
                result.append({
                    'id': batch['id'],
                    'label': batch['name'],
                    'weekday': batch['day_of_week'],
                    'start_time': batch['start_time'],
                    'end_time': batch['end_time'],
                    'capacity': batch['max_capacity'],
                    'programme_name': programme[0]['name'] if programme else 'Unknown',
                    'total_students': total_students,
                    'marked_present': present_count,
                    'marked_absent': absent_count,
                    'not_marked': not_marked
                })
            except Exception as batch_error:
                logger.error(f"Error processing batch {batch['id']}: {str(batch_error)}")
                # Continue with other batches
                continue
        
        logger.info(f"Returning {len(result)} batches")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching staff batches: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch batches: {str(e)}")


@router.get("/additional-students")
async def get_additional_students(user_id: str):
    """
    Get ALL students from batches assigned to this staff member
    Returns a flat list with indicator for which are additional class students
    
    Query params:
    - user_id: The app_users.id of the logged-in staff
    """
    try:
        logger.info(f"=== /additional-students called with user_id: {user_id} ===")
        
        # Get staff record
        staff_result = await db.select(
            'staff',
            columns='id',
            filters={'user_id': user_id},
            limit=1
        )
        
        if not staff_result or len(staff_result) == 0:
            logger.error(f"Staff record not found for user_id: {user_id}")
            raise HTTPException(status_code=404, detail="Staff record not found")
        
        staff_id = staff_result[0]['id']
        logger.info(f"Found staff_id: {staff_id}")
        
        # Get batch assignments for this staff
        assignments = await db.select(
            'staff_batches',
            columns='batch_id',
            filters={'staff_id': staff_id}
        )
        
        if not assignments:
            logger.info(f"No batch assignments found for staff {staff_id}")
            return {"students": []}
        
        batch_ids = [a['batch_id'] for a in assignments]
        logger.info(f"Staff assigned to {len(batch_ids)} batches")
        
        # Get batch info
        all_batches = await db.select(
            'batches',
            columns='id, name'
        )
        batch_lookup = {b['id']: b['name'] for b in (all_batches or [])}
        
        # Get all additional class assignments (to mark which students are additional)
        all_additional = await db.select(
            'additional_classes',
            columns='student_id, batch_id, is_active'
        )
        
        # Create a set of student-batch pairs that are additional classes
        additional_set = set()
        if all_additional:
            for a in all_additional:
                if a['batch_id'] in batch_ids and a.get('is_active', True):
                    additional_set.add(f"{a['student_id']}-{a['batch_id']}")
        
        logger.info(f"Found {len(additional_set)} additional class assignments in staff's batches")
        
        # Get all enrollments
        all_enrollments = await db.select(
            'enrollments',
            columns='student_id, student_first_name, student_last_name, batch_ids, status'
        )
        
        # Build student list - include ALL students in staff's batches
        students = []
        seen = set()  # To avoid duplicates (student-batch pairs)
        
        # First, add all regularly enrolled students
        for enrollment in (all_enrollments or []):
            if enrollment.get('status') != 'ACTIVE':
                continue
                
            student_id = enrollment['student_id']
            student_batch_ids = enrollment.get('batch_ids', [])
            
            # For each batch this student is enrolled in that the staff teaches
            for batch_id in student_batch_ids:
                if batch_id not in batch_ids:
                    continue  # Skip batches this staff doesn't teach
                
                key = f"{student_id}-{batch_id}"
                if key in seen:
                    continue
                seen.add(key)
                
                # Check if this is an additional class
                is_additional = key in additional_set
                
                students.append({
                    'id': student_id,
                    'student_id': student_id,
                    'first_name': enrollment['student_first_name'],
                    'last_name': enrollment['student_last_name'],
                    'batch_name': batch_lookup.get(batch_id, 'Unknown Batch'),
                    'batch_id': batch_id,
                    'is_additional_class': is_additional
                })
        
        # Second, add students who ONLY have additional classes (not in regular batches)
        if all_additional:
            for additional in all_additional:
                if not additional.get('is_active', True):
                    continue
                
                student_id = additional['student_id']
                batch_id = additional['batch_id']
                
                # Only include if staff teaches this batch
                if batch_id not in batch_ids:
                    continue
                
                key = f"{student_id}-{batch_id}"
                if key in seen:
                    continue  # Already added as regular enrollment
                seen.add(key)
                
                # Find student details from enrollments
                student_enrollment = next(
                    (e for e in all_enrollments if e['student_id'] == student_id and e['status'] == 'ACTIVE'),
                    None
                )
                
                if student_enrollment:
                    students.append({
                        'id': student_id,
                        'student_id': student_id,
                        'first_name': student_enrollment['student_first_name'],
                        'last_name': student_enrollment['student_last_name'],
                        'batch_name': batch_lookup.get(batch_id, 'Unknown Batch'),
                        'batch_id': batch_id,
                        'is_additional_class': True  # This is definitely an additional class
                    })
        
        # Sort by student_id numerically (extract number from ART1001, ART1002, etc.)
        def extract_number(student_id):
            """Extract numeric part from student ID like ART1001 -> 1001"""
            import re
            match = re.search(r'\d+', student_id)
            return int(match.group()) if match else 0
        
        students.sort(key=lambda s: extract_number(s['student_id']))
        
        additional_count = len([s for s in students if s['is_additional_class']])
        logger.info(f"Returning {len(students)} total students ({additional_count} additional class batches)")
        
        return {"students": students}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching additional students: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.post("/additional-students/attendance")
async def submit_additional_students_attendance(attendance_data: dict):
    """
    Submit attendance for additional class students
    
    Request body:
    {
        "user_id": "staff-user-id",
        "attendance": [
            {"student_id": "...", "batch_id": "...", "batch_name": "...", "status": "PRESENT"},
            {"student_id": "...", "batch_id": "...", "batch_name": "...", "status": "ABSENT"}
        ]
    }
    """
    try:
        from datetime import date
        
        user_id = attendance_data.get('user_id')
        attendance_records = attendance_data.get('attendance', [])
        today_str = date.today().isoformat()
        
        logger.info(f"=== ATTENDANCE SUBMISSION START ===")
        logger.info(f"User ID: {user_id}")
        logger.info(f"Records to process: {len(attendance_records)}")
        logger.info(f"Date: {today_str}")
        
        if not user_id or not attendance_records:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        logger.info(f"Submitting attendance for {len(attendance_records)} batch(es)")
        
        # Verify staff
        staff_result = await db.select(
            'staff',
            columns='id',
            filters={'user_id': user_id},
            limit=1
        )
        
        if not staff_result or len(staff_result) == 0:
            logger.error(f"Staff record not found for user_id: {user_id}")
            raise HTTPException(status_code=403, detail="Staff record not found")
        
        staff_id = staff_result[0]['id']
        logger.info(f"Staff ID: {staff_id}")
        
        # Get staff's assigned batches for validation
        assignments = await db.select(
            'staff_batches',
            columns='batch_id',
            filters={'staff_id': staff_id}
        )
        
        assigned_batch_ids = [a['batch_id'] for a in (assignments or [])]
        logger.info(f"Staff assigned to {len(assigned_batch_ids)} batches: {assigned_batch_ids}")
        
        saved_count = 0
        errors = []
        
        for idx, record in enumerate(attendance_records):
            logger.info(f"\n--- Processing record {idx + 1}/{len(attendance_records)} ---")
            
            student_id = record.get('student_id')
            batch_id = record.get('batch_id')
            status = record.get('status')
            
            logger.info(f"Student: {student_id}, Batch: {batch_id}, Status: {status}")
            
            if not batch_id:
                error_msg = f"Missing batch_id for student {student_id}"
                logger.error(error_msg)
                errors.append(error_msg)
                continue
            
            # Verify staff is assigned to this batch
            if batch_id not in assigned_batch_ids:
                error_msg = f"Access denied for batch {batch_id}"
                logger.error(error_msg)
                errors.append(error_msg)
                continue
            
            logger.info(f"✓ Staff has access to batch {batch_id}")
            
            # Verify student exists and is ACTIVE
            all_enrollments = await db.select(
                'enrollments',
                columns='student_id, batch_ids, status',
                filters={'student_id': student_id}
            )
            
            is_active_student = False
            
            if all_enrollments and len(all_enrollments) > 0:
                enrollment = all_enrollments[0]
                is_active_student = enrollment.get('status') == 'ACTIVE'
                logger.info(f"Student status: {enrollment.get('status')}")
            else:
                logger.warning(f"No enrollment found for student {student_id}")
            
            # For additional classes page, we don't require enrollment in that specific batch
            # Student just needs to be ACTIVE in the system
            if not is_active_student:
                error_msg = f"Student {student_id} is not active"
                logger.error(error_msg)
                errors.append(error_msg)
                continue
            
            # Check if this is marked as an additional class (for notes tagging)
            additional_check = await db.select(
                'additional_classes',
                columns='id, is_active',
                filters={
                    'student_id': student_id,
                    'batch_id': batch_id
                },
                limit=1
            )
            
            is_additional_class = (
                additional_check and 
                len(additional_check) > 0 and 
                additional_check[0].get('is_active', True)
            )
            
            # If not an additional class assignment, consider it an ad-hoc additional class
            if not is_additional_class:
                is_additional_class = True  # All attendance from this page is considered additional class
            
            logger.info(f"Is additional class: {is_additional_class}")
            logger.info(f"✓ Student {student_id} can attend batch {batch_id} as additional class")
            
            # Delete existing attendance for today
            existing = await db.select(
                'attendance',
                columns='id',
                filters={
                    'student_id': student_id,
                    'batch_id': batch_id,
                    'class_date': today_str
                }
            )
            
            if existing and len(existing) > 0:
                for att in existing:
                    await db.delete('attendance', {'id': att['id']})
                logger.info(f"✓ Deleted {len(existing)} existing attendance record(s)")
            
            # Get current IN_PROGRESS session
            session_id = None
            try:
                student_sessions = await db.select(
                    'student_sessions',
                    columns='session_id',
                    filters={'student_id': student_id, 'status': 'IN_PROGRESS'},
                    limit=1
                )
                if student_sessions:
                    session_id = student_sessions[0]['session_id']
                    logger.info(f"✓ Found session: {session_id}")
            except Exception as e:
                logger.warning(f"Could not find session for student: {e}")
            
            # Insert new attendance record
            attendance_record = {
                'student_id': student_id,
                'batch_id': batch_id,
                'class_date': today_str,
                'status': status,
                'notes': 'Additional class attendance' if is_additional_class else None
            }
            
            if session_id:
                attendance_record['session_id'] = session_id
            
            logger.info(f"Attempting to insert attendance: {attendance_record}")
            
            try:
                result = await db.insert('attendance', attendance_record)
                
                if result and len(result) > 0:
                    saved_count += 1
                    attendance_id = result[0]['id']
                    logger.info(f"✅ SUCCESS! Saved attendance ID: {attendance_id}")
                    
                    # Handle post-attendance actions based on status
                    if status == 'PRESENT':
                        # Trigger session automation for qualifying attendance
                        try:
                            from app.services.session_service import session_service
                            
                            automation_result = await session_service.process_attendance_completion(
                                student_id=student_id,
                                attendance_id=attendance_id
                            )
                            
                            if automation_result.get('processed'):
                                completion = automation_result.get('completion_result', {})
                                if completion.get('completed'):
                                    logger.info(f"Session completed for {student_id}!")
                        
                        except Exception as auto_error:
                            logger.error(f"Session automation failed: {auto_error}")
                            # Don't fail attendance submission
                    
                    elif status == 'ABSENT':
                        # Auto-create compensation request
                        try:
                            compensation_data = {
                                "student_id": student_id,
                                "original_attendance_id": attendance_id,
                                "original_batch_id": batch_id,
                                "original_date": today_str,
                                "status": "PENDING_APPROVAL",
                                "notes": f"Auto-created for absence on {today_str}"
                            }
                            
                            compensation = await db.insert("compensations", compensation_data)
                            
                            if compensation:
                                logger.info(f"Auto-created compensation request for {student_id}")
                        
                        except Exception as comp_error:
                            logger.warning(f"Failed to create compensation: {comp_error}")
                else:
                    error_msg = f"Insert returned empty result for student {student_id}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    
            except Exception as insert_error:
                error_msg = f"Failed to insert attendance for {student_id}: {str(insert_error)}"
                logger.error(error_msg)
                errors.append(error_msg)
        
        logger.info(f"\n=== ATTENDANCE SUBMISSION COMPLETE ===")
        logger.info(f"Successfully saved: {saved_count}/{len(attendance_records)}")
        logger.info(f"Errors: {len(errors)}")
        
        if errors:
            logger.warning(f"Errors encountered: {errors}")
        
        return {
            "success": True,
            "message": f"Attendance saved for {saved_count} batch(es)",
            "saved": saved_count,
            "errors": errors if errors else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving attendance: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save attendance: {str(e)}")


@router.get("/my-batches")
async def get_my_batches_simple(user_id: str):
    """
    Get simple list of batches assigned to staff member
    Used by staff additional students page
    
    Query params:
    - user_id: The app_users.id of the logged-in staff
    """
    try:
        logger.info(f"=== /my-batches called with user_id: {user_id} ===")
        
        # Get staff record
        try:
            staff_result = await db.select(
                'staff',
                columns='id',
                filters={'user_id': user_id},
                limit=1
            )
            logger.info(f"Staff query result: {staff_result}")
        except Exception as staff_error:
            logger.error(f"Error querying staff table: {str(staff_error)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(staff_error)}")
        
        if not staff_result or len(staff_result) == 0:
            logger.error(f"Staff record not found for user_id: {user_id}")
            raise HTTPException(status_code=404, detail="Staff record not found")
        
        staff_id = staff_result[0]['id']
        logger.info(f"Found staff_id: {staff_id}")
        
        # Get batch assignments
        try:
            assignments = await db.select(
                'staff_batches',
                columns='batch_id',
                filters={'staff_id': staff_id}
            )
            logger.info(f"Batch assignments query result: {assignments}")
        except Exception as assign_error:
            logger.error(f"Error querying staff_batches: {str(assign_error)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(assign_error)}")
        
        if not assignments:
            logger.info(f"No batch assignments found for staff {staff_id}")
            return {"batches": []}
        
        batch_ids = [a['batch_id'] for a in assignments]
        logger.info(f"Found {len(batch_ids)} assigned batch IDs: {batch_ids}")
        
        # Get ALL batches (without order_by to avoid ZendBX issues)
        try:
            all_batches = await db.select(
                'batches',
                columns='id, name, day_of_week, start_time, end_time, is_active'
            )
            logger.info(f"Batches query returned {len(all_batches) if all_batches else 0} batches")
        except Exception as batch_error:
            logger.error(f"Error querying batches table: {str(batch_error)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(batch_error)}")
        
        if not all_batches:
            logger.warning("No batches found in database")
            return {"batches": []}
        
        # Filter to only assigned and active batches
        assigned_batches = []
        for b in all_batches:
            if b['id'] in batch_ids and b.get('is_active', True):
                assigned_batches.append({
                    'id': b['id'],
                    'name': b['name'],
                    'day_of_week': b['day_of_week'],
                    'start_time': b['start_time'],
                    'end_time': b['end_time']
                })
        
        logger.info(f"Returning {len(assigned_batches)} batches")
        return {"batches": assigned_batches}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in /my-batches: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching staff batches: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch batches: {str(e)}")


@router.get("/attendance/records")
async def get_attendance_records(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    batch_id: Optional[str] = None,
    status: Optional[str] = None
):
    """
    Get attendance records for admin view with filtering
    
    Query params:
    - start_date: Filter by start date (YYYY-MM-DD)
    - end_date: Filter by end date (YYYY-MM-DD)
    - batch_id: Filter by specific batch
    - status: Filter by attendance status
    """
    try:
        from datetime import date
        
        # Default to today if no dates provided
        if not start_date:
            start_date = date.today().isoformat()
        if not end_date:
            end_date = date.today().isoformat()
        
        # Build filters
        filters = {}
        if batch_id:
            filters['batch_id'] = batch_id
        if status:
            filters['status'] = status
        
        # Get attendance records
        attendance = await db.select(
            'attendance',
            columns='id, student_id, batch_id, session_id, class_date, status, notes, created_at, updated_at'
        )
        
        # Filter by date range (client-side since ZendBX doesn't support range filters well)
        if attendance:
            attendance = [
                a for a in attendance
                if start_date <= a['class_date'] <= end_date
            ]
        
        # Apply other filters
        if filters:
            attendance = [
                a for a in (attendance or [])
                if all(a.get(k) == v for k, v in filters.items())
            ]
        
        return attendance or []
        
    except Exception as e:
        logger.error(f"Error fetching attendance records: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch attendance records: {str(e)}")


@router.post("/batches/{batch_id}/attendance")
async def submit_batch_attendance(
    batch_id: UUID,
    attendance_data: dict
):
    """
    Submit bulk attendance for a batch
    
    SECURITY: Validates that staff is assigned to the batch and students are enrolled.
    
    Request body:
    {
        "user_id": "staff-user-id",
        "class_date": "2026-08-19",
        "attendance": [
            {"student_id": "...", "status": "PRESENT"},
            {"student_id": "...", "status": "ABSENT"}
        ]
    }
    """
    try:
        from datetime import date, timedelta
        
        user_id = attendance_data.get('user_id')
        class_date = attendance_data.get('class_date')
        attendance_records = attendance_data.get('attendance', [])
        
        if not user_id or not class_date or not attendance_records:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # SECURITY VALIDATION: Verify staff is assigned to this batch
        logger.info(f"Verifying staff {user_id} is assigned to batch {batch_id}")
        
        staff_result = await db.select(
            'staff',
            columns='id',
            filters={'user_id': user_id},
            limit=1
        )
        
        if not staff_result or len(staff_result) == 0:
            raise HTTPException(status_code=403, detail="Staff record not found")
        
        staff_id = staff_result[0]['id']
        
        # Verify batch assignment
        assignment = await db.select(
            'staff_batches',
            columns='id, is_active',
            filters={'staff_id': staff_id, 'batch_id': str(batch_id)},
            limit=1
        )
        
        if not assignment or len(assignment) == 0 or not assignment[0].get('is_active', True):
            logger.warning(f"Staff {user_id} attempted to mark attendance for unassigned batch {batch_id}")
            raise HTTPException(
                status_code=403,
                detail="Access denied: You are not assigned to this batch"
            )
        
        # Get batch info
        batch = await db.select(
            'batches',
            columns='id, name, day_of_week, programme_id',
            filters={'id': str(batch_id)},
            limit=1
        )
        
        if not batch or len(batch) == 0:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        batch_data = batch[0]
        
        # Get enrolled students from enrollments table
        # Both Foundation and Advanced students are now assigned via batch_ids
        all_enrollments = await db.select(
            'enrollments',
            columns='student_id, batch_ids, status'
        )
        
        enrolled_student_ids = []
        if all_enrollments:
            for enrollment in all_enrollments:
                if (enrollment.get('batch_ids') and 
                    str(batch_id) in enrollment['batch_ids'] and
                    enrollment.get('status') == 'ACTIVE'):
                    enrolled_student_ids.append(enrollment['student_id'])
        
        # Also get additional class students for this batch
        try:
            additional_students = await db.select(
                'additional_classes',
                columns='student_id, is_active',
                filters={'batch_id': str(batch_id)}
            )
            
            # Filter to only active assignments
            if additional_students:
                additional_students = [a for a in additional_students if a.get('is_active', True)]
            
            if additional_students:
                for additional in additional_students:
                    student_id = additional['student_id']
                    if student_id not in enrolled_student_ids:
                        # Verify student is active in enrollments
                        student_enrollment = next(
                            (e for e in all_enrollments if e['student_id'] == student_id and e['status'] == 'ACTIVE'),
                            None
                        )
                        if student_enrollment:
                            enrolled_student_ids.append(student_id)
                            logger.info(f"✅ Added additional class student {student_id} to allowed list")
        except Exception as e:
            logger.error(f"Error checking additional classes: {e}")
            # Continue without additional class students
        
        # Get week boundaries for validation
        class_date_obj = date.fromisoformat(class_date)
        week_start = class_date_obj - timedelta(days=class_date_obj.weekday())
        
        marked_count = 0
        present_count = 0
        absent_count = 0
        errors = []
        
        # Process each attendance record
        for record in attendance_records:
            student_id = record.get('student_id')
            status = record.get('status')
            
            # Validate student is enrolled
            if student_id not in enrolled_student_ids:
                errors.append(f"Student {student_id} is not enrolled in this batch")
                continue
            
            # For PRESENT status, check business rules
            if status == 'PRESENT':
                # Check if already attended today
                same_day_attendance = await db.select(
                    'attendance',
                    columns='id',
                    filters={
                        'student_id': student_id,
                        'class_date': class_date,
                        'status': 'PRESENT'
                    }
                )
                
                if same_day_attendance and len(same_day_attendance) > 0:
                    errors.append(f"Student already attended a class today")
                    continue
                
                # Check weekly limit (2 classes max)
                # Note: This is a simplified check
                # In production, you'd need more sophisticated date filtering
            
            # Delete existing attendance for this student/batch/date
            existing = await db.select(
                'attendance',
                columns='id',
                filters={
                    'student_id': student_id,
                    'batch_id': str(batch_id),
                    'class_date': class_date
                }
            )
            
            if existing:
                for att in existing:
                    await db.delete('attendance', {'id': att['id']})
            
            # Get current IN_PROGRESS session
            session_id = None
            try:
                student_sessions = await db.select(
                    'student_sessions',
                    columns='session_id',
                    filters={'student_id': student_id, 'status': 'IN_PROGRESS'},
                    limit=1
                )
                if student_sessions:
                    session_id = student_sessions[0]['session_id']
            except Exception as e:
                logger.warning(f"Could not find session for student: {e}")
            
            # Insert new attendance
            new_attendance = {
                'student_id': student_id,
                'batch_id': str(batch_id),
                'class_date': class_date,
                'status': status
            }
            
            if session_id:
                new_attendance['session_id'] = session_id
            
            created = await db.insert('attendance', new_attendance)
            
            if created:
                marked_count += 1
                if status == 'PRESENT':
                    present_count += 1
                    
                    # Trigger session automation
                    try:
                        from app.services.session_service import session_service
                        await session_service.process_attendance_completion(
                            student_id=student_id,
                            attendance_id=created[0]['id']
                        )
                    except Exception as auto_error:
                        logger.error(f"Session automation failed: {auto_error}")
                        # Don't fail attendance submission
                else:
                    absent_count += 1
                    
                    # AUTO-CREATE COMPENSATION REQUEST FOR ABSENT STUDENT
                    try:
                        attendance_id = created[0]['id']
                        
                        compensation_data = {
                            "student_id": student_id,
                            "original_attendance_id": attendance_id,
                            "original_batch_id": str(batch_id),
                            "original_date": class_date,
                            "status": "PENDING_APPROVAL",
                            "notes": f"Auto-created for absence on {class_date}"
                        }
                        
                        compensation = await db.insert("compensations", compensation_data)
                        
                        if compensation:
                            logger.info(f"✓ Auto-created compensation request for student {student_id}")
                            
                            # Create notification for admin
                            try:
                                notification_data = {
                                    "type": "COMPENSATION_REQUEST",
                                    "title": "New Compensation Request",
                                    "message": f"Student {student_id} was absent on {class_date}. Compensation request created automatically.",
                                    "priority": "NORMAL",
                                    "status": "UNREAD",
                                    "reference_type": "compensation",
                                    "reference_id": compensation[0]['id']
                                }
                                
                                await db.insert("notifications", notification_data)
                                logger.info(f"✓ Created notification for compensation {compensation[0]['id']}")
                            except Exception as notif_error:
                                logger.warning(f"Failed to create notification: {notif_error}")
                    
                    except Exception as comp_error:
                        logger.error(f"Failed to create compensation for student {student_id}: {comp_error}")
                        # Don't fail attendance submission if compensation creation fails
        
        logger.info(f"Attendance submitted: {marked_count} marked ({present_count} present, {absent_count} absent)")
        
        return {
            'success': True,
            'marked_count': marked_count,
            'present_count': present_count,
            'absent_count': absent_count,
            'errors': errors,
            'message': f'Attendance saved: {present_count} present, {absent_count} absent'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting attendance: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit attendance: {str(e)}")


@router.get("/batches/{batch_id}/students")
async def get_batch_students(batch_id: UUID, user_id: str):
    """
    Get all students enrolled in a batch with attendance info
    
    SECURITY: Verifies that the staff member is assigned to this batch before returning students.
    This prevents staff from accessing batches they are not assigned to by changing the URL.
    
    For Advanced batches: Returns all Advanced students who have selected this day
    For Foundation batches: Returns students assigned to this specific batch
    
    Query params:
    - user_id: The app_users.id of the logged-in staff member (required for security validation)
    """
    try:
        from datetime import date, timedelta
        today_str = date.today().isoformat()
        
        # SECURITY VALIDATION: Verify staff is assigned to this batch
        logger.info(f"Verifying staff {user_id} is assigned to batch {batch_id}")
        
        # Get staff record
        staff_result = await db.select(
            'staff',
            columns='id',
            filters={'user_id': user_id},
            limit=1
        )
        
        if not staff_result or len(staff_result) == 0:
            logger.warning(f"Staff record not found for user {user_id}")
            raise HTTPException(status_code=403, detail="Staff record not found")
        
        staff_id = staff_result[0]['id']
        
        # Check if staff is assigned to this batch
        assignment = await db.select(
            'staff_batches',
            columns='id, is_active',
            filters={'staff_id': staff_id, 'batch_id': str(batch_id)},
            limit=1
        )
        
        if not assignment or len(assignment) == 0 or not assignment[0].get('is_active', True):
            logger.warning(f"Staff {user_id} attempted to access unassigned batch {batch_id}")
            raise HTTPException(
                status_code=403, 
                detail="Access denied: You are not assigned to this batch"
            )
        
        logger.info(f"✅ Staff {user_id} is assigned to batch {batch_id}")
        
        # Get batch info
        batch = await db.select(
            'batches',
            columns='id, name, start_time, end_time, programme_id',
            filters={'id': str(batch_id)},
            limit=1
        )
        
        if not batch or len(batch) == 0:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        batch_data = batch[0]
        
        # Get programme name
        programme = await db.select(
            'programmes',
            columns='name',
            filters={'id': batch_data['programme_id']},
            limit=1
        )
        
        batch_data['programmes'] = {'name': programme[0]['name'] if programme else 'Unknown'}
        
        # Get enrolled ACTIVE students from enrollments table
        # Both Foundation and Advanced students are now assigned to batches via batch_ids
        logger.info(f"Querying enrollments table for batch {batch_id}")
        
        all_enrollments = await db.select(
            'enrollments',
            columns='id, student_id, student_first_name, student_last_name, status, batch_ids, student_grade, student_school_name'
        )
        
        logger.info(f"Found {len(all_enrollments) if all_enrollments else 0} total enrollments")
        
        # Filter to students who have this batch in their batch_ids array and are ACTIVE
        enrolled_students = []
        if all_enrollments:
            for enrollment in all_enrollments:
                batch_ids = enrollment.get('batch_ids')
                status = enrollment.get('status')
                
                # Check if this batch is in the student's batch_ids array
                if batch_ids and str(batch_id) in batch_ids and status == 'ACTIVE':
                    enrolled_students.append({
                        'id': enrollment['student_id'],
                        'student_id': enrollment['student_id'],
                        'first_name': enrollment['student_first_name'],
                        'last_name': enrollment['student_last_name'],
                        'status': enrollment['status'],
                        'is_additional_class': False
                    })
                    logger.info(f"✅ Matched student: {enrollment.get('student_id')}")
        
        # Get additional class students
        logger.info(f"Querying additional_classes table for batch {batch_id}")
        additional_assignments = await db.select(
            'additional_classes',
            columns='student_id, is_active',
            filters={'batch_id': str(batch_id)}
        )
        
        # Filter to only active assignments in Python
        if additional_assignments:
            additional_assignments = [a for a in additional_assignments if a.get('is_active', True)]
        
        if additional_assignments and len(additional_assignments) > 0:
            logger.info(f"Found {len(additional_assignments)} additional class assignments")
            
            # Get student details for additional class students
            enrolled_student_ids = [s['student_id'] for s in enrolled_students]
            
            for assignment in additional_assignments:
                student_id = assignment['student_id']
                
                # Skip if already in enrolled students (shouldn't happen, but safety check)
                if student_id in enrolled_student_ids:
                    continue
                
                # Find student in enrollments
                student_enrollment = next(
                    (e for e in all_enrollments if e['student_id'] == student_id and e['status'] == 'ACTIVE'),
                    None
                )
                
                if student_enrollment:
                    enrolled_students.append({
                        'id': student_enrollment['student_id'],
                        'student_id': student_enrollment['student_id'],
                        'first_name': student_enrollment['student_first_name'],
                        'last_name': student_enrollment['student_last_name'],
                        'status': student_enrollment['status'],
                        'is_additional_class': True
                    })
                    logger.info(f"✅ Added additional class student: {student_id}")
        
        logger.info(f"Total enrolled students found: {len(enrolled_students)}")
        
        if not enrolled_students or len(enrolled_students) == 0:
            return {
                'batch': batch_data,
                'students': []
            }
        
        # Get today's attendance using student_id field (e.g., "STU12345678")
        attendance_records = await db.select(
            'attendance',
            columns='id, student_id, status',
            filters={'batch_id': str(batch_id), 'class_date': today_str}
        )
        
        attendance_map = {a['student_id']: a for a in (attendance_records or [])}
        
        # Get week start (Monday)
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_start_str = week_start.isoformat()
        
        # Add attendance info to each student
        for student in enrolled_students:
            # Use student_id (e.g., "STU12345678") not the UUID id
            student_identifier = student['student_id']
            att = attendance_map.get(student_identifier)
            student['attendance_status'] = att['status'] if att else None
            student['attendance_id'] = att['id'] if att else None
            
            # Calculate weekly class count using student_id
            weekly_attendance = await db.select(
                'attendance',
                columns='id',
                filters={
                    'student_id': student_identifier,
                    'status': 'PRESENT'
                }
            )
            
            # Filter to this week
            this_week_count = 0
            if weekly_attendance:
                for att_rec in weekly_attendance:
                    # Since we can't filter by date range in ZendBX filters, check all and count
                    # In a real implementation, this would be more efficient
                    this_week_count = len([a for a in weekly_attendance])  # Simplified for now
            
            student['weekly_classes_count'] = this_week_count
            student['has_class_today'] = att is not None and att['status'] == 'PRESENT'
        
        logger.info(f"Returning {len(enrolled_students)} students for batch {batch_id}")
        
        return {
            'batch': batch_data,
            'students': enrolled_students
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching batch students: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch students: {str(e)}")
