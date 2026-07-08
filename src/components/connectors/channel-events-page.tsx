'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, RefreshCw, RotateCcw } from 'lucide-react';

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
import { RequireRole } from '@/components/auth/require-role';

interface RawEvent {
  id: string;
  provider: string;
  external_event_id: string | null;
  event_type: string | null;
  adapter_key: string | null;
  adapter_version: string | null;
  payload_json: unknown;
  headers_json: unknown;
  query_json: unknown;
  received_at: string;
  occurred_at: string | null;
  ingestion_status: string;
  normalized_at: string | null;
  error_message: string | null;
  warnings_json: unknown;
  idempotency_key: string;
}

function fmt(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function statusVariant(status: string) {
  if (status === 'normalized') return 'default';
  if (status === 'error') return 'destructive';
  return 'outline';
}

function JsonDetails({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="rounded-lg border bg-muted/30 p-2">
      <summary className="cursor-pointer text-xs font-medium">{label}</summary>
      <pre className="mt-2 max-h-80 overflow-auto text-xs whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export function ChannelEventsPage({ channelId }: { channelId: string }) {
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/connectors/channels/${channelId}/events`, {
        cache: 'no-store',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(payload.error || 'Failed to load events');
      setEvents(payload.events ?? []);
    } catch (err) {
      console.error('[ChannelEventsPage] load error:', err);
      toast.error('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reprocess(event: RawEvent) {
    setReprocessing(event.id);
    try {
      const res = await fetch(`/api/connectors/channels/${channelId}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawEventId: event.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(payload.error || 'Failed to reprocess event');
      toast.success('Event reprocessed');
      await load();
    } finally {
      setReprocessing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/settings/channels"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Channels
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Connector Events
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Raw ROI Wise Connector Gateway events for this channel.
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
                <TableHead>Received</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Adapter</TableHead>
                <TableHead>Payload</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Loader2 className="mx-auto size-5 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No events received for this channel.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div>{fmt(event.received_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        occurred {fmt(event.occurred_at)}
                      </div>
                    </TableCell>
                    <TableCell>{event.provider}</TableCell>
                    <TableCell>
                      <div>{event.event_type ?? 'unknown'}</div>
                      <div className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                        {event.external_event_id ?? event.idempotency_key}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(event.ingestion_status)}>
                        {event.ingestion_status}
                      </Badge>
                      {event.error_message && (
                        <div className="mt-1 max-w-[240px] whitespace-normal text-xs text-red-300">
                          {event.error_message}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.adapter_key ?? '-'} {event.adapter_version ?? ''}
                    </TableCell>
                    <TableCell className="min-w-[320px] whitespace-normal">
                      <div className="space-y-2">
                        <JsonDetails label="Payload" value={event.payload_json} />
                        <JsonDetails label="Headers" value={event.headers_json} />
                        <JsonDetails label="Query" value={event.query_json} />
                        <JsonDetails label="Warnings" value={event.warnings_json} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <RequireRole min="admin">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reprocess(event)}
                          disabled={reprocessing === event.id}
                        >
                          {reprocessing === event.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RotateCcw className="size-4" />
                          )}
                          Reprocess
                        </Button>
                      </RequireRole>
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
