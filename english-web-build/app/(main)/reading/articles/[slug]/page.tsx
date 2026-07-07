import ReadingLessonPage from "@/src/Components/ReadingPractice/ReadingLessonPage/ReadingLessonPage";

export default async function ReadingLesson({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ReadingLessonPage params={{ slug }} />;
}
