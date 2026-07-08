import { NextResponse } from 'next/server';

import {
  getConnectorDashboardContext,
  toConnectorDashboardError,
} from '@/modules/connectors/dashboard-context';

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'workspace'
  );
}

export async function GET() {
  try {
    const ctx = await getConnectorDashboardContext();
    const { data, error } = await ctx.supabase
      .from('workspaces')
      .select('id, name, slug, status, created_at')
      .eq('account_id', ctx.accountId)
      .order('name', { ascending: true });
    if (error) {
      console.error('[GET /api/connectors/workspaces] error:', error);
      return NextResponse.json(
        { error: 'Failed to load workspaces' },
        { status: 500 }
      );
    }
    return NextResponse.json({ workspaces: data ?? [] });
  } catch (err) {
    return toConnectorDashboardError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getConnectorDashboardContext('admin');
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
    } | null;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: "'name' is required" }, { status: 400 });
    }

    const slugBase = slugify(name);
    let slug = slugBase;
    for (let i = 2; i < 100; i += 1) {
      const { data: existing } = await ctx.supabase
        .from('workspaces')
        .select('id')
        .eq('account_id', ctx.accountId)
        .eq('slug', slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${slugBase}-${i}`;
    }

    const { data, error } = await ctx.supabase
      .from('workspaces')
      .insert({
        account_id: ctx.accountId,
        name,
        slug,
        status: 'active',
      })
      .select('id, name, slug, status, created_at')
      .single();
    if (error || !data) {
      console.error('[POST /api/connectors/workspaces] error:', error);
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      );
    }
    return NextResponse.json({ workspace: data }, { status: 201 });
  } catch (err) {
    return toConnectorDashboardError(err);
  }
}
