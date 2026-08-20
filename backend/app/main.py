from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api.v1.router import api_router
from app.services.keepalive_service import initialize_keepalive

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info(f"Starting {settings.APP_NAME}")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"CORS Origins: {settings.CORS_ORIGINS}")
    
    # Validate automation configuration
    logger.info("Validating automation configuration...")
    validation = settings.validate_automation_config()
    
    if not validation['valid']:
        logger.error("❌ AUTOMATION CONFIGURATION INVALID")
        logger.error("The following issues must be fixed for automation to work:")
        for issue in validation['issues']:
            logger.error(f"  - {issue}")
        logger.error("Please check your .env file and update the required variables")
    
    if validation['warnings']:
        for warning in validation['warnings']:
            logger.warning(f"  ⚠️  {warning}")
    
    # Initialize keep-alive service for Render free tier
    keepalive_service = None
    if settings.RENDER_EXTERNAL_URL and settings.APP_ENV == "production":
        logger.info("🚀 Initializing keep-alive service for Render free tier...")
        keepalive_service = initialize_keepalive(
            app_url=settings.RENDER_EXTERNAL_URL,
            ping_interval=600  # Ping every 10 minutes
        )
        await keepalive_service.start()
    else:
        if settings.APP_ENV == "production":
            logger.warning("⚠️  RENDER_EXTERNAL_URL not set - keep-alive service disabled")
    
    # Startup
    yield
    
    # Shutdown
    if keepalive_service:
        await keepalive_service.stop()
    logger.info(f"Shutting down {settings.APP_NAME}")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Art Studio Management System API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS Middleware - Support localhost and Vercel deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host Middleware - Disabled for Render deployment
# Render's infrastructure handles host validation
# if not settings.DEBUG:
#     app.add_middleware(
#         TrustedHostMiddleware,
#         allowed_hosts=settings.ALLOWED_HOSTS,
#     )

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "environment": settings.APP_ENV,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
