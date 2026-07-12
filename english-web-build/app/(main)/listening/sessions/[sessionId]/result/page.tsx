import ListeningResultPage from "@/src/Components/Listening/ListeningResultPage";

export default async function ListeningResultRoute({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <ListeningResultPage sessionId={sessionId} />;
}
