"""
Authentication Dependencies
"""
from fastapi import Depends, HTTPException, status, Header
from typing import Optional
from app.core.security import decode_access_token
from app.zendbx_client import db


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Get current user ID from JWT token
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
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    
    # Decode token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    return user_id


async def get_current_user(user_id: str = Depends(get_current_user_id)) -> dict:
    """
    Get current user from database
    """
    users = await db.select("users", filters={"id": user_id})
    
    if not users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    user = users[0]
    
    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )
    
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """
    Require user to be ADMIN
    """
    if user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def require_staff(user: dict = Depends(get_current_user)) -> dict:
    """
    Require user to be STAFF (or ADMIN)
    """
    role = user.get("role")
    if role not in ["STAFF", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return user
