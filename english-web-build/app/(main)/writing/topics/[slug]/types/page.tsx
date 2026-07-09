import ChooseWritingTypePage from "@/src/Components/WritingPage/ChooseWritingTypePage/ChooseWritingTypePage";

export default async function WritingTopicSlug({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ChooseWritingTypePage slug={slug} />;
}
