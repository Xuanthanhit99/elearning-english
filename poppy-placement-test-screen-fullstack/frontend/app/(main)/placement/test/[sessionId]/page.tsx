import PlacementTestScreen from '@/src/components/placement-test/PlacementTestScreen';

export default async function PlacementTestPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <PlacementTestScreen sessionId={sessionId} />;
}
