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
  plan?: string | null;
  orgId?: string | null;
}

export async function getSubscribers(): Promise<SubscriberRecord[]> {
  try {
    const [jobsRes, jobsOrgsRes, fleetRes, commerceRes] = await Promise.allSettled([
      // Prado Jobs: Authentication table
      jobsAdmin.auth.admin.listUsers(),
      // Prado Jobs: Organizations table
      jobsAdmin.from('organizations').select('id, owner_id, subscription_status, name'),
      // Prado Fleet: User table
      fleetAdmin.from('User').select('id, email, name, role, createdAt, updatedAt'),
      // Prado Commerce: MerchantUser table
      commerceAdmin.from('MerchantUser').select('id, email, name, company, plan, createdAt, updatedAt'),
    ]);

    const records: SubscriberRecord[] = [];

    const jobsOrgsByOwner = new Map<string, { id: string; subscription_status: string | null; name: string | null }>();
    if (jobsOrgsRes.status === 'fulfilled' && jobsOrgsRes.value.data) {
      for (const org of jobsOrgsRes.value.data) {
        if (org.owner_id) {
          jobsOrgsByOwner.set(org.owner_id, {
            id: org.id,
            subscription_status: org.subscription_status || null,
            name: org.name || null,
          });
        }
      }
    }

    // 1. Prado Jobs (Auth table)
    if (jobsRes.status === 'fulfilled' && jobsRes.value.data?.users) {
      records.push(
        ...jobsRes.value.data.users.map((u) => {
          const org = jobsOrgsByOwner.get(u.id);
          const planStatus = org?.subscription_status || 'trial';
          return {
            id: u.id,
            email: u.email,
            name: org?.name || null,
            app: 'Jobs' as const,
            createdAt: u.created_at,
            status: (u.banned_until ? 'suspended' : 'active') as 'active' | 'suspended',
            lastSignIn: u.last_sign_in_at || null,
            details: org?.name ? `${org.name} (${planStatus})` : u.role || 'Auth User',
            plan: planStatus,
            orgId: org?.id || null,
          };
        })
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
          plan: u.role || 'MANAGER',
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
          plan: u.plan || 'STANDARD',
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