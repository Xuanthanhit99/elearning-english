import WritingTopicDetailPage from "@/src/Components/WritingPage/WritingTopicDetailPage/WritingTopicDetailPage";

export default async function WritingTopicSlug({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <WritingTopicDetailPage slug={slug} />;
}
