import { createClient } from '@zendbx/sdk';

// Helper function to extract project slug from JWT token
function extractProjectSlug(token: string): string {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      let payload = parts[1];
      // Add padding if needed
      payload += '='.repeat((4 - payload.length % 4) % 4);
      const decoded = atob(payload);
      const data = JSON.parse(decoded);
      return data.project_slug || '';
    }
  } catch (e) {
    console.error('Failed to extract project slug from token:', e);
  }
  return '';
}

// Get project slug from env or extract from token
const anonKey = import.meta.env.VITE_ZENDBX_ANON_KEY || import.meta.env.VITE_ZENDBX_API_KEY || '';
const serviceKey = import.meta.env.VITE_ZENDBX_SERVICE_KEY || '';
const projectSlug = import.meta.env.VITE_ZENDBX_PROJECT_SLUG || extractProjectSlug(anonKey);

// Create and export the ZendBX client instance
// Use service key for full permissions (bypasses RLS)
export const db = createClient({
  apiUrl: import.meta.env.VITE_ZENDBX_URL || 'https://api.zendbx.in',
  anonKey: anonKey,
  projectSlug: projectSlug,
  
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
  anonKey: serviceKey || anonKey,
  projectSlug: projectSlug,
  storageKey: null, // Don't use localStorage, always use service key
});
