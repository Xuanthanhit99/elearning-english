import PlacementResultScreen from "@/src/Components/placement-result/PlacementResultScreen";

export default async function PlacementResultPage({
  params,
}: {
  params: Promise<{
    sessionId: string;
  }>;
}) {
  const { sessionId } = await params;

  return <PlacementResultScreen testId={sessionId} />;
}
