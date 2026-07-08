import { NextResponse } from 'next/server';

import {
  getConnectorDashboardContext,
  toConnectorDashboardError,
} from '@/modules/connectors/dashboard-context';
import { reprocessRawConnectorEvent } from '@/modules/connectors/ingestion-service';

export async function POST(request: Request) {
  try {
    const ctx = await getConnectorDashboardContext('admin');
    const body = (await request.json().catch(() => null)) as {
      rawEventId?: unknown;
    } | null;
    const rawEventId =
      typeof body?.rawEventId === 'string' ? body.rawEventId.trim() : '';
    if (!rawEventId) {
      return NextResponse.json(
        { error: "'rawEventId' is required" },
        { status: 400 }
      );
    }

    const result = await reprocessRawConnectorEvent(ctx.accountId, rawEventId);
    if (!result) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ event: result });
  } catch (err) {
    return toConnectorDashboardError(err);
  }
}
