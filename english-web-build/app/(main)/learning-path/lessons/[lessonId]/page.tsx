import LearningPathGate from "@/src/Components/learning-path/LearningPathGate";
import LearningPathLessonPage from "@/src/Components/learning-path/LearningPathLessonPage";

export default function Page() {
  return (
    <LearningPathGate>
      <LearningPathLessonPage />
    </LearningPathGate>
  );
}
