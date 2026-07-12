import WritingSessionPage from "@/src/Components/WritingPage/WritingSessionPage/WritingSessionPage";

export default async function WritingSessionId({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await params;

  return <WritingSessionPage />;
}
