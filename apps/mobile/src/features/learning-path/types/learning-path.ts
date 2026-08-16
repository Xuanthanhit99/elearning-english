export type LearningPathLessonStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

export type LearningPathLesson = {
  id: string;
  title: string;
  duration: number | null;
  order: number;
  sectionId: string;
  sectionTitle: string;
  courseId: string;
  courseSlug: string;
  status: LearningPathLessonStatus;
  progressId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  href: string;
};

export type LearningPathStartingLesson = {
  skill: string;
  title: string;
  href: string;
  topicTitle: string | null;
} | null;

export type LearningPathCourse = {
  id: string;
  courseId: string | null;
  title: string;
  slug: string | null;
  thumbnail: string | null;
  rating: number | null;
  reviews: number | null;
  lessonCount: number;
  reason: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  available: boolean;
  lessons: LearningPathLesson[];
};

export type LearningPathSkillLevel = {
  skill: string;
  level: string | null;
  score?: number;
  status?: string;
  source?: string;
  assessedLevel?: string | null;
  startingLesson?: LearningPathStartingLesson;
};

export type LearningPathData = {
  id: string | null;
  testId: string | null;
  title: string;
  overallLevel: string | null;
  overallScore: number | null;
  generatedAt: string | null;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  currentLesson: LearningPathLesson | null;
  nextLesson: LearningPathLesson | LearningPathStartingLesson;
  phases: Array<{
    id: string;
    phase: number;
    title: string;
    targetLevel: string | null;
    weeksMin: number;
    weeksMax: number;
    description: string;
    objectives: string[];
    progress: number;
  }>;
  priorities: Array<{ id: string; skill: string; priority: number; reason: string }>;
  recommendedCourses: Array<{
    id: string;
    title: string;
    slug: string | null;
    thumbnail: string | null;
    rating: number | null;
    reviews: number | null;
    lessonCount: number | null;
    reason: string;
  }>;
  courses: LearningPathCourse[];
  skills: LearningPathSkillLevel[];
  source: 'PLACEMENT' | 'DEFAULT_FOUNDATION';
};

export type LearningPathLessonActionResult = {
  lesson: LearningPathLesson;
  learningPath: {
    id: string | null;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    currentLesson: LearningPathLesson | null;
    nextLesson: LearningPathLesson | null;
  };
};
