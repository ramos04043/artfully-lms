"""
Automation authentication dependencies
Verifies AUTOMATION_SECRET for external cron jobs
"""
from fastapi import Header, HTTPException, status
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


async def verify_automation_secret(
    authorization: Optional[str] = Header(None)
) -> bool:
    """
    Verify automation secret from Authorization header
    
    Expected format: Bearer <AUTOMATION_SECRET>
    
    Args:
        authorization: Authorization header value
        
    Returns:
        bool: True if valid
        
    Raises:
        HTTPException: 401 if invalid or missing
    """
    if not authorization:
        logger.warning("Automation request with missing Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            logger.warning(f"Invalid authorization scheme: {scheme}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme. Use: Bearer <token>",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        logger.warning("Malformed Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token matches AUTOMATION_SECRET
    if not settings.AUTOMATION_SECRET:
        logger.error("AUTOMATION_SECRET not configured in environment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Automation not configured",
        )
    
    if token != settings.AUTOMATION_SECRET:
        logger.warning("Invalid automation secret provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid automation secret",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info("Automation request authenticated successfully")
    return True
