import { handleConnectorIngestion } from '@/modules/connectors/ingestion-service';

export async function POST(request: Request) {
  return handleConnectorIngestion(request);
}
