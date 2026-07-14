import WritingProcessingPage from '@/src/Components/WritingPage/WritingProcessingPage';

export default async function WritingSessionProcessing({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await params;

  return <WritingProcessingPage />;
}
