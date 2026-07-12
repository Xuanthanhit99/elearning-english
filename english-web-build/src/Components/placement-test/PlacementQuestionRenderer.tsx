'use client';

import PlacementSpeakingQuestion from './PlacementSpeakingQuestion';
import PlacementWritingQuestion from './PlacementWritingQuestion';

type Option = {
  key: string;
  text: string;
  translation: string | null;
};

type Question = {
  id: string;
  type:
    | 'MULTIPLE_CHOICE'
    | 'FILL_BLANK'
    | 'LISTENING'
    | 'READING'
    | 'SPEAKING'
    | 'WRITING';
  prompt: string;
  level: string;
  options: Option[];
};

type Props = {
  sessionId: string;
  question: Question;
  renderObjectiveQuestion: () => React.ReactNode;
  onSpecialQuestionSubmitted: () => Promise<void> | void;
};

export default function PlacementQuestionRenderer({
  sessionId,
  question,
  renderObjectiveQuestion,
  onSpecialQuestionSubmitted,
}: Props) {
  switch (question.type) {
    case 'SPEAKING':
      return (
        <PlacementSpeakingQuestion
          sessionId={sessionId}
          questionId={question.id}
          prompt={question.prompt}
          level={question.level}
          onSubmitted={onSpecialQuestionSubmitted}
        />
      );

    case 'WRITING':
      return (
        <PlacementWritingQuestion
          sessionId={sessionId}
          questionId={question.id}
          prompt={question.prompt}
          level={question.level}
          onSubmitted={onSpecialQuestionSubmitted}
        />
      );

    default:
      return <>{renderObjectiveQuestion()}</>;
  }
}
