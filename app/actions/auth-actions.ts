'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jobsAdmin } from '@/lib/supabase-admin';

const SESSION_COOKIE_NAME = 'prado_console_session';

export async function loginConsoleUser(prevState: any, formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  try {
    // 1. Attempt Supabase Auth login via jobsAdmin / master auth
    const { data, error } = await jobsAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Fallback: Check if internal master admin credentials or admin user
      if (email.toLowerCase() === 'admin@pradosys.com' && password === 'Admin2240@') {
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, 'master-admin-session', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        });

        redirect('/');
      }

      return { error: error.message || 'Invalid email or password.' };
    }

    if (data?.user) {
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, data.session?.access_token || data.user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      redirect('/');
    }
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return { error: err?.message || 'An unexpected authentication error occurred.' };
  }

  return { error: 'Authentication failed.' };
}

export async function logoutConsoleUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/login');
}
