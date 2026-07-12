import ListeningPracticePage from "@/src/Components/Listening/ListeningPracticePage";

export default async function ListeningPracticeRoute({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <ListeningPracticePage sessionId={sessionId} />;
}
