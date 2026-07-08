import { ChannelEventsPage } from '@/components/connectors/channel-events-page';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChannelEventsPage channelId={id} />;
}
