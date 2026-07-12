import ReadingResultPage from "@/src/Components/reading/ReadingResultPage";

export default async function ReadingResult({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <ReadingResultPage
      params={{
        sessionId,
      }}
    />
  );
}