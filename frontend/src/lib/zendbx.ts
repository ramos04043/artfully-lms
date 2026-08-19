import { createClient } from '@zendbx/sdk';

// Create and export the ZendBX client instance
// Use service key for full permissions (bypasses RLS)
export const db = createClient({
  apiUrl: import.meta.env.VITE_ZENDBX_URL || 'https://api.zendbx.in',
  anonKey: import.meta.env.VITE_ZENDBX_SERVICE_KEY || import.meta.env.VITE_ZENDBX_ANON_KEY || '',
  projectSlug: import.meta.env.VITE_ZENDBX_PROJECT_SLUG || '',
  
  // Use localStorage for token persistence in browser
  storageKey: 'zendbx_token',
  
  // Optional: Custom WebSocket URL for realtime features
  // wsUrl: import.meta.env.VITE_ZENDBX_WS_URL,
});

// Export auth methods for convenience
export const {
  signUp,
  signIn,
  signOut,
  getUser,
  getSession,
  setAccessToken,
  getAccessToken,
  clearAccessToken,
} = db.auth;

// Type-safe table names (optional but recommended)
export type TableName = 
  | 'users'
  | 'students'
  | 'batches'
  | 'enrollments'
  | 'sessions'
  | 'attendance'
  | 'payments'
  | 'transactions'
  | 'compensation'
  | 'notifications'
  | 'audit_logs';

// Helper function for type-safe table access
export const table = <T extends TableName>(tableName: T) => db.from(tableName);

// Create admin client that always uses service key (bypasses RLS)
export const adminDb = createClient({
  apiUrl: import.meta.env.VITE_ZENDBX_URL || 'https://api.zendbx.in',
  anonKey: import.meta.env.VITE_ZENDBX_SERVICE_KEY || '',
  projectSlug: import.meta.env.VITE_ZENDBX_PROJECT_SLUG || '',
  storageKey: null, // Don't use localStorage, always use service key
});
