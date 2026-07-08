import { NextResponse } from 'next/server';

import {
  getConnectorDashboardContext,
  toConnectorDashboardError,
} from '@/modules/connectors/dashboard-context';
import { listConnectorProviders } from '@/modules/connectors/registry';

const DEFAULT_BOTMAKER_CONFIG = {
  provider: 'botmaker',
  adapter: 'botmaker',
  adapter_version: 'v1',
  mapping: {
    'contact.phone': ['contactId', 'user.phone', 'customer.phone', 'contact.phone'],
    'message.text': ['messages[].message', 'message.text', 'message.body', 'text'],
    'conversation.external_id': [
      'sessionId',
      'conversation.id',
      'chat.id',
      'session.id',
    ],
  },
};

export async function GET() {
  try {
    const ctx = await getConnectorDashboardContext();
    const { data: channels, error } = await ctx.supabase
      .from('channels')
      .select(
        'id, workspace_id, name, type, provider, status, external_id, config_json, created_at, updated_at'
      )
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[GET /api/connectors/channels] error:', error);
      return NextResponse.json(
        { error: 'Failed to load channels' },
        { status: 500 }
      );
    }

    const { data: workspaces } = await ctx.supabase
      .from('workspaces')
      .select('id, name')
      .eq('account_id', ctx.accountId);

    const { data: rawEvents } = await ctx.supabase
      .from('raw_conversation_events')
      .select('channel_id, received_at, ingestion_status')
      .eq('account_id', ctx.accountId)
      .order('received_at', { ascending: false })
      .limit(250);

    const workspaceById = new Map(
      (workspaces ?? []).map((workspace) => [workspace.id, workspace.name])
    );
    const latestByChannel = new Map<string, unknown>();
    for (const event of rawEvents ?? []) {
      if (!latestByChannel.has(event.channel_id)) {
        latestByChannel.set(event.channel_id, event);
      }
    }

    return NextResponse.json({
      providers: listConnectorProviders(),
      channels: (channels ?? []).map((channel) => ({
        ...channel,
        workspace_name: workspaceById.get(channel.workspace_id) ?? null,
        last_event: latestByChannel.get(channel.id) ?? null,
      })),
    });
  } catch (err) {
    return toConnectorDashboardError(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getConnectorDashboardContext('admin');
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      workspaceId?: unknown;
      provider?: unknown;
      externalId?: unknown;
      status?: unknown;
    } | null;

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const workspaceId =
      typeof body?.workspaceId === 'string' ? body.workspaceId.trim() : '';
    const provider =
      typeof body?.provider === 'string' && body.provider.trim()
        ? body.provider.trim()
        : 'botmaker';
    const externalId =
      typeof body?.externalId === 'string' && body.externalId.trim()
        ? body.externalId.trim()
        : null;
    const status =
      body?.status === 'draft' || body?.status === 'active'
        ? body.status
        : 'active';

    if (!name) {
      return NextResponse.json({ error: "'name' is required" }, { status: 400 });
    }
    if (!workspaceId) {
      return NextResponse.json(
        { error: "'workspaceId' is required" },
        { status: 400 }
      );
    }

    const { data: workspace, error: workspaceErr } = await ctx.supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('account_id', ctx.accountId)
      .maybeSingle();
    if (workspaceErr || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    if (!['botmaker', 'generic_webhook'].includes(provider)) {
      return NextResponse.json(
        { error: 'Unsupported provider' },
        { status: 400 }
      );
    }

    const { data, error } = await ctx.supabase
      .from('channels')
      .insert({
        account_id: ctx.accountId,
        workspace_id: workspace.id,
        name,
        type: provider,
        provider,
        status,
        external_id: externalId,
        config_json:
          provider === 'botmaker'
            ? DEFAULT_BOTMAKER_CONFIG
            : { provider, adapter: provider, adapter_version: 'v1' },
        created_by: ctx.userId,
      })
      .select(
        'id, workspace_id, name, type, provider, status, external_id, config_json, created_at, updated_at'
      )
      .single();
    if (error || !data) {
      console.error('[POST /api/connectors/channels] error:', error);
      return NextResponse.json(
        { error: 'Failed to create channel' },
        { status: 500 }
      );
    }

    return NextResponse.json({ channel: data }, { status: 201 });
  } catch (err) {
    return toConnectorDashboardError(err);
  }
}
