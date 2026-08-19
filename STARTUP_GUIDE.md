# 🚀 LMS Startup Guide

## ✅ System Status

Both frontend and backend are now running successfully!

### Frontend (React + Vite + ZendBX)
- **URL**: http://localhost:3000/
- **Status**: ✅ Running
- **Port**: 3000

### Backend (FastAPI + Python)
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Status**: ✅ Running  
- **Port**: 8000

## 🔧 What Was Fixed

### Issue 1: Missing UI Components
- ✅ Created `components/ui/toaster.tsx`
- ✅ Created `components/ui/toast.tsx`
- ✅ Created `hooks/use-toast.ts`

### Issue 2: Duplicate Key Warning
- ✅ Fixed duplicate `CANCELLED` key in `utils.ts`

### Issue 3: Black Screen (Loading State)
- ✅ Changed `isLoading` default from `true` to `false` in auth store
- ✅ App now loads correctly and shows login page

### Issue 4: Backend Environment Variables
- ✅ Created `.env` file with ZendBX credentials
- ✅ Backend now starts successfully

## 🎯 How to Use

### 1. Login (Development Mode)

The app is currently in mock authentication mode:

**For Admin Access:**
- Email: `admin@example.com` (or any email containing "admin")
- Password: `anything`
- Redirects to: `/admin` dashboard

**For Staff Access:**
- Email: `staff@example.com` (or any email WITHOUT "admin")
- Password: `anything`
- Redirects to: `/staff` dashboard

### 2. ZendBX Integration

The ZendBX SDK is fully configured but **not yet activated** for authentication. To enable it:

1. Open `src/main.tsx`
2. Uncomment these lines:
   ```typescript
   import { initializeAuth, setupAuthListener } from './lib/zendbx-auth'
   initializeAuth()
   setupAuthListener()
   ```
3. Update `src/pages/auth/login-page.tsx` to use ZendBX auth functions

### 3. Available Helper Functions

Check `src/lib/zendbx-examples.ts` for ready-to-use functions:
- `getAllStudents()`
- `createStudent()`
- `updateStudent()`
- `deleteStudent()`
- `searchStudents()`
- `enrollStudentInBatch()`
- `uploadStudentDocument()`
- And many more...

## 📁 Project Structure

```
lms/
├── frontend/
│   ├── src/
│   │   ├── components/ui/     # UI components (toast, etc.)
│   │   ├── hooks/             # Custom hooks
│   │   ├── layouts/           # Layout components
│   │   ├── lib/               # Utilities & ZendBX config
│   │   ├── pages/             # Page components
│   │   ├── stores/            # Zustand stores
│   │   └── types/             # TypeScript types
│   └── .env                   # ✅ Configured with ZendBX
│
└── backend/
    ├── app/
    │   ├── api/               # API routes
    │   ├── core/              # Core config
    │   └── main.py            # FastAPI app
    └── .env                   # ✅ Configured with ZendBX

```

## 🔐 Environment Variables

### Frontend `.env`
```env
VITE_API_URL=http://localhost:8000
VITE_ZENDBX_URL=https://api.zendbx.in
VITE_ZENDBX_ANON_KEY=eyJhbGc...  # ✅ Configured
VITE_ZENDBX_PROJECT_SLUG=artschoollms  # ✅ Configured
```

### Backend `.env`
```env
ZENDBX_URL=https://api.zendbx.in
ZENDBX_ANON_KEY=eyJhbGc...  # ✅ Configured
DATABASE_URL=postgresql://...  # ⚠️ Update if using PostgreSQL
SECRET_KEY=...  # ⚠️ Change in production
```

## 🛠️ Development Commands

### Start Both Servers
Servers are currently running. If you need to restart:

**Frontend:**
```bash
cd frontend
npm run dev
```

**Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Stop Servers
Use Ctrl+C in the terminal or use the Kiro process manager.

## 🎨 Next Steps

1. **Try the Login** - Visit http://localhost:3000/ and login
2. **Explore Admin Dashboard** - Use admin@example.com to access admin features
3. **Test ZendBX SDK** - Import and use helper functions from `zendbx-examples.ts`
4. **Check API Docs** - Visit http://localhost:8000/docs for backend API documentation
5. **Enable Real Auth** - Uncomment ZendBX initialization in `main.tsx`

## 📚 Documentation

- **ZendBX Setup**: `frontend/ZENDBX_SETUP.md`
- **API Documentation**: http://localhost:8000/docs
- **Implementation Guide**: `IMPLEMENTATION_GUIDE.md`
- **Quick Reference**: `QUICK_REFERENCE.md`

## ⚠️ Important Notes

1. **Mock Authentication**: Currently using mock auth for development
2. **Database**: Backend expects PostgreSQL (update DATABASE_URL if needed)
3. **Service Key**: Add `ZENDBX_SERVICE_KEY` for backend operations
4. **Production**: Change SECRET_KEY before deploying

## 🆘 Troubleshooting

### Black Screen?
- ✅ Fixed! Auth store loading state corrected

### Missing Components?
- ✅ Fixed! All UI components created

### Backend Won't Start?
- ✅ Fixed! Environment variables configured

### Still Having Issues?
1. Clear browser cache
2. Restart both servers
3. Check browser console for errors
4. Check terminal for server logs

---

**Status**: ✅ All systems operational!  
**Last Updated**: 2026-08-14 22:43 PM
