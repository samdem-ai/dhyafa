export { createBrowserClient, createServerClient, RPC } from './client.js';
export type { RpcName } from './client.js';

// Re-export the database shape and the supabase-js client type so consumers get
// a single dependency surface (`@dyafa/api-client`) for typed Supabase access.
export type { Database } from '@dyafa/types';
export type { SupabaseClient } from '@supabase/supabase-js';
