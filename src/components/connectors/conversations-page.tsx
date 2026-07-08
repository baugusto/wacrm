'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ConversationRow {
  id: string;
  provider: string;
  external_id: string;
  status: string;
  last_message_at: string | null;
  contact: {
    name: string | null;
    phone: string | null;
    external_id: string;
  } | null;
  channel: {
    name: string;
  } | null;
  last_message: {
    direction: string;
    sender_type: string;
    text: string | null;
    sent_at: string | null;
    received_at: string | null;
    created_at: string;
  } | null;
}

function fmt(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : '-';
}

export function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/conversations', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(payload.error || 'Failed to load conversations');
      setConversations(payload.conversations ?? []);
    } catch (err) {
      console.error('[ConversationsPage] load error:', err);
      toast.error('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Data Explorer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Canonical conversations normalized by the ROI Wise Connector Gateway.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last message</TableHead>
                <TableHead>Direction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Loader2 className="mx-auto size-5 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No normalized conversations yet.
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell>
                      <Link
                        href={`/data/conversations/${conversation.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {conversation.contact?.name ||
                          conversation.contact?.phone ||
                          conversation.contact?.external_id ||
                          conversation.external_id}
                      </Link>
                      <div className="max-w-[240px] truncate font-mono text-xs text-muted-foreground">
                        {conversation.external_id}
                      </div>
                    </TableCell>
                    <TableCell>{conversation.channel?.name ?? '-'}</TableCell>
                    <TableCell>{conversation.provider}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{conversation.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[360px] whitespace-normal">
                      <div className="truncate">
                        {conversation.last_message?.text ?? '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fmt(
                          conversation.last_message?.sent_at ??
                            conversation.last_message?.received_at ??
                            conversation.last_message_at
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {conversation.last_message ? (
                        <Badge variant="secondary">
                          {conversation.last_message.direction}/
                          {conversation.last_message.sender_type}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
