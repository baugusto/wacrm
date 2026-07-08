'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, KeyRound, Loader2, Plus, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const BASE_URL = 'https://roiwise.com.br';
const INGEST_SCOPES = [
  'events:write',
  'events:read',
  'channels:read',
  'conversations:read',
];

interface Workspace {
  id: string;
  name: string;
}

interface Channel {
  id: string;
  workspace_id: string;
  workspace_name: string | null;
  name: string;
  provider: string;
  type: string;
  status: string;
  external_id: string | null;
  created_at: string;
  last_event: {
    received_at: string;
    ingestion_status: string;
  } | null;
}

function fmtDate(value: string | null | undefined) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

function showRequestError(payload: { error?: string }, fallback: string) {
  if (payload.error?.includes('requires')) {
    toast.error('Your role cannot manage channels. Ask an admin or owner.');
    return;
  }
  toast.error(payload.error || fallback);
}

export function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [externalId, setExternalId] = useState('');
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [channelsRes, workspacesRes] = await Promise.all([
        fetch('/api/connectors/channels', { cache: 'no-store' }),
        fetch('/api/connectors/workspaces', { cache: 'no-store' }),
      ]);
      const channelsPayload = await channelsRes.json().catch(() => ({}));
      const workspacesPayload = await workspacesRes.json().catch(() => ({}));
      if (!channelsRes.ok) {
        showRequestError(channelsPayload, 'Failed to load channels');
      } else {
        setChannels(channelsPayload.channels ?? []);
      }
      if (!workspacesRes.ok) {
        showRequestError(workspacesPayload, 'Failed to load workspaces');
      } else {
        const nextWorkspaces = workspacesPayload.workspaces ?? [];
        setWorkspaces(nextWorkspaces);
        setWorkspaceId((current) => current || nextWorkspaces[0]?.id || '');
      }
    } catch (err) {
      console.error('[ChannelsPage] load error:', err);
      toast.error('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createWorkspace() {
    const name = workspaceName.trim();
    if (!name) return toast.error('Workspace name is required');
    const res = await fetch('/api/connectors/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return showRequestError(payload, 'Failed to create workspace');
    setWorkspaceName('');
    setWorkspaces((prev) => [...prev, payload.workspace]);
    setWorkspaceId(payload.workspace.id);
    toast.success('Workspace created');
  }

  async function createChannel() {
    const name = channelName.trim();
    if (!name) return toast.error('Channel name is required');
    if (!workspaceId) return toast.error('Workspace is required');
    setCreating(true);
    try {
      const res = await fetch('/api/connectors/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          workspaceId,
          provider: 'botmaker',
          externalId: externalId.trim() || null,
          status: 'active',
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return showRequestError(payload, 'Failed to create channel');
      setChannelName('');
      setExternalId('');
      toast.success('Channel created');
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function generateKey(channel: Channel) {
    const res = await fetch('/api/account/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Botmaker ingest - ${channel.name}`,
        channelId: channel.id,
        scopes: INGEST_SCOPES,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return showRequestError(payload, 'Failed to create API key');
    setPlaintextKey(payload.plaintext);
    toast.success('API key created');
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Channels
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Botmaker environments to the ROI Wise Connector Gateway.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
          Refresh
        </Button>
      </div>

      {plaintextKey && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>New API key</CardTitle>
            <CardDescription>
              This plaintext key is shown once. Store it in the Botmaker webhook
              configuration now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex min-w-0 gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border bg-muted px-3 py-2 text-xs">
                {plaintextKey}
              </code>
              <Button variant="outline" onClick={() => copy(plaintextKey)}>
                <Copy className="size-4" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connect Botmaker</CardTitle>
          <CardDescription>
            Create one channel per Botmaker environment. Use the Botmaker
            chatChannelId as external id when available.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[minmax(240px,1.15fr)_minmax(260px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto] xl:items-end">
          <div className="space-y-2">
            <Label>Workspace</Label>
            <Select
              value={workspaceId}
              onValueChange={(value) => {
                if (value) setWorkspaceId(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>New workspace</Label>
            <div className="flex gap-2">
              <Input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Brand or operation"
              />
              <Button type="button" variant="outline" onClick={createWorkspace}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Channel name</Label>
            <Input
              value={channelName}
              onChange={(event) => setChannelName(event.target.value)}
              placeholder="Botmaker WhatsApp"
            />
          </div>
          <div className="space-y-2">
            <Label>External id</Label>
            <Input
              value={externalId}
              onChange={(event) => setExternalId(event.target.value)}
              placeholder="chatChannelId"
            />
          </div>
          <Button
            onClick={createChannel}
            disabled={creating}
            className="w-full xl:w-auto"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[1180px] table-fixed">
            <colgroup>
              <col className="w-[13%]" />
              <col className="w-[15%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col />
              <col className="w-[150px]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last ingest</TableHead>
                <TableHead>Endpoints</TableHead>
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
              ) : channels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No channels yet.
                  </TableCell>
                </TableRow>
              ) : (
                channels.map((channel) => {
                  const botmakerEndpoint = `${BASE_URL}/api/connectors/botmaker/${channel.id}`;
                  return (
                    <TableRow key={channel.id}>
                      <TableCell className="font-medium">{channel.name}</TableCell>
                      <TableCell>{channel.workspace_name ?? channel.workspace_id}</TableCell>
                      <TableCell>{channel.provider}</TableCell>
                      <TableCell>
                        <Badge variant={channel.status === 'active' ? 'default' : 'outline'}>
                          {channel.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>{fmtDate(channel.last_event?.received_at)}</div>
                        {channel.last_event && (
                          <div className="text-xs text-muted-foreground">
                            {channel.last_event.ingestion_status}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="min-w-0 space-y-1 font-mono text-xs leading-relaxed">
                          <button
                            type="button"
                            title={botmakerEndpoint}
                            className="block max-w-full overflow-hidden text-left text-primary text-ellipsis whitespace-nowrap"
                            onClick={() => copy(botmakerEndpoint)}
                          >
                            {botmakerEndpoint}
                          </button>
                          <button
                            type="button"
                            title={`${BASE_URL}/api/connectors/events`}
                            className="block max-w-full overflow-hidden text-left text-muted-foreground text-ellipsis whitespace-nowrap"
                            onClick={() => copy(`${BASE_URL}/api/connectors/events`)}
                          >
                            {BASE_URL}/api/connectors/events
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex shrink-0 justify-end gap-2">
                          <Link
                            href={`/settings/channels/${channel.id}/events`}
                            className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                          >
                              Events
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateKey(channel)}
                          >
                            <KeyRound className="size-4" />
                            Key
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
