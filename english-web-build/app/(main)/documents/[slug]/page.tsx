import DocumentDetailPage from "@/src/Components/Documents/DocumentDetailPage";

export default async function DocumentDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DocumentDetailPage slug={slug} />;
}
