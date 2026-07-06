
import GrammarLessonLearningPage from "@/src/Components/Grammar/GrammarLessonLeaningPage";

export default async function GrammarLessonLeaning({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  console.log("slug", slug);

  return <GrammarLessonLearningPage slug={slug} />;
}