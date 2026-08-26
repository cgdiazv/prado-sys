'use server';

import { jobsAdmin, fleetAdmin, commerceAdmin } from '@/lib/supabase-admin';

export interface SubscriberRecord {
    id: string;
    email: string | undefined;
    app: 'Jobs' | 'Fleet' | 'Commerce';
    createdAt: string;
    status: 'active' | 'suspended';
    lastSignIn: string | null;
}

export async function getSubscribers(): Promise<SubscriberRecord[]> {
    try {
        const [jobsRes, fleetRes, commerceRes] = await Promise.allSettled([
            jobsAdmin.auth.admin.listUsers(),
            fleetAdmin.auth.admin.listUsers(),
            commerceAdmin.auth.admin.listUsers(),
        ]);

        const records: SubscriberRecord[] = [];

        if (jobsRes.status === 'fulfilled' && jobsRes.value.data?.users) {
            records.push(
                ...jobsRes.value.data.users.map((u) => ({
                    id: u.id,
                    email: u.email,
                    app: 'Jobs' as const,
                    createdAt: u.created_at,
                    status: (u.banned_until ? 'suspended' : 'active') as 'active' | 'suspended',
                    lastSignIn: u.last_sign_in_at || null,
                }))
            );
        }

        if (fleetRes.status === 'fulfilled' && fleetRes.value.data?.users) {
            records.push(
                ...fleetRes.value.data.users.map((u) => ({
                    id: u.id,
                    email: u.email,
                    app: 'Fleet' as const,
                    createdAt: u.created_at,
                    status: (u.banned_until ? 'suspended' : 'active') as 'active' | 'suspended',
                    lastSignIn: u.last_sign_in_at || null,
                }))
            );
        }

        if (commerceRes.status === 'fulfilled' && commerceRes.value.data?.users) {
            records.push(
                ...commerceRes.value.data.users.map((u) => ({
                    id: u.id,
                    email: u.email,
                    app: 'Commerce' as const,
                    createdAt: u.created_at,
                    status: (u.banned_until ? 'suspended' : 'active') as 'active' | 'suspended',
                    lastSignIn: u.last_sign_in_at || null,
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