"""
Holidays Management Endpoints
Allows admins to mark and manage school holidays
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.zendbx_client import db
from app.auth.deps import require_admin
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class HolidayCreate(BaseModel):
    name: str
    holiday_date: date
    description: Optional[str] = None


class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
async def get_holidays(
    is_active: Optional[bool] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(require_admin)
):
    """
    Get all holidays with optional filtering
    """
    try:
        filters = {}
        
        if is_active is not None:
            filters['is_active'] = is_active
        
        # Get holidays
        holidays = await db.select(
            'holidays',
            columns='id, name, holiday_date, description, is_active, created_at, updated_at',
            filters=filters if filters else None,
            order_by='holiday_date.desc',
            limit=1000
        )
        
        # Filter by year if provided
        if year is not None and holidays:
            holidays = [h for h in holidays if h['holiday_date'].startswith(str(year))]
        
        logger.info(f"Retrieved {len(holidays)} holidays")
        return holidays
        
    except Exception as e:
        logger.error(f"Error getting holidays: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get holidays: {str(e)}"
        )


@router.post("")
async def create_holiday(
    holiday: HolidayCreate,
    current_user: dict = Depends(require_admin)
):
    """
    Create a new holiday
    """
    try:
        # Check if holiday already exists for this date
        existing = await db.select(
            'holidays',
            columns='id, name',
            filters={'holiday_date': holiday.holiday_date.isoformat()},
            limit=1
        )
        
        if existing and len(existing) > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Holiday already exists for {holiday.holiday_date}: {existing[0]['name']}"
            )
        
        # Create holiday
        holiday_data = {
            'name': holiday.name,
            'holiday_date': holiday.holiday_date.isoformat(),
            'description': holiday.description,
            'is_active': True
        }
        
        logger.info(f"Creating holiday: {holiday_data}")
        result = await db.insert('holidays', holiday_data)
        
        logger.info(f"✅ Holiday created successfully: {result}")
        
        # Return the created holiday
        if result and len(result) > 0:
            return result[0]
        else:
            # Fetch the created record
            created = await db.select(
                'holidays',
                columns='id, name, holiday_date, description, is_active, created_at',
                filters={'holiday_date': holiday.holiday_date.isoformat()},
                limit=1
            )
            return created[0] if created else {"message": "Holiday created successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating holiday: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create holiday: {str(e)}"
        )


@router.get("/{holiday_id}")
async def get_holiday(
    holiday_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Get a specific holiday by ID
    """
    try:
        holiday = await db.select(
            'holidays',
            columns='id, name, holiday_date, description, is_active, created_at, updated_at',
            filters={'id': holiday_id},
            limit=1
        )
        
        if not holiday or len(holiday) == 0:
            raise HTTPException(status_code=404, detail="Holiday not found")
        
        return holiday[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting holiday: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get holiday: {str(e)}"
        )


@router.patch("/{holiday_id}")
async def update_holiday(
    holiday_id: str,
    holiday_update: HolidayUpdate,
    current_user: dict = Depends(require_admin)
):
    """
    Update a holiday
    """
    try:
        # Check if holiday exists
        existing = await db.select(
            'holidays',
            columns='id',
            filters={'id': holiday_id},
            limit=1
        )
        
        if not existing or len(existing) == 0:
            raise HTTPException(status_code=404, detail="Holiday not found")
        
        # Build update data
        update_data = {}
        if holiday_update.name is not None:
            update_data['name'] = holiday_update.name
        if holiday_update.description is not None:
            update_data['description'] = holiday_update.description
        if holiday_update.is_active is not None:
            update_data['is_active'] = holiday_update.is_active
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update holiday
        await db.update(
            'holidays',
            data=update_data,
            filters={'id': holiday_id}
        )
        
        logger.info(f"✅ Holiday updated: {holiday_id}")
        
        # Return updated holiday
        updated = await db.select(
            'holidays',
            columns='id, name, holiday_date, description, is_active, updated_at',
            filters={'id': holiday_id},
            limit=1
        )
        
        return updated[0] if updated else {"message": "Holiday updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating holiday: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update holiday: {str(e)}"
        )


@router.delete("/{holiday_id}")
async def delete_holiday(
    holiday_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Delete a holiday (soft delete by setting is_active to false)
    """
    try:
        # Check if holiday exists
        existing = await db.select(
            'holidays',
            columns='id, name',
            filters={'id': holiday_id},
            limit=1
        )
        
        if not existing or len(existing) == 0:
            raise HTTPException(status_code=404, detail="Holiday not found")
        
        # Soft delete by setting is_active to false
        await db.update(
            'holidays',
            data={'is_active': False},
            filters={'id': holiday_id}
        )
        
        logger.info(f"✅ Holiday deleted (soft): {existing[0]['name']}")
        
        return {
            "message": f"Holiday '{existing[0]['name']}' deleted successfully",
            "id": holiday_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting holiday: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete holiday: {str(e)}"
        )
