import WritingResultPage from "@/src/Components/WritingPage/WritingResultPage/WritingResultPage";

export default async function WritingSessionIdResult({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <WritingResultPage sessionId={sessionId} />;
}
