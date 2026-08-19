# Art Studio Management System - Complete Setup Guide

## 🎯 Quick Start

This guide will get your Art Studio Management System running in development mode.

---

## ✅ Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Python** (v3.11 or higher)
   - Download: https://www.python.org/downloads/
   - Verify: `python --version`

3. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

4. **ZendBX Account**
   - Sign up for ZendBX
   - Create a new project
   - Get your connection details

5. **Redis** (for background tasks)
   - Windows: https://github.com/microsoftarchive/redis/releases
   - Mac: `brew install redis`
   - Linux: `sudo apt-get install redis-server`

---

## 📦 Step 1: Database Setup

### 1.1 Create ZendBX Project

1. Log into your ZendBX dashboard
2. Create a new project: "art-studio"
3. Note down:
   - Project URL
   - Anon Key
   - Service Key
   - Database connection string

### 1.2 Run Database Schema

```bash
# Option 1: Using ZendBX SQL Editor
# Copy contents of docs/database/schema.sql
# Paste into ZendBX SQL Editor
# Run the script

# Option 2: Using psql
psql -h your_zendbx_host -U your_user -d art_studio -f docs/database/schema.sql
```

### 1.3 Verify Tables

Check that all 25 tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- app_settings
- attendance
- audit_logs
- batches
- class_cancellations
- compensations
- email_events
- expenses
- fee_dues
- financial_accounts
- financial_transactions
- holidays
- notifications
- parents
- payments
- programmes
- sessions
- staff
- staff_batches
- student_batches
- student_parents
- student_sessions
- students
- subscription_events
- users

---

## 🔧 Step 2: Backend Setup

### 2.1 Navigate to Backend

```bash
cd backend
```

### 2.2 Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 2.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 2.4 Configure Environment

```bash
# Copy example env file
copy .env.example .env    # Windows
cp .env.example .env      # Linux/Mac
```

Edit `.env` file:

```env
# Application
APP_NAME=Art Studio Management
APP_ENV=development
DEBUG=true
API_V1_PREFIX=/api

# Server
HOST=0.0.0.0
PORT=8000

# Security (CHANGE THIS!)
SECRET_KEY=your-super-secret-key-minimum-32-characters-long!
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ZendBX (from Step 1.1)
ZENDBX_URL=https://your-project.zendbx.com
ZENDBX_ANON_KEY=your_anon_key
ZENDBX_SERVICE_KEY=your_service_key
DATABASE_URL=postgresql://user:password@host:5432/art_studio

# CORS (Frontend URL)
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]

# Email (Optional - for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=noreply@artstudio.com

# Redis
REDIS_URL=redis://localhost:6379/0

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads

# Logging
LOG_LEVEL=INFO
```

### 2.5 Start Backend Server

```bash
# Method 1: Direct Python
python -m app.main

# Method 2: Uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend is running:
- Open: http://localhost:8000
- Open: http://localhost:8000/docs (API documentation)

---

## 🎨 Step 3: Frontend Setup

### 3.1 Navigate to Frontend

```bash
# Open a NEW terminal window
cd frontend
```

### 3.2 Install Dependencies

```bash
npm install
```

This will take a few minutes...

### 3.3 Install shadcn/ui

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# When prompted, select:
# Style: Default
# Base color: Neutral
# CSS variables: Yes
```

### 3.4 Install UI Components

```bash
# Install all required components at once
npx shadcn-ui@latest add button input card table dialog form select toast tabs avatar badge calendar dropdown-menu separator switch tooltip
```

### 3.5 Configure Environment

```bash
# Copy example env file
copy .env.example .env    # Windows
cp .env.example .env      # Linux/Mac
```

Edit `.env` file:

```env
VITE_API_URL=http://localhost:8000
VITE_ZENDBX_URL=https://your-project.zendbx.com
VITE_ZENDBX_ANON_KEY=your_anon_key
```

### 3.6 Start Frontend Server

```bash
npm run dev
```

Frontend will open at: http://localhost:5173 (or 3000)

---

## 🧪 Step 4: Test the Application

### 4.1 Access Login Page

Open your browser to: http://localhost:5173/login

### 4.2 Test Admin Access

**Development Mode Login:**

```
Email: admin@artstudio.com
Password: (any password)
```

This uses mock authentication for development.

You should be redirected to: `/admin` (Admin Dashboard)

### 4.3 Test Staff Access

Log out and log in again:

```
Email: staff@artstudio.com
Password: (any password)
```

You should be redirected to: `/staff` (Staff Portal)

### 4.4 Verify Database

Check that the default data was created:

```sql
-- Check programmes
SELECT * FROM programmes;

-- Check financial accounts
SELECT * FROM financial_accounts;

-- Check default admin user
SELECT * FROM users;
```

---

## 🚀 Step 5: Initial Configuration

### 5.1 Change Default Admin Password

⚠️ **IMPORTANT**: The default admin user uses a placeholder password.

