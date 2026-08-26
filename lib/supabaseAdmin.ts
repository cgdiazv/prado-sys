import { createClient } from '@supabase/supabase-js';
import { jobsAdmin, fleetAdmin, commerceAdmin } from './supabase-admin';

export function createAdminClient() {
  const url = process.env.JOBS_SUPABASE_URL || process.env.NEXT_PUBLIC_CORE_SUPABASE_URL || '';
  const key = process.env.JOBS_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_CORE_SUPABASE_ANON_KEY || '';
  
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export { jobsAdmin, fleetAdmin, commerceAdmin };
