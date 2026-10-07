"""
Custom Authentication Endpoint
Uses app_users table instead of ZendBX Auth
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
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


class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """
    Custom login endpoint using app_users table
    """
    try:
        # Query app_users table
        users = await db.select(
            table="app_users",
            columns="*",
            filters={"email": credentials.email}
        )
        
        if not users or len(users) == 0:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        user = users[0]
        
        # Verify password
        password_bytes = credentials.password.encode('utf-8')
        hash_bytes = user['password_hash'].encode('utf-8')
        
        if not bcrypt.checkpw(password_bytes, hash_bytes):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Get user details from users table if exists
        user_details = None
        try:
            user_records = await db.select(
                table="users",
                columns="*",
                filters={"email": credentials.email}
            )
            if user_records and len(user_records) > 0:
                user_details = user_records[0]
        except Exception as e:
            logger.warning(f"Could not fetch from users table: {e}")
        
        # Generate JWT token
        token_data = {
            "sub": str(user['id']),
            "email": user['email'],
            "username": user['username'],
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        
        access_token = jwt.encode(
            token_data,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        # Prepare user response
        user_response = {
            "id": str(user['id']),
            "email": user['email'],
            "username": user['username'],
            "role": user_details.get('role', 'ADMIN') if user_details else 'ADMIN',
            "first_name": user_details.get('first_name', user['username']) if user_details else user['username'],
            "last_name": user_details.get('last_name', '') if user_details else '',
            "is_active": user_details.get('is_active', True) if user_details else True,
        }
        
        return LoginResponse(
            access_token=access_token,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/signup")
async def signup(request: SignupRequest):
    """
    Custom signup endpoint using app_users table
    """
    try:
        # Check if user already exists
        existing_users = await db.select(
            table="app_users",
            columns="id",
            filters={"email": request.email}
        )
        
        if existing_users and len(existing_users) > 0:
            raise HTTPException(
                status_code=409,
                detail="User with this email already exists"
            )
        
        # Hash password
        password_bytes = request.password.encode('utf-8')
        salt = bcrypt.gensalt(rounds=10)
        password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        
        # Insert into app_users
        new_user = await db.insert(
            table="app_users",
            data={
                "username": request.username,
                "email": request.email,
                "password_hash": password_hash
            }
        )
        
        return {
            "message": "User created successfully",
            "user": {
                "id": str(new_user[0]['id']),
                "email": new_user[0]['email'],
                "username": new_user[0]['username']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Signup failed: {str(e)}"
        )


@router.get("/me")
async def get_current_user(token: str):
    """
    Get current user from token
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        users = await db.select(
            table="app_users",
            columns="*",
            filters={"id": user_id}
        )
        
        if not users or len(users) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = users[0]
        
        return {
            "id": str(user['id']),
            "email": user['email'],
            "username": user['username']
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