1. Log in as admin
2. Go to Settings
3. Change the admin password
4. Update password hash in database

### 5.2 Create First Real Staff User

1. Log in as admin
2. Go to Staff Management
3. Add a new staff member:
   - First Name: Your name
   - Email: Your email
   - Employee ID: STAFF001
   - Date of Joining: Today
   - Create login credentials

### 5.3 Create First Programme (if needed)

1. Go to Programmes
2. Verify "Foundation" programme exists
3. Adjust settings if needed:
   - Session class count: 8
   - Classes per week: 2
   - Fee per session: ₹3000

### 5.4 Create First Batches

1. Go to Batches
2. Create batches for different days:
   - Monday 3:45 PM - 5:00 PM
   - Tuesday 3:45 PM - 5:00 PM
   - Wednesday 3:45 PM - 5:00 PM
   - etc.
3. Set max capacity: 15
4. Assign room numbers

### 5.5 Assign Staff to Batches

1. Go to Staff Management
2. Select a staff member
3. Assign batches they will teach

---

## 📱 Step 6: Test Core Workflows

### 6.1 Test Student Enrollment

1. Log in as Admin
2. Go to Students > New Enrollment
3. Complete the 6-step wizard:
   - Step 1: Student info
   - Step 2: Parent info
   - Step 3: Select programme
   - Step 4: Select 2 batches (different days!)
   - Step 5: Session & fees
   - Step 6: Review & confirm
4. Verify student appears in Students list

### 6.2 Test Staff Attendance

1. Log in as Staff (use staff account)
2. Go to Today tab
3. Should see today's classes
4. Click "Mark Attendance"
5. Mark students present/absent
6. Submit attendance
7. Verify confirmation message

### 6.3 Test Admin Features

1. Log in as Admin
2. Check Dashboard - see stats
3. Go to Attendance - verify staff submission
4. Go to Fees - see pending fees
5. Collect a payment
6. Verify financial transaction created

---

## 🐛 Troubleshooting

### Backend Not Starting

**Error: "No module named 'app'"**
```bash
# Make sure you're in the backend directory
cd backend

# Make sure virtual environment is activated
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Error: "Database connection failed"**
```bash
# Check DATABASE_URL in .env
# Verify ZendBX project is running
# Test connection with psql
```

### Frontend Not Starting

**Error: "Cannot find module"**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

**Error: "Module not found: @/..."**
```bash
# Check tsconfig.json has path aliases
# Restart dev server
```

### shadcn/ui Components Not Working

```bash
# Reinstall components
npx shadcn-ui@latest add button input card table
```

### CORS Errors

```bash
# Check backend .env CORS_ORIGINS includes frontend URL
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# Restart backend server
```

### Database Schema Errors

```bash
# Drop all tables and recreate
# WARNING: This deletes all data!

# In psql:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Run schema.sql again
\i docs/database/schema.sql
```

---

## 📚 Next Steps

### Phase 1: Complete Authentication
- [ ] Implement real JWT authentication
- [ ] Add password reset flow
- [ ] Add remember me functionality
- [ ] Set up session management

### Phase 2: Build Student Management
- [ ] Complete student CRUD operations
- [ ] Build enrollment wizard with validation
- [ ] Add batch capacity checks
- [ ] Implement pause/resume functionality

### Phase 3: Build Attendance System
- [ ] Complete staff attendance marking
- [ ] Add Admin attendance overview
- [ ] Implement attendance corrections
- [ ] Add absence notifications

### Phase 4-8: Continue Implementation
Follow the IMPLEMENTATION_GUIDE.md for detailed phase-by-phase instructions.

---

## 🎓 Learning Resources

### FastAPI
- Official Docs: https://fastapi.tiangolo.com/
- Tutorial: https://fastapi.tiangolo.com/tutorial/

### React + TypeScript
- React Docs: https://react.dev/
- TypeScript Handbook: https://www.typescriptlang.org/docs/

### TanStack Query
- Docs: https://tanstack.com/query/latest

### shadcn/ui
- Docs: https://ui.shadcn.com/
- Components: https://ui.shadcn.com/docs/components

### Tailwind CSS
- Docs: https://tailwindcss.com/docs

---

## ❓ Getting Help

1. Check IMPLEMENTATION_GUIDE.md for detailed instructions
2. Check docs/database/TABLES.md for database documentation
3. Review frontend/README.md for frontend conventions
4. Review backend/README.md for backend patterns

---

## ✅ Success Checklist

- [ ] Database created with all 25 tables
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] Can access API docs at http://localhost:8000/docs
- [ ] Can log in as Admin
- [ ] Can log in as Staff
- [ ] Default programmes exist
- [ ] Default financial accounts exist
- [ ] Can navigate all admin pages
- [ ] Can navigate all staff pages

**If all checked, you're ready to start implementing!** 🎉

Proceed to IMPLEMENTATION_GUIDE.md for detailed phase-by-phase implementation instructions.

---

Built with care for art schools everywhere 🎨
