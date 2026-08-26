import { createClient } from '@supabase/supabase-js';

export const jobsAdmin = createClient(
    process.env.JOBS_SUPABASE_URL || '',
    process.env.JOBS_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export const fleetAdmin = createClient(
    process.env.FLEET_SUPABASE_URL || '',
    process.env.FLEET_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export const commerceAdmin = createClient(
    process.env.COMMERCE_SUPABASE_URL || '',
    process.env.COMMERCE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
);