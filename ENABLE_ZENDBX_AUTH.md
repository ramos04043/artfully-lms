# Enable Authentication in ZendBX Console

## The Problem
```
Exception Message: relation "auth.users" does not exist
```

This means **Authentication is NOT enabled** in your ZendBX project.

---

## Solution: Enable Authentication in ZendBX Console

### Step 1: Go to ZendBX Console
Open: https://console.zendbx.in

### Step 2: Select Your Project
Click on: **artfully-database**

### Step 3: Enable Authentication

Look for one of these options in the sidebar:
- **Settings** → Authentication
- **Authentication** (direct menu item)
- **Project Settings** → Enable Auth

### Step 4: Enable/Configure Auth

You should see an option like:
- ☐ **Enable Authentication** (check this box)
- OR a toggle switch to enable auth
- OR "Authentication Status: Disabled" → Click to enable

**Important Settings:**
- ✅ Enable Email/Password authentication
- ✅ Allow user signups (at least temporarily)
- ✅ Email confirmation: Disabled (for development)

### Step 5: Save Settings

Click **Save** or **Apply Changes**

---

## After Enabling Authentication

### Test 1: Try Registration Again

Go back to the HTML registration page and click "Register Admin User"

**Expected Success:**
```
✅ Success!
User registered in ZendBX Auth.
```

### Test 2: Verify in Console

In ZendBX Console:
1. Go to **Authentication** → **Users**
2. You should see: `admin@artfully.in`

### Test 3: Login to Your App

1. Go to: http://localhost:5173/login
2. Email: `admin@artfully.in`
3. Password: `artfully@123`
4. Click **Sign In**

Should work! ✅

---

## Alternative: Contact ZendBX Support

If you don't see an option to enable Authentication:

1. **Check Documentation**: https://docs.zendbx.com
2. **Support Email**: support@zendbx.in (or check their website)
3. **Discord/Slack**: Check if they have a community

**Tell them:**
> "I need to enable Authentication for my project 'artfully-database'. 
> I'm getting error: 'relation auth.users does not exist' when calling 
> /v1/auth/signup endpoint."

---

## Temporary Workaround: Use Your Own Auth

If ZendBX auth can't be enabled, you can implement custom authentication:

### Option 1: Bypass ZendBX Auth (Development Only)

Modify your login to validate against the `users` table directly:

**In `zendbx-auth.ts`:**
```typescript
// Instead of calling db.auth.signIn(), call your backend API:
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

**Create backend endpoint** (`backend/app/api/v1/endpoints/auth.py`):
```python
@router.post("/auth/login")
async def login(email: str, password: str):
    # Query users table
    users = await db.select("users", filters={"email": email})
    if not users:
        raise HTTPException(401, "Invalid credentials")
    
    user = users[0]
    
    # Verify password with bcrypt
    import bcrypt
    if not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        raise HTTPException(401, "Invalid credentials")
    
    # Generate JWT token
    from app.core.security import create_access_token
    token = create_access_token({"sub": user["id"]})
    
    return {"user": user, "token": token}
```

### Option 2: Use Different Auth Provider

Switch to:
- **Supabase** (similar to ZendBX)
- **Firebase Auth**
- **Auth0**
- **Custom JWT auth**

---

## Quick Checklist

- [ ] Go to ZendBX Console
- [ ] Find Authentication or Settings
- [ ] Enable Authentication feature
- [ ] Enable Email/Password method
- [ ] Allow signups
- [ ] Save settings
- [ ] Try registration again
- [ ] Verify user created in Auth → Users
- [ ] Test login in your app

---

## Most Likely Solution

Based on the error, Authentication is simply not enabled yet in your ZendBX project. 

**The fix is probably just:**
1. Go to Console
2. Find the Auth toggle/checkbox
3. Enable it
4. Save
5. Try again

It should be a simple on/off setting in the project configuration.

---

## Screenshots to Look For

In ZendBX Console, look for UI like:

```
┌─────────────────────────────────┐
│ Authentication                  │
├─────────────────────────────────┤
│ ☐ Enable Authentication         │
│                                 │
│ Authentication Methods:         │
│ ☑ Email/Password               │
│ ☐ OAuth (Google, GitHub, etc)  │
│                                 │
│ [Save Settings]                 │
└─────────────────────────────────┘
```

---

**Action Required**: Enable Authentication in ZendBX Console  
**Expected Time**: 2 minutes  
**Blocker**: ZendBX Auth not configured yet
