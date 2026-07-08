import { NextResponse } from 'next/server';

import {
  getConnectorDashboardContext,
  toConnectorDashboardError,
} from '@/modules/connectors/dashboard-context';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getConnectorDashboardContext();
    const { id } = await params;

    const { data: channel, error: channelErr } = await ctx.supabase
      .from('channels')
      .select('id')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();
    if (channelErr || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const { data, error } = await ctx.supabase
      .from('raw_conversation_events')
      .select(
        'id, provider, source, external_event_id, event_type, adapter_key, adapter_version, payload_json, headers_json, query_json, occurred_at, received_at, ingestion_status, normalized_at, error_message, warnings_json, idempotency_key, created_at'
      )
      .eq('account_id', ctx.accountId)
      .eq('channel_id', id)
      .order('received_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('[GET /api/connectors/channels/[id]/events] error:', error);
      return NextResponse.json(
        { error: 'Failed to load connector events' },
        { status: 500 }
      );
    }

    return NextResponse.json({ events: data ?? [] });
  } catch (err) {
    return toConnectorDashboardError(err);
  }
}
