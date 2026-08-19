import { db } from './zendbx';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/user';

/**
 * Sign up a new user with ZendBX
 * User metadata can include role and other custom fields
 */
export const signUpWithZendBX = async (
  email: string,
  password: string,
  name?: string,
  role: 'ADMIN' | 'STAFF' = 'STAFF'
) => {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    name,
    // Store role in user metadata (if ZendBX supports it)
    // metadata: { role }
  });

  if (error) {
    console.error('Sign up error:', error);
    return { data: null, error };
  }

  console.log('✅ Sign up successful:', data);
  
  return { data, error: null };
};

/**
 * Sign in an existing user with ZendBX
 * Uses ZendBX's built-in auth schema
 */
export const signInWithZendBX = async (email: string, password: string) => {
  console.log('🔵 [signInWithZendBX] Starting sign in for:', email);
  
  const response = await db.auth.signIn({
    email,
    password,
  });

  console.log('📦 [signInWithZendBX] Raw response from ZendBX:', response);

  // Handle response - it might be directly the data or wrapped
  const session = response?.access_token ? response : (response?.data || response);
  const zendbxUser = response?.user;

  console.log('🔐 Session:', session);
  console.log('👤 ZendBX User:', zendbxUser);

  if (!session || !session.access_token) {
    console.error('❌ [signInWithZendBX] No valid session in response');
    return { 
      data: null, 
      error: response?.error || { message: 'Invalid response from authentication server' } 
    };
  }

  // Store token in localStorage manually (in case SDK doesn't do it)
  localStorage.setItem('zendbx_token', session.access_token);
  console.log('✅ Token stored in localStorage');

  // Map ZendBX auth user to our User type
  const [firstName, ...lastNameParts] = (zendbxUser?.username || zendbxUser?.email?.split('@')[0] || 'User').split('_');
  const lastName = lastNameParts.join(' ') || 'Name';

  // Determine role based on email (temporary - should be stored in ZendBX user metadata)
  const role: 'ADMIN' | 'STAFF' = zendbxUser?.email?.includes('admin') ? 'ADMIN' : 'STAFF';

  const user: User = {
    id: zendbxUser?.id || session.sub,
    email: zendbxUser?.email || '',
    role: role,
    first_name: firstName,
    last_name: lastName,
    phone: zendbxUser?.phone || '',
    is_active: true,
    created_at: zendbxUser?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('✅ [signInWithZendBX] User mapped successfully:', user);

  // Sync with local auth store
  useAuthStore.getState().setAuth(
    user,
    session.access_token
  );

  console.log('✅ [signInWithZendBX] Auth store updated');

  return { data: { user, session }, error: null };
};

/**
 * Sign out the current user
 */
export const signOutFromZendBX = async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    console.error('Sign out error:', error);
  }

  // Clear ZendBX token from localStorage
  localStorage.removeItem('zendbx_token');

  // Clear local auth store
  useAuthStore.getState().clearAuth();

  console.log('✅ Signed out successfully');

  return { error: error || null };
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async () => {
  const { data } = await db.auth.getUser();
  return data?.user || null;
};

/**
 * Get the current session
 */
export const getCurrentSession = async () => {
  const { data } = await db.auth.getSession();
  return data?.session || null;
};

/**
 * Initialize auth state from ZendBX on app load
 */
