
import GrammarLessonLearningPage from "@/src/Components/Grammar/GrammarLessonLeaningPage";

export default async function GrammarLessonLeaning({
  params,
}: {
  params: Promise<{ lessonId: string[] }>;
}) {
  await params;

  return <GrammarLessonLearningPage />;
}
