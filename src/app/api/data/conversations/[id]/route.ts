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

    const { data: conversation, error } = await ctx.supabase
      .from('canonical_conversations')
      .select(
        'id, workspace_id, channel_id, provider, external_id, contact_id, status, started_at, last_message_at, closed_at, metadata_json, created_at'
      )
      .eq('account_id', ctx.accountId)
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[GET /api/data/conversations/[id]] error:', error);
      return NextResponse.json(
        { error: 'Failed to load conversation' },
        { status: 500 }
      );
    }
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const [{ data: contact }, { data: channel }, { data: messages }] =
      await Promise.all([
        conversation.contact_id
          ? ctx.supabase
              .from('canonical_contacts')
              .select(
                'id, external_id, name, phone, email, document, metadata_json, created_at'
              )
              .eq('account_id', ctx.accountId)
              .eq('id', conversation.contact_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        ctx.supabase
          .from('channels')
          .select('id, name, provider, external_id')
          .eq('account_id', ctx.accountId)
          .eq('id', conversation.channel_id)
          .maybeSingle(),
        ctx.supabase
          .from('canonical_messages')
          .select(
            'id, external_id, direction, sender_type, sender_name, message_type, text, media_url, media_mime_type, media_filename, sent_at, received_at, metadata_json, raw_event_id, created_at'
          )
          .eq('account_id', ctx.accountId)
          .eq('conversation_id', id)
          .order('created_at', { ascending: true }),
      ]);

    return NextResponse.json({
      conversation,
      contact,
      channel,
      messages: messages ?? [],
    });
  } catch (err) {
    return toConnectorDashboardError(err);
  }
}
