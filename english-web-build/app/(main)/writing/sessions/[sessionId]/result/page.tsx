import WritingResultPage from "@/src/Components/WritingPage/WritingResultPage/WritingResultPage";

export default async function WritingSessionIdResult({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await params;

  return <WritingResultPage />;
}
