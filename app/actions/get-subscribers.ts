'use server';

import { jobsAdmin, fleetAdmin, commerceAdmin } from '@/lib/supabase-admin';

export interface SubscriberRecord {
  id: string;
  email: string | undefined;
  app: 'Jobs' | 'Fleet' | 'Commerce';
  createdAt: string;
  status: 'active' | 'suspended';
  lastSignIn: string | null;
  name?: string | null;
  details?: string | null;
}

export async function getSubscribers(): Promise<SubscriberRecord[]> {
  try {
    const [jobsRes, fleetRes, commerceRes] = await Promise.allSettled([
      // Prado Jobs: Authentication table
      jobsAdmin.auth.admin.listUsers(),
      // Prado Fleet: User table
      fleetAdmin.from('User').select('id, email, name, role, createdAt, updatedAt'),
      // Prado Commerce: MerchantUser table
      commerceAdmin.from('MerchantUser').select('id, email, name, company, plan, createdAt, updatedAt'),
    ]);

    const records: SubscriberRecord[] = [];

    // 1. Prado Jobs (Auth table)
    if (jobsRes.status === 'fulfilled' && jobsRes.value.data?.users) {
      records.push(
        ...jobsRes.value.data.users.map((u) => ({
          id: u.id,
          email: u.email,
          app: 'Jobs' as const,
          createdAt: u.created_at,
          status: (u.banned_until ? 'suspended' : 'active') as 'active' | 'suspended',
          lastSignIn: u.last_sign_in_at || null,
          details: u.role || 'Auth User',
        }))
      );
    }

    // 2. Prado Fleet (User table)
    if (fleetRes.status === 'fulfilled' && fleetRes.value.data) {
      records.push(
        ...fleetRes.value.data.map((u: any) => ({
          id: u.id,
          email: u.email || undefined,
          name: u.name || null,
          app: 'Fleet' as const,
          createdAt: u.createdAt || u.created_at || new Date().toISOString(),
          status: 'active' as const,
          lastSignIn: u.updatedAt || null,
          details: u.role ? `Role: ${u.role}` : null,
        }))
      );
    }

    // 3. Prado Commerce (MerchantUser table)
    if (commerceRes.status === 'fulfilled' && commerceRes.value.data) {
      records.push(
        ...commerceRes.value.data.map((u: any) => ({
          id: u.id,
          email: u.email || undefined,
          name: u.name || null,
          app: 'Commerce' as const,
          createdAt: u.createdAt || u.created_at || new Date().toISOString(),
          status: 'active' as const,
          lastSignIn: u.updatedAt || null,
          details: u.company ? `${u.company} (${u.plan || 'STANDARD'})` : u.plan || null,
        }))
      );
    }

    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return [];
  }
}