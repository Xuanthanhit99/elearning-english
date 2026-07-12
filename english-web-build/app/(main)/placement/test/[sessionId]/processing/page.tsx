import PlacementProcessingScreen from "@/src/Components/placement-processing/PlacementProcessingScreen";

export default async function PlacementProcessingPage({
  params,
}: {
  params: Promise<{
    sessionId: string;
  }>;
}) {
  const { sessionId } = await params;

  return <PlacementProcessingScreen sessionId={sessionId} />;
}
