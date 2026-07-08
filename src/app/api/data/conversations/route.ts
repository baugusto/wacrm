import { NextResponse } from 'next/server';

import {
  getConnectorDashboardContext,
  toConnectorDashboardError,
} from '@/modules/connectors/dashboard-context';

export async function GET() {
  try {
    const ctx = await getConnectorDashboardContext();
    const { data: conversations, error } = await ctx.supabase
      .from('canonical_conversations')
      .select(
        'id, workspace_id, channel_id, provider, external_id, contact_id, status, started_at, last_message_at, closed_at, metadata_json, created_at'
      )
      .eq('account_id', ctx.accountId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) {
      console.error('[GET /api/data/conversations] error:', error);
      return NextResponse.json(
        { error: 'Failed to load conversations' },
        { status: 500 }
      );
    }

    const contactIds = [
      ...new Set((conversations ?? []).map((row) => row.contact_id).filter(Boolean)),
    ];
    const channelIds = [
      ...new Set((conversations ?? []).map((row) => row.channel_id).filter(Boolean)),
    ];
    const conversationIds = (conversations ?? []).map((row) => row.id);

    const { data: contacts } =
      contactIds.length > 0
        ? await ctx.supabase
            .from('canonical_contacts')
            .select('id, name, phone, email, external_id')
            .eq('account_id', ctx.accountId)
            .in('id', contactIds)
        : { data: [] };
    const { data: channels } =
      channelIds.length > 0
        ? await ctx.supabase
            .from('channels')
            .select('id, name')
            .eq('account_id', ctx.accountId)
            .in('id', channelIds)
        : { data: [] };
    const { data: messages } =
      conversationIds.length > 0
        ? await ctx.supabase
            .from('canonical_messages')
            .select('conversation_id, direction, sender_type, text, created_at, sent_at, received_at')
            .eq('account_id', ctx.accountId)
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: false })
        : { data: [] };

    const contactsById = new Map((contacts ?? []).map((row) => [row.id, row]));
    const channelsById = new Map((channels ?? []).map((row) => [row.id, row]));
    const lastMessageByConversation = new Map<string, unknown>();
    for (const message of messages ?? []) {
      if (!lastMessageByConversation.has(message.conversation_id)) {
        lastMessageByConversation.set(message.conversation_id, message);
      }
    }

    return NextResponse.json({
      conversations: (conversations ?? []).map((conversation) => ({
        ...conversation,
        contact: conversation.contact_id
          ? contactsById.get(conversation.contact_id)
          : null,
        channel: channelsById.get(conversation.channel_id) ?? null,
        last_message: lastMessageByConversation.get(conversation.id) ?? null,
      })),
    });
  } catch (err) {
    return toConnectorDashboardError(err);
  }
}
