import { ConversationDetailPage } from '@/components/connectors/conversation-detail-page';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversationDetailPage id={id} />;
}
