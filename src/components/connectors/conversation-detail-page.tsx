'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ConversationDetail {
  conversation: {
    id: string;
    provider: string;
    external_id: string;
    status: string;
    metadata_json: unknown;
  };
  contact: {
    name: string | null;
    phone: string | null;
    email: string | null;
    external_id: string;
    metadata_json: unknown;
  } | null;
  channel: {
    id: string;
    name: string;
    provider: string;
  } | null;
  messages: Array<{
    id: string;
    external_id: string;
    direction: string;
    sender_type: string;
    sender_name: string | null;
    message_type: string;
    text: string | null;
    media_url: string | null;
    media_mime_type: string | null;
    media_filename: string | null;
    sent_at: string | null;
    received_at: string | null;
    raw_event_id: string;
    metadata_json: unknown;
    created_at: string;
  }>;
}

function fmt(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function ConversationDetailPage({ id }: { id: string }) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/data/conversations/${id}`, {
        cache: 'no-store',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(payload.error || 'Failed to load conversation');
      setDetail(payload);
    } catch (err) {
      console.error('[ConversationDetailPage] load error:', err);
      toast.error('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex py-16">
        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!detail) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/data/conversations"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Data Explorer
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Conversation
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {detail.conversation.external_id}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>
              {detail.contact?.external_id ?? 'No contact linked'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>{detail.contact?.name ?? '-'}</div>
            <div className="text-muted-foreground">{detail.contact?.phone ?? '-'}</div>
            <div className="text-muted-foreground">{detail.contact?.email ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Provider</CardTitle>
            <CardDescription>{detail.channel?.name ?? '-'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge>{detail.conversation.provider}</Badge>
            <Badge variant="outline">{detail.conversation.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <JsonBlock value={detail.conversation.metadata_json} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages.</p>
          ) : (
            detail.messages.map((message) => (
              <div key={message.id} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={message.direction === 'inbound' ? 'default' : 'secondary'}>
                    {message.direction}/{message.sender_type}
                  </Badge>
                  <span className="text-sm font-medium">
                    {message.sender_name ?? message.sender_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmt(message.sent_at ?? message.received_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{message.text ?? '-'}</p>
                {message.media_url && (
                  <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                    {message.media_url}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">external: {message.external_id}</span>
                  <Link
                    className="text-primary hover:underline"
                    href={`/settings/channels/${detail.channel?.id}/events`}
                  >
                    raw_event_id: {message.raw_event_id}
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
