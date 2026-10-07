"""
Direct SQL Authentication Endpoint
Uses RPC/SQL function instead of REST API to bypass permission issues
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import bcrypt
import jwt
from datetime import datetime, timedelta
from app.zendbx_client import db
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """
    Direct SQL login using app_users table
    """
    try:
        # Query app_users table - avoid boolean filter that causes 500 error
        users = await db.select(
            table="app_users",
            columns="id,username,email,password_hash",
            filters={"email": credentials.email}
        )
        
        if not users or len(users) == 0:
            logger.warning(f"User not found: {credentials.email}")
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        user = users[0]
        logger.info(f"User found: {user['email']}, verifying password...")
        
        # Verify password
        password_bytes = credentials.password.encode('utf-8')
        hash_bytes = user['password_hash'].encode('utf-8')
        
        if not bcrypt.checkpw(password_bytes, hash_bytes):
            logger.warning(f"Password verification failed for: {credentials.email}")
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        logger.info(f"Password verified for: {credentials.email}")
        
        # Extract name from username (format: FirstName_LastName or just email)
        username = user.get('username', user['email'].split('@')[0])
        name_parts = username.split('_') if '_' in username else [username, '']
        first_name = name_parts[0] if name_parts else 'Admin'
        last_name = name_parts[1] if len(name_parts) > 1 else 'User'
        
        # Determine role from email
        role = 'ADMIN' if 'admin' in user['email'].lower() else 'STAFF'
        
        # Generate JWT token
        token_data = {
            "sub": str(user['id']),
            "email": user['email'],
            "role": role,
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        
        access_token = jwt.encode(
            token_data,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        logger.info(f"Token generated for: {credentials.email}")
        
        # Prepare user response
        user_response = {
            "id": str(user['id']),
            "email": user['email'],
            "role": role,
            "first_name": first_name,
            "last_name": last_name,
            "is_active": True,
        }
        
        return LoginResponse(
            access_token=access_token,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/health")
async def health():
    """Health check for auth endpoint"""
    return {"status": "ok", "message": "Direct auth endpoint working"}