export const initializeAuth = async () => {
  useAuthStore.getState().setLoading(true);

  try {
    // Wait for zustand to rehydrate from localStorage (with timeout)
    await Promise.race([
      new Promise((resolve) => {
        const unsubscribe = useAuthStore.subscribe((state) => {
          if (state.isHydrated) {
            console.log('✅ Store hydrated via subscription')
            unsubscribe();
            resolve(true);
          }
        });
        
        // Immediately check if already hydrated
        if (useAuthStore.getState().isHydrated) {
          console.log('✅ Store already hydrated')
          unsubscribe();
          resolve(true);
        }
      }),
      // Timeout after 2 seconds
      new Promise((resolve) => setTimeout(() => {
        console.log('⏱️ Hydration timeout, proceeding anyway')
        useAuthStore.getState().setHydrated(true)
        resolve(true)
      }, 2000))
    ]);

    console.log('🔵 [initializeAuth] Store hydrated, checking persisted auth...');

    // Check ZendBX token in localStorage first
    const zendbxToken = localStorage.getItem('zendbx_token');
    console.log('🔑 ZendBX token in localStorage:', zendbxToken ? 'EXISTS' : 'NOT FOUND');

    // Get persisted user from Zustand
    const persistedUser = useAuthStore.getState().user;
    const persistedToken = useAuthStore.getState().token;

    console.log('👤 Persisted user:', persistedUser ? persistedUser.email : 'NONE');
    console.log('🔐 Persisted token in Zustand:', persistedToken ? 'EXISTS' : 'NOT FOUND');

    if (zendbxToken || (persistedToken && persistedUser)) {
      console.log('✅ [initializeAuth] Found persisted auth, validating with ZendBX...');
      
      // Try to validate the session with ZendBX
      try {
        const response = await db.auth.getSession();
        console.log('📦 getSession response:', response);
        
        // Handle different response formats from ZendBX SDK
        let sessionToken = null;
        
        if (typeof response === 'string') {
          // Response is the token string directly
          sessionToken = response;
        } else if (response?.access_token) {
          // Response is an object with access_token
          sessionToken = response.access_token;
        } else if (response?.data?.access_token) {
          // Response is wrapped in data
          sessionToken = response.data.access_token;
        }
        
        console.log('🔑 Extracted session token:', sessionToken ? 'EXISTS' : 'NOT FOUND');
        
        if (sessionToken) {
          console.log('✅ [initializeAuth] Session is still valid');
          
          // If we have session but no user in store, fetch user info
          if (!persistedUser) {
            console.log('🔄 Fetching user info...');
            const userResponse = await db.auth.getUser();
            const zendbxUser = userResponse?.user || userResponse?.data?.user;
            
            if (zendbxUser) {
              const [firstName, ...lastNameParts] = (zendbxUser.username || zendbxUser.email?.split('@')[0] || 'User').split('_');
              const lastName = lastNameParts.join(' ') || 'Name';
              const role: 'ADMIN' | 'STAFF' = zendbxUser.email?.includes('admin') ? 'ADMIN' : 'STAFF';

              const user: User = {
                id: zendbxUser.id || '',
                email: zendbxUser.email || '',
                role: role,
                first_name: firstName,
                last_name: lastName,
                phone: zendbxUser.phone || '',
                is_active: true,
                created_at: zendbxUser.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              useAuthStore.getState().setAuth(user, sessionToken);
              console.log('✅ [initializeAuth] User restored from ZendBX');
            }
          } else {
            // Update token if different
            if (sessionToken !== persistedToken) {
              useAuthStore.getState().setAuth(persistedUser, sessionToken);
            } else {
              // Token is the same, just ensure loading is false
              useAuthStore.getState().setLoading(false);
            }
          }
          
          return;
        } else {
          console.log('⚠️ [initializeAuth] Session expired, clearing auth');
          localStorage.removeItem('zendbx_token');
          useAuthStore.getState().clearAuth();
        }
      } catch (error) {
        console.error('❌ [initializeAuth] Session validation failed:', error);
        localStorage.removeItem('zendbx_token');
        useAuthStore.getState().clearAuth();
      }
    } else {
      console.log('ℹ️ [initializeAuth] No persisted auth found');
      useAuthStore.getState().clearAuth();
    }
  } catch (error) {
    console.error('❌ [initializeAuth] Failed to initialize auth:', error);
    useAuthStore.getState().clearAuth();
  } finally {
    useAuthStore.getState().setLoading(false);
  }
};

/**
 * Listen to auth state changes
 * Note: ZendBX SDK may not support onAuthStateChange in current version
 * This is a placeholder for future implementation
 */
export const setupAuthListener = () => {
  // TODO: Implement auth state listener when SDK supports it
  // For now, we'll rely on manual session checks
  console.log('Auth listener setup - using manual session checks');
  
  // Return a no-op unsubscribe function
  return () => {
    console.log('Auth listener cleanup');
  };
};
