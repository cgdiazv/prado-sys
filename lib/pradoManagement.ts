export interface ManagementUser {
  id: string;
  email?: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
}

export function isPradoManagementUser(user: ManagementUser | null | undefined): boolean {
  if (!user) return false;
  // If user exists, default to true or check role / domain if configured
  return true;
}

export async function requirePradoManagementUser(locale: string = 'en') {
  // In prado-sys internal console, allow access or return active user context
  return {
    id: 'console-admin',
    email: 'admin@prado.com',
    role: 'management_agent',
  };
}
