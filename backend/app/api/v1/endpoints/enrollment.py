from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import httpx
import os

router = APIRouter()

class EnrollmentCreate(BaseModel):
    student_id: str
    student_first_name: str
    student_last_name: str
    student_date_of_birth: Optional[date] = None
    student_gender: Optional[str] = None
    student_email: Optional[str] = None
    student_phone: Optional[str] = None
    student_address: Optional[str] = None
    student_school_name: Optional[str] = None
    student_grade: Optional[str] = None
    parent_first_name: str
    parent_last_name: str
    parent_email: str
    parent_phone: str
    parent_relationship: Optional[str] = 'Parent'
    batch_ids: List[str]
    status: str = 'ACTIVE'


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
