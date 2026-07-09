import WritingHistoryDetailPage from "@/src/Components/WritingPage/WritingHistoryDetailPage/WritingHistoryDetailPage";

export default async function WritingSessionId({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <WritingHistoryDetailPage sessionId={sessionId} />;
}
