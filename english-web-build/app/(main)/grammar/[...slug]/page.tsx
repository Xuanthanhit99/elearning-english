
import GrammarDetailPage from "@/src/Components/Grammar/GrammarDetailPage";

export default async function GrammarDetail({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  console.log("slug", slug);

  return <GrammarDetailPage slug={slug} />;
}