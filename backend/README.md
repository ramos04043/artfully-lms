# Art Studio Management - Backend

FastAPI backend with Python 3.11+

## Tech Stack

- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Server**: Uvicorn
- **Database**: PostgreSQL (via ZendBX)
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt (passlib)
- **Validation**: Pydantic v2
- **Background Tasks**: Celery + Redis
- **Email**: aiosmtplib

## Project Structure

```
app/
├── main.py              # FastAPI application entry point
├── core/                # Core configurations
│   ├── config.py       # Settings management
│   ├── security.py     # Auth utilities
│   └── logging_config.py
├── api/                 # API layer
│   └── v1/
│       ├── router.py   # Main API router
│       └── endpoints/  # API endpoints
│           ├── auth.py
│           ├── students.py
│           ├── batches.py
│           ├── attendance.py
│           ├── compensations.py
│           ├── sessions.py
│           ├── fees.py
│           ├── finance.py
│           ├── reports.py
│           ├── notifications.py
│           ├── staff.py
│           ├── audit.py
│           └── settings.py
├── models/              # Pydantic models (request/response)
├── schemas/             # Database schemas
├── services/            # Business logic layer
│   ├── auth_service.py
│   ├── student_service.py
│   ├── batch_service.py
│   ├── attendance_service.py
│   ├── compensation_service.py
│   ├── session_service.py
│   ├── payment_service.py
│   └── finance_service.py
├── repositories/        # Data access layer
│   └── base_repository.py
├── auth/                # Authentication
│   ├── deps.py         # Dependencies
│   └── permissions.py  # Permission checks
├── zendbx/              # ZendBX integration
│   ├── client.py       # ZendBX client
│   ├── repository.py   # Base repository
│   └── queries.py      # Common queries
├── notifications/       # Notification system
│   ├── email.py
│   └── templates/
├── finance/             # Financial operations
├── attendance/          # Attendance operations
├── sessions/            # Session operations
└── audit/               # Audit logging
```

## Installation

### Prerequisites

- Python 3.11 or higher
- PostgreSQL (via ZendBX)
- Redis (for background tasks)

### Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration
```

## Environment Variables

Create a `.env` file:

```env
# Application
APP_NAME=Art Studio Management
APP_ENV=development
DEBUG=true
API_V1_PREFIX=/api

# Server
HOST=0.0.0.0
PORT=8000

# Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ZendBX
ZENDBX_URL=your_zendbx_url
ZENDBX_ANON_KEY=your_zendbx_anon_key
ZENDBX_SERVICE_KEY=your_zendbx_service_key
DATABASE_URL=postgresql://user:password@host:5432/art_studio

# CORS
CORS_ORIGINS=["http://localhost:3000"]

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=noreply@artstudio.com

# Redis
REDIS_URL=redis://localhost:6379/0
```

## Development

```bash
# Run development server
python -m app.main

# Or with uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Access API docs
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

## Database Setup

1. Create database in ZendBX dashboard
2. Run the schema:

```bash
# Connect to your PostgreSQL database
psql -h your_host -U your_user -d art_studio

# Run schema file
\i docs/database/schema.sql
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Students
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `GET /api/students/{id}` - Get student
- `PUT /api/students/{id}` - Update student
- `POST /api/students/{id}/pause` - Pause student
- `POST /api/students/{id}/resume` - Resume student

### Batches
- `GET /api/batches` - List batches
- `POST /api/batches` - Create batch
- `GET /api/batches/{id}` - Get batch
- `PUT /api/batches/{id}` - Update batch

### Attendance
- `GET /api/attendance/today` - Today's classes
- `POST /api/attendance/submit` - Submit attendance
- `GET /api/attendance` - List attendance
- `PUT /api/attendance/{id}/correct` - Correct attendance

### Compensations
- `GET /api/compensations` - List compensations
- `POST /api/compensations/validate` - Validate compensation
- `POST /api/compensations` - Assign compensation
- `PUT /api/compensations/{id}/approve` - Approve/reject

### Payments
- `GET /api/fees` - List fee dues
- `POST /api/payments` - Create payment

### Finance
- `GET /api/finance/summary` - Financial summary
- `GET /api/finance/transactions` - Transaction history
- `POST /api/finance/expenses` - Create expense

### Reports
- `POST /api/reports/attendance` - Attendance report
- `POST /api/reports/fees` - Fee report
- `POST /api/reports/export/csv` - Export CSV

## Service Layer Pattern

```python
# services/student_service.py

class StudentService:
    def __init__(self, db):
        self.db = db
    
    async def create_student(
        self, 
        data: CreateStudentDTO
    ) -> Student:
        # Validation
        # Business logic
        # Database operations
        # Return result
        pass
```

## Repository Pattern

```python
# repositories/base_repository.py

class BaseRepository:
    def __init__(self, db):
        self.db = db
    
    async def get_by_id(self, id: str):
        pass
    
    async def list(self, filters: dict):
        pass
    
    async def create(self, data: dict):
        pass
    
    async def update(self, id: str, data: dict):
        pass
```

## Authentication

JWT-based authentication:

```python
from app.auth.deps import get_current_user, require_admin

@router.get("/admin-only")
async def admin_endpoint(
    current_user: User = Depends(require_admin)
):
    return {"message": "Admin access granted"}
```

## Authorization

Role-based access control:

```python
from app.auth.permissions import check_permission

async def check_staff_batch_access(
    staff_id: str,
    batch_id: str
) -> bool:
    # Check if staff has access to batch
    pass
```

## Error Handling

```python
from fastapi import HTTPException, status

# Not found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Student not found"
)

# Validation error
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid batch selection"
)

# Unauthorized
raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials"
)

# Forbidden
raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Access denied"
)
```

## Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Run with coverage
pytest --cov=app tests/
```

## Deployment

### Production Checklist

- [ ] Set `DEBUG=false`
- [ ] Use strong `SECRET_KEY`
- [ ] Configure proper CORS origins
- [ ] Set up HTTPS
- [ ] Configure proper database connection
- [ ] Set up Redis for background tasks
- [ ] Configure email SMTP
- [ ] Set up logging
- [ ] Configure file uploads
- [ ] Set up monitoring

### Run Production Server

```bash
# With Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

# Or with Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Code Conventions

- Use **type hints** for all functions
- Use **async/await** for I/O operations
- Use **Pydantic models** for validation
- Follow **PEP 8** style guide
- Use **descriptive variable names**
- Add **docstrings** to functions
- Handle **exceptions** properly
- Log important operations
- Validate all inputs
- Never trust client data

## Security Best Practices

- ✅ Password hashing (bcrypt)
- ✅ JWT tokens with expiration
- ✅ CORS configuration
- ✅ Input validation
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting (consider adding)
- ✅ HTTPS in production
- ✅ Secure headers
- ✅ Audit logging

## License

Proprietary - Art Studio Management System
