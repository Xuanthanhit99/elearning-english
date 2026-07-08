import ReadingResultPage from "@/src/Components/ReadingPractice/ReadingResultPage/ReadingResultPage";

export default async function ReadingResultHome({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const resolvedParams = await params;

  return <ReadingResultPage params={resolvedParams} />;
}