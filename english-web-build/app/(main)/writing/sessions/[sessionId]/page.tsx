import WritingSessionPage from "@/src/Components/WritingPage/WritingSessionPage/WritingSessionPage";

export default async function WritingSessionId({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <WritingSessionPage sessionId={sessionId} />;
}
