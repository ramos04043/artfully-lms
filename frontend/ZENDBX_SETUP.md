# ZendBX SDK Setup Guide

## ✅ Installation Complete

The ZendBX SDK (v1.2.1) has been successfully installed and configured in your project.

## 📁 Created Files

1. **`src/lib/zendbx.ts`** - Main ZendBX client configuration
2. **`src/lib/zendbx-auth.ts`** - Authentication helper functions
3. **`src/lib/zendbx-examples.ts`** - Usage examples for common operations
4. **`.env`** - Environment variables (copied from .env.example)

## 🔧 Configuration

### Step 1: Update Environment Variables

Edit your `.env` file and add your ZendBX credentials:

```env
# ZendBX Configuration
VITE_ZENDBX_URL=https://api.zendbx.in
VITE_ZENDBX_ANON_KEY=your_actual_anon_key_here
VITE_ZENDBX_PROJECT_SLUG=your_actual_project_slug_here
```

### Step 2: Initialize Auth in Your App

Update `src/main.tsx` to initialize auth on app load:

```typescript
import { initializeAuth, setupAuthListener } from './lib/zendbx-auth';

// Initialize auth state
initializeAuth();

// Setup auth state listener
const unsubscribe = setupAuthListener();

// Optional: cleanup on app unmount
window.addEventListener('beforeunload', unsubscribe);
```

## 🚀 Usage Examples

### Basic Database Queries

```typescript
import { db } from '@/lib/zendbx';

// Select all students
const { data, error } = await db.from('students').select('*');

// With filters
const { data } = await db
  .from('students')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(20);
```

### Authentication

```typescript
import { signInWithZendBX, signOutFromZendBX } from '@/lib/zendbx-auth';

// Sign in
const { data, error } = await signInWithZendBX(
  'user@example.com',
  'password123'
);

// Sign out
await signOutFromZendBX();
```

### Insert Data

```typescript
// Insert a new student
const { data, error } = await db.from('students').insert({
  name: 'John Doe',
  email: 'john@example.com',
  status: 'active',
});
```

### Update Data

```typescript
// Update student
const { data, error } = await db
  .from('students')
  .update({ status: 'inactive' })
  .eq('id', 'student-uuid');
```

### Delete Data

```typescript
// Delete student
const { data, error } = await db
  .from('students')
  .delete()
  .eq('id', 'student-uuid');
```

### File Upload

```typescript
import { db } from '@/lib/zendbx';

const bucket = db.storage.bucket('student-documents');
const { data, error } = await bucket.upload(file, 'filename.pdf');
```

### Realtime Subscriptions

```typescript
// Subscribe to new enrollments
const subscription = db.realtime
  .from('enrollments')
  .on('INSERT', (payload) => {
    console.log('New enrollment:', payload.new);
  })
  .subscribe();

// Unsubscribe when done
subscription.unsubscribe();
```

## 📋 Available Helper Functions

Check `src/lib/zendbx-examples.ts` for comprehensive examples:

- `getAllStudents()` - Fetch all students
- `getActiveStudents()` - Get active students with filters
- `createStudent()` - Create new student
- `updateStudent()` - Update student data
- `deleteStudent()` - Delete student
- `searchStudents()` - Search by name/email
- `enrollStudentInBatch()` - Enroll student in batch
- `uploadStudentDocument()` - Upload files
- `getStudentProfile()` - Get complete student profile
- `subscribeToEnrollments()` - Realtime enrollment updates

## 🎯 Integration with Existing Code

The ZendBX client is configured to work alongside your existing auth store. The integration:

1. Syncs ZendBX auth state with your Zustand store
2. Uses localStorage for token persistence
3. Provides auth state change listeners
4. Compatible with your existing User types

## 🔐 Type Safety

The setup includes type-safe table names:

```typescript
import { table } from '@/lib/zendbx';

// Type-safe table access
const students = await table('students').select('*');
```

## 📊 Realtime Features

ZendBX supports realtime subscriptions for live updates:

- `INSERT` - New record created
- `UPDATE` - Record modified
- `DELETE` - Record deleted
- `*` - All events

## ⚠️ Important Notes

1. **Never commit `.env`** to version control (already in .gitignore)
2. **Always check `error`** before using `data` in responses
3. **Use filters** with `.update()` and `.delete()` to avoid modifying all rows
4. **WebSocket URL** defaults to same host on port 8001 for realtime features

## 🔗 Resources

- [ZendBX Documentation](https://zendbx.in/docs)
- [TypeScript SDK Reference](https://zendbx.in/docs/sdk/typescript)

## 🆘 Troubleshooting

### Issue: "Invalid anon key"
- Check your `.env` file has the correct `VITE_ZENDBX_ANON_KEY`
- Restart your dev server after changing .env

### Issue: "Project not found"
- Verify `VITE_ZENDBX_PROJECT_SLUG` matches your project slug in ZendBX dashboard

### Issue: Realtime not working
- Ensure WebSocket server is running on port 8001
- Check firewall/network settings

## 🎉 You're Ready!

Your ZendBX SDK is fully configured and ready to use. Start by updating your `.env` file with your actual credentials, then use the helper functions in your components.
