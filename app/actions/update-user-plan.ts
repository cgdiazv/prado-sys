'use server';

import { revalidatePath } from 'next/cache';
import { jobsAdmin, fleetAdmin, commerceAdmin, erpAdmin } from '@/lib/supabase-admin';

export interface UpdatePlanInput {
  userId: string;
  app: 'Jobs' | 'Fleet' | 'Commerce' | 'ERP';
  newPlan: string;
  orgId?: string | null;
}

export interface UpdatePlanResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function updateUserPlan(input: UpdatePlanInput): Promise<UpdatePlanResponse> {
  const { userId, app, newPlan, orgId } = input;

  if (!userId || !app || !newPlan) {
    return { success: false, error: 'User ID, App, and Plan are required.' };
  }

  try {
    if (app === 'Commerce') {
      const { error } = await commerceAdmin
        .from('MerchantUser')
        .update({
          plan: newPlan,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
    } else if (app === 'Fleet') {
      const { error } = await fleetAdmin
        .from('User')
        .update({
          role: newPlan,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
    } else if (app === 'Jobs') {
      // 1. Update organization if orgId or owner_id exists
      if (orgId) {
        const { error: orgErr } = await jobsAdmin
          .from('organizations')
          .update({ subscription_status: newPlan })
          .eq('id', orgId);

        if (orgErr) {
          return { success: false, error: orgErr.message };
        }
      } else {
        const { error: ownerErr } = await jobsAdmin
          .from('organizations')
          .update({ subscription_status: newPlan })
          .eq('owner_id', userId);

        if (ownerErr) {
          console.warn('Could not update org by owner_id:', ownerErr.message);
        }
      }

      // 2. Also update user metadata in Auth table
      const { error: userErr } = await jobsAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { plan: newPlan },
      });

      if (userErr) {
        console.warn('Could not update user_metadata in Auth:', userErr.message);
      }
    } else if (app === 'ERP') {
      if (orgId) {
        const { error: compErr } = await erpAdmin
          .from('Company')
          .update({
            plan: newPlan,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', orgId);

        if (compErr) {
          return { success: false, error: compErr.message };
        }
      }

      const { error: userErr } = await erpAdmin
        .from('User')
        .update({
          role: newPlan,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);

      if (userErr && !orgId) {
        return { success: false, error: userErr.message };
      }
    }

    revalidatePath('/');
    revalidatePath('/management');
    revalidatePath('/[locale]/management', 'page');

    return {
      success: true,
      message: `Successfully updated ${app} user plan to ${newPlan}`,
    };
  } catch (err: any) {
    console.error('Error updating user plan:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred.' };
  }
}
