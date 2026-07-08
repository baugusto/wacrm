import { NextResponse } from 'next/server';

import { hasMinRole, isAccountRole, type AccountRole } from '@/lib/auth/roles';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { createClient } from '@/lib/supabase/server';

export class DashboardAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403
  ) {
    super(message);
    this.name = 'DashboardAuthError';
  }
}

export interface ConnectorDashboardContext {
  userId: string;
  accountId: string;
  role: AccountRole;
  account: { id: string; name: string };
  supabase: ReturnType<typeof supabaseAdmin>;
}

export async function getConnectorDashboardContext(
  minRole: AccountRole = 'viewer'
): Promise<ConnectorDashboardContext> {
  const sessionClient = await createClient();
  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser();

  if (userError || !user) {
    throw new DashboardAuthError('Unauthorized', 401);
  }

  const admin = supabaseAdmin();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('account_id, account_role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[connectors/dashboard-context] profile error:', profileError);
    throw new DashboardAuthError('Could not load account context', 403);
  }
  if (!profile?.account_id || !isAccountRole(profile.account_role)) {
    throw new DashboardAuthError('Profile is not linked to an account', 403);
  }
  if (!hasMinRole(profile.account_role, minRole)) {
    throw new DashboardAuthError(
      `This action requires the '${minRole}' role or higher`,
      403
    );
  }

  const { data: account, error: accountError } = await admin
    .from('accounts')
    .select('id, name')
    .eq('id', profile.account_id)
    .maybeSingle();

  if (accountError) {
    console.error('[connectors/dashboard-context] account error:', accountError);
    throw new DashboardAuthError('Could not load account context', 403);
  }
  if (!account) {
    throw new DashboardAuthError('Profile is not linked to an account', 403);
  }

  return {
    userId: user.id,
    accountId: profile.account_id as string,
    role: profile.account_role,
    account,
    supabase: admin,
  };
}

export function toConnectorDashboardError(err: unknown): NextResponse {
  if (err instanceof DashboardAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error('[connectors/dashboard-context] uncategorized error:', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
