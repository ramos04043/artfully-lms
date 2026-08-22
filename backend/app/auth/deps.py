"""
Authentication Dependencies
"""
from fastapi import Depends, HTTPException, status, Header
from typing import Optional
import httpx
import logging

from app.core.config import settings
from app.zendbx_client import db

logger = logging.getLogger(__name__)


async def get_current_user_from_zendbx(authorization: Optional[str] = Header(None)) -> dict:
    """
    Get current user from ZendBX access token
    
    This validates the ZendBX JWT token and retrieves the corresponding app_users record.
    
    Flow:
    1. Extract Bearer token from Authorization header
    2. Validate token with ZendBX API
    3. Get auth user ID from ZendBX
    4. Query app_users table using auth_user_id
    5. Return app_users record
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Validate token with ZendBX and get user info
    try:
        async with httpx.AsyncClient() as client:
            # Use ZendBX auth.getUser endpoint to validate token and get user
            response = await client.get(
                f"{settings.ZENDBX_URL}/p/artfully-database/v1/auth/user",
                headers={
                    "apikey": settings.ZENDBX_ANON_KEY,
                    "Authorization": f"Bearer {token}"
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.warning(f"ZendBX token validation failed: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            auth_user_data = response.json()
            
            # Extract auth user ID from response
            # ZendBX may return: {user: {id: ...}} or {id: ...}
            auth_user_id = None
            if isinstance(auth_user_data, dict):
                if 'user' in auth_user_data:
                    auth_user_id = auth_user_data['user'].get('id')
                else:
                    auth_user_id = auth_user_data.get('id')
            
            if not auth_user_id:
                logger.error(f"Could not extract auth_user_id from ZendBX response: {auth_user_data}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload",
                )
            
            logger.info(f"ZendBX token validated for auth_user_id: {auth_user_id}")
            
    except httpx.HTTPError as e:
        logger.error(f"ZendBX API error during token validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication service unavailable",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during token validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
        )
    
    # Query app_users table using auth_user_id
    try:
        app_users = await db.select(
            "app_users",
            columns="id,email,role,first_name,last_name,phone,is_active,auth_user_id",
            filters={"auth_user_id": auth_user_id}
        )
        
        if not app_users or len(app_users) == 0:
            logger.warning(f"No app_users record found for auth_user_id: {auth_user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not registered in application",
            )
        
        user = app_users[0]
        
        if not user.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        
        logger.info(f"Authenticated user: {user['email']} (role: {user['role']})")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying app_users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information",
        )


async def require_admin(user: dict = Depends(get_current_user_from_zendbx)) -> dict:
    """
    Require user to be ADMIN
    """
    if user.get("role") != "ADMIN":
        logger.warning(f"Access denied: User {user.get('email')} attempted admin access with role {user.get('role')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def require_staff(user: dict = Depends(get_current_user_from_zendbx)) -> dict:
    """
    Require user to be STAFF (or ADMIN)
    """
    role = user.get("role")
    if role not in ["STAFF", "ADMIN"]:
        logger.warning(f"Access denied: User {user.get('email')} attempted staff access with role {role}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return user
