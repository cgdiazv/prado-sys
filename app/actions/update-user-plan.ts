'use server';

import { revalidatePath } from 'next/cache';
import { jobsAdmin, fleetAdmin, commerceAdmin, erpAdmin } from '@/lib/supabase-admin';

export interface UpdatePlanInput {
  userId: string;
  app: 'Jobs' | 'Fleet' | 'Commerce' | 'ERP';
  newPlan: string;
  orgId?: string | null;
}

export interface DeleteAccountInput {
  userId: string;
  app: 'Jobs' | 'Fleet' | 'Commerce' | 'ERP';
  orgId?: string | null;
}

export interface UpdatePlanResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function deleteUserAccount(input: DeleteAccountInput): Promise<DeleteAccountResponse> {
  const { userId, app, orgId } = input;

  if (!userId || !app) {
    return { success: false, error: 'User ID and App are required.' };
  }

  try {
    if (app === 'Jobs') {
      if (orgId) {
        await jobsAdmin.from('organizations').delete().eq('id', orgId);
      }

      await jobsAdmin.from('organizations').delete().eq('owner_id', userId);
      try {
        await jobsAdmin.auth.admin.deleteUser(userId);
      } catch (authErr) {
        console.warn('Could not delete Jobs auth user:', authErr);
      }
    } else if (app === 'Fleet') {
      await fleetAdmin.from('User').delete().eq('id', userId);
      try {
        await fleetAdmin.auth.admin.deleteUser(userId);
      } catch (authErr) {
        console.warn('Could not delete Fleet auth user:', authErr);
      }
    } else if (app === 'Commerce') {
      await commerceAdmin.from('MerchantUser').delete().eq('id', userId);
      try {
        await commerceAdmin.auth.admin.deleteUser(userId);
      } catch (authErr) {
        console.warn('Could not delete Commerce auth user:', authErr);
      }
    } else if (app === 'ERP') {
      await erpAdmin.from('User').delete().eq('id', userId);
      try {
        await erpAdmin.auth.admin.deleteUser(userId);
      } catch (authErr) {
        console.warn('Could not delete ERP auth user:', authErr);
      }
    }

    revalidatePath('/');
    revalidatePath('/management');
    revalidatePath('/[locale]/management', 'page');

    return {
      success: true,
      message: `Successfully deleted ${app} account.`,
    };
  } catch (err: unknown) {
    console.error('Error deleting user account:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred while deleting the account.';
    return { success: false, error: message };
  }
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
          console.warn('Could not update org by orgId:', orgErr.message);
        }
      }

      // Check if user owns an organization by owner_id
      const { data: ownerOrg } = await jobsAdmin
        .from('organizations')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      if (ownerOrg?.id) {
        await jobsAdmin
          .from('organizations')
          .update({ subscription_status: newPlan })
          .eq('id', ownerOrg.id);
      } else if (!orgId) {
        // If user has no organization at all, create one for them so they retain their plan
        const { data: userAuth } = await jobsAdmin.auth.admin.getUserById(userId);
        const userEmail = userAuth?.user?.email || 'User';
        const defaultName = userEmail.split('@')[0] || 'User';

        await jobsAdmin.from('organizations').insert({
          name: `${defaultName}'s Workspace`,
          owner_id: userId,
          subscription_status: newPlan,
        });
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
  } catch (err: unknown) {
    console.error('Error updating user plan:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
