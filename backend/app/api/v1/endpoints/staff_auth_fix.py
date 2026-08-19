"""
Staff Auth Fix Endpoint
Provides endpoints to check and link existing ZendBX auth accounts to staff records
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.zendbx_client import db
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class AuthLinkRequest(BaseModel):
    email: str
    auth_user_id: str


@router.get("/check-auth-status")
async def check_staff_auth_status():
    """
    Check which staff members have auth and which don't
    NO AUTHENTICATION REQUIRED - This is a utility endpoint
    """
    try:
        staff_members = await db.select(
            'app_users',
            columns='id, email, first_name, last_name, auth_user_id',
            filters={'role': 'STAFF'}
        )
        
        with_auth = [s for s in staff_members if s.get('auth_user_id')]
        without_auth = [s for s in staff_members if not s.get('auth_user_id')]
        
        return {
            'total': len(staff_members),
            'with_auth': len(with_auth),
            'without_auth': len(without_auth),
            'staff_with_auth': [{'email': s['email'], 'name': f"{s['first_name']} {s['last_name']}", 'auth_user_id': s.get('auth_user_id')} for s in with_auth],
            'staff_without_auth': [{'id': s['id'], 'email': s['email'], 'name': f"{s['first_name']} {s['last_name']}"} for s in without_auth]
        }
        
    except Exception as e:
        logger.error(f"Error checking auth status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/link-auth")
async def link_auth_to_staff(request: AuthLinkRequest):
    """
    Link an existing ZendBX auth user to a staff record
    
    Use this after manually creating auth accounts in ZendBX dashboard
    NO AUTHENTICATION REQUIRED - This is a setup utility
    """
    try:
        # Find staff member by email
        staff_result = await db.select(
            'app_users',
            columns='id, email, auth_user_id',
            filters={'email': request.email, 'role': 'STAFF'},
            limit=1
        )
        
        if not staff_result or len(staff_result) == 0:
            raise HTTPException(status_code=404, detail=f"Staff member not found: {request.email}")
        
        staff = staff_result[0]
        
        if staff.get('auth_user_id'):
            return {
                'message': 'Staff member already has auth linked',
                'email': request.email,
                'auth_user_id': staff['auth_user_id']
            }
        
        # Update the auth_user_id
        await db.update(
            'app_users',
            data={'auth_user_id': request.auth_user_id},
            filters={'id': staff['id']}
        )
        
        logger.info(f"✅ Linked auth {request.auth_user_id} to staff {request.email}")
        
        return {
            'message': 'Auth account linked successfully',
            'email': request.email,
            'auth_user_id': request.auth_user_id,
            'can_login': True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error linking auth: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auth-users")
async def get_zendbx_auth_users():
    """
    Get list of auth users from ZendBX auth.users table
    This helps match auth accounts to staff records
    NO AUTHENTICATION REQUIRED - This is a setup utility
    """
    try:
        # Query auth.users table directly
        auth_users = await db.select(
            'auth.users',
            columns='id, email, created_at',
            order_by='created_at.desc'
        )
        
        return {
            'total': len(auth_users) if auth_users else 0,
            'users': auth_users or []
        }
        
    except Exception as e:
        logger.error(f"Error fetching auth users: {e}", exc_info=True)
        # Return empty if we can't access auth.users
        return {
            'total': 0,
            'users': [],
            'error': str(e),
            'note': 'Direct access to auth.users may be restricted. Use ZendBX Dashboard to view auth users.'
        }
