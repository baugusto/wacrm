import { handleConnectorIngestion } from '@/modules/connectors/ingestion-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  return handleConnectorIngestion(request, {
    forcedProvider: 'botmaker',
    channelId,
  });
}
