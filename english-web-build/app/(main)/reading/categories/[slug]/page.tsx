import ReadingTopicDetailPage from "@/src/Components/ReadingPractice/ReadingTopicDetailPage/ReadingTopicDetailPage";

export default async function ReadingTopicDetailHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ReadingTopicDetailPage params={{ slug }} />;
}
