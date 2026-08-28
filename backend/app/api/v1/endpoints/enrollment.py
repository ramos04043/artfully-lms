from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
import httpx
import os

router = APIRouter()

class EnrollmentCreate(BaseModel):
    student_id: str
    student_first_name: str
    student_last_name: Optional[str] = ''
    student_date_of_birth: Optional[date] = None
    student_gender: Optional[str] = None
    student_email: Optional[str] = None
    student_phone: Optional[str] = None
    student_address: Optional[str] = None
    student_school_name: Optional[str] = None
    student_grade: Optional[str] = None
    parent_first_name: str
    parent_last_name: Optional[str] = ''
    parent_email: Optional[str] = ''
    parent_phone: str
    parent_relationship: Optional[str] = 'Parent'
    batch_ids: List[str]
    status: str = 'ACTIVE'


class EnrollmentStatusUpdate(BaseModel):
    status: str
    paused_reason: Optional[str] = None


@router.post("/enrollments")
async def create_enrollment(enrollment: EnrollmentCreate):
    """Create a new student enrollment"""
    
    zendbx_url = os.getenv('ZENDBX_URL', 'https://api.zendbx.in')
    zendbx_key = os.getenv('ZENDBX_SERVICE_KEY')
    project_slug = 'artfully-database'
    
    print(f"ZENDBX_URL: {zendbx_url}")
    print(f"ZENDBX_SERVICE_KEY present: {bool(zendbx_key)}")
    print(f"ZENDBX_SERVICE_KEY value: {zendbx_key[:20] if zendbx_key else 'None'}...")
    
    if not zendbx_key:
        raise HTTPException(status_code=500, detail="ZendBX service key not configured")
    
    url = f"{zendbx_url}/p/{project_slug}/v1/rest/enrollments"
    
    headers = {
        'Content-Type': 'application/json',
        'apikey': zendbx_key,
        'Authorization': f'Bearer {zendbx_key}',
        'Prefer': 'return=representation'
    }
    
    # Convert enrollment model to dict and handle date serialization
    enrollment_data = enrollment.dict()
    if enrollment_data.get('student_date_of_birth'):
        enrollment_data['student_date_of_birth'] = enrollment_data['student_date_of_birth'].isoformat()
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=enrollment_data, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.patch("/enrollments/{enrollment_id}")
async def update_enrollment(enrollment_id: str, enrollment: EnrollmentCreate):
    """Update an existing enrollment"""
    import httpx
    
    zendbx_url = os.getenv('ZENDBX_URL', 'https://api.zendbx.in')
    zendbx_key = os.getenv('ZENDBX_SERVICE_KEY')
    project_slug = 'artfully-database'
    
    if not zendbx_key:
        raise HTTPException(status_code=500, detail="ZendBX service key not configured")
    
    url = f"{zendbx_url}/p/{project_slug}/v1/rest/enrollments?id=eq.{enrollment_id}"
    
    headers = {
        'Content-Type': 'application/json',
        'apikey': zendbx_key,
        'Authorization': f'Bearer {zendbx_key}',
        'Prefer': 'return=representation'
    }
    
    # Convert enrollment model to dict and handle date serialization
    enrollment_data = enrollment.dict()
    if enrollment_data.get('student_date_of_birth'):
        enrollment_data['student_date_of_birth'] = enrollment_data['student_date_of_birth'].isoformat() if enrollment_data['student_date_of_birth'] else None
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.patch(url, json=enrollment_data, headers=headers, timeout=30.0)
            
            if response.status_code >= 400:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"ZendBX error: {response.text}"
                )
            
            return response.json() if response.text else {"success": True}
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.patch("/enrollments/{enrollment_id}/status")
async def update_enrollment_status(enrollment_id: str, status_update: EnrollmentStatusUpdate):
    """
    Update enrollment status (pause/resume student)
    
    The enrollments table only has a 'status' column, not paused_at or paused_reason
    """
    import httpx
    
    zendbx_url = os.getenv('ZENDBX_URL', 'https://api.zendbx.in')
    zendbx_key = os.getenv('ZENDBX_SERVICE_KEY')
    project_slug = 'artfully-database'
    
    if not zendbx_key:
        raise HTTPException(status_code=500, detail="ZendBX service key not configured")
    
    try:
        # Only update status - enrollments table doesn't have paused_at or paused_reason
        update_data = {
            'status': status_update.status
        }
        
        url = f"{zendbx_url}/p/{project_slug}/v1/rest/enrollments?id=eq.{enrollment_id}"
        
        headers = {
            'Content-Type': 'application/json',
            'apikey': zendbx_key,
            'Authorization': f'Bearer {zendbx_key}',
            'Prefer': 'return=representation'
        }
        
        print(f"Updating enrollment {enrollment_id} status to: {status_update.status}")
        print(f"URL: {url}")
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(url, json=update_data, headers=headers, timeout=30.0)
            
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
            
            if response.status_code >= 400:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"ZendBX error: {response.text}"
                )
            
            result = response.json() if response.text else []
            return {"success": True, "data": result}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating enrollment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
