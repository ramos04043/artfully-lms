# Art Studio Management System

A beautiful, production-ready management system for art schools with two distinct portals:

## 🎨 System Overview

- **Admin Portal** (Desktop-first): Complete studio operations management
- **Staff Portal** (Mobile-first): Simple attendance workflow

## 🏗️ Architecture

```
React + TypeScript (Vite)
         ↓
  FastAPI REST API
         ↓
      ZendBX
         ↓
    PostgreSQL
```

## 🎯 Key Features

### Admin Portal
- Dashboard with real-time studio insights
- Student enrollment & management
- Batch & programme configuration
- Attendance monitoring & corrections
- Leave & compensation management
- Session progress tracking
- Fee management & payments
- Financial overview (CapEX/OpEX)
- Reports & analytics
- Staff management
- Audit logs
- System settings

### Staff Portal
- Today's classes view
- Quick attendance marking
- Class history
- Profile management

## 🎨 Design Philosophy

**Artistic, Warm, Professional**

- Soft Indigo primary (#6366F1)
- Sage Green secondary (#86B69C)
- Warm Peach accent (#F2B38D)
- Clean, minimal interface
- Art school inspired visual language

## 📁 Project Structure

```
art-studio/
├── frontend/          # React + TypeScript SPA
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── lib/
│   │   └── utils/
│   └── package.json
│
├── backend/           # FastAPI + Python
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── auth/
│   │   └── zendbx/
│   └── requirements.txt
│
└── docs/
    └── database/      # Database schema & migrations
```

## 🚀 Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- React Hook Form
- Zod
- TanStack Query
- Recharts
- Lucide React

### Backend
- Python 3.11+
- FastAPI
- Pydantic
- Uvicorn
- ZendBX SDK

### Database
- ZendBX (PostgreSQL)

## 📊 Database Tables (25 Total)

### Core Entities
1. **users** - Authentication and user accounts
2. **students** - Student profiles
3. **parents** - Parent/guardian profiles
4. **student_parents** - Student-parent relationships
5. **staff** - Staff information
6. **programmes** - Art programmes
7. **batches** - Class batches
8. **student_batches** - Student enrollment in batches
9. **staff_batches** - Staff batch assignments
10. **sessions** - Learning sessions
11. **student_sessions** - Session enrollment & progress

### Attendance & Compensation
12. **attendance** - Daily attendance records
13. **compensations** - Compensation class assignments

### Finance
14. **fee_dues** - Fee structure
15. **payments** - Payment transactions
16. **financial_accounts** - CapEX/OpEX accounts
17. **financial_transactions** - Immutable financial ledger
18. **expenses** - Studio expenses

### Operations
19. **holidays** - Holiday calendar
20. **class_cancellations** - Cancelled classes
21. **notifications** - System notifications
22. **email_events** - Email tracking
23. **subscription_events** - Student lifecycle events
24. **audit_logs** - Complete audit trail
25. **app_settings** - System configuration

## 🔒 Security & Authorization

- ZendBX authentication
- Role-based access control (Admin/Staff)
- Server-side authorization enforcement
- Row-level security where applicable
- Audit logging for sensitive operations

## 📱 Responsive Design

- **Admin Portal**: Desktop-optimized (1280px+)
- **Staff Portal**: Mobile-first (320px+)

## 🎓 Business Rules

### Foundation Programme Defaults
- 8 classes per session
- 2 classes per week
- Students select 2 batches
- Maximum 15 students per batch
- No same-day batch conflicts

### Attendance
- Defaults to UNMARKED
- Staff submissions lock attendance
- Admin can correct with audit trail
- Absence creates admin notification

### Compensation
- Admin approval required
- One compensation per absence
- Validates future date
- Checks batch capacity
- Prevents same-day conflicts

### Finance
- Supports partial payments
- Bank/Cash payment modes
- Payments create OpEX inflows
- Immutable ledger
- Separate CapEX/OpEX tracking

## 📖 Getting Started

See individual README files in:
- `/frontend/README.md`
- `/backend/README.md`

## 📝 License

Proprietary - Art Studio Management System
