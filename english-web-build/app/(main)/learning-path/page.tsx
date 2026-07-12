import LearningPathGate from "@/src/Components/learning-path/LearningPathGate";
import LearningPathScreen from "@/src/Components/learning-path/LearningPathScreen";

export default function LearningPathPlacementPage() {
  return (
    <LearningPathGate>
      <LearningPathScreen />
    </LearningPathGate>
  );
}
