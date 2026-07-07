import GrammarCategoryPage from "@/src/Components/Grammar/GrammarCategoryPage";

export default async function GrammarCategory({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  return <GrammarCategoryPage categorySlug={categorySlug} />;
}
