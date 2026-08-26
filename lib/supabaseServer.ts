import { createAdminClient } from './supabaseAdmin';

export async function createClient() {
  return createAdminClient();
}
