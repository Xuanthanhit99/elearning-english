import { Locale } from "@/src/i18n/types";

export type StudySidebarContent = {
  navHome: string;
  navDashboard: string;
  sectionLearning: string;
  sectionCommunity: string;
  sectionOther: string;
  tree: {
    lessonBuilder: string;
    overview: string;
    placement: string;
    placementTest: string;
    placementDashboard: string;
    vocabulary: string;
    vocabularyList: string;
    review: string;
    test: string;
    grammar: string;
    listening: string;
    listeningPractice: string;
    listeningDictation: string;
    listeningReading: string;
    listeningTopic: string;
    speaking: string;
    pronunciation: string;
    speakingTopics: string;
    speakingSituations: string;
    conversation: string;
    studyRooms: string;
    reading: string;
    readingOverview: string;
    readingPractice: string;
    writing: string;
    writingPractice: string;
    writingCheck: string;
    flashcards: string;
    flashcardsToday: string;
    flashcardsAll: string;
    flashcardsCreate: string;
  };
  community: { community: string; qa: string; achievements: string };
  other: { courses: string; shop: string; settings: string };
  premiumTitle: string;
  premiumDesc: string;
  premiumCta: string;
};

const vi: StudySidebarContent = {
  navHome: "Trang chủ",
  navDashboard: "Tổng quan",
  sectionLearning: "Học tập",
  sectionCommunity: "Cộng đồng",
  sectionOther: "Khác",
  tree: {
    lessonBuilder: "AI tạo bài học",
    overview: "Tổng quan",
    placement: "Xếp trình độ",
    placementTest: "Kiểm tra trình độ",
    placementDashboard: "Tổng quan",
    vocabulary: "Từ vựng",
    vocabularyList: "Danh sách từ",
    review: "Ôn tập",
    test: "Kiểm tra",
    grammar: "Ngữ pháp",
    listening: "Nghe",
    listeningPractice: "Luyện nghe",
    listeningDictation: "Nghe chép chính tả",
    listeningReading: "Nghe hiểu đoạn",
    listeningTopic: "Nghe theo chủ đề",
    speaking: "Nói",
    pronunciation: "Luyện phát âm",
    speakingTopics: "Chủ đề nói",
    speakingSituations: "Tình huống",
    conversation: "Hội thoại AI",
    studyRooms: "Phòng học nhóm",
    reading: "Đọc hiểu",
    readingOverview: "Tổng quan đọc",
    readingPractice: "Luyện đọc",
    writing: "Viết",
    writingPractice: "Luyện viết",
    writingCheck: "AI chấm bài",
    flashcards: "Flashcards",
    flashcardsToday: "Ôn tập hôm nay",
    flashcardsAll: "Tất cả thẻ",
    flashcardsCreate: "Tạo bộ thẻ",
  },
  community: { community: "Cộng đồng", qa: "Hỏi đáp", achievements: "Thành tích" },
  other: { courses: "Khóa học", shop: "Shop", settings: "Cài đặt" },
  premiumTitle: "Nâng cấp Premium",
  premiumDesc: "Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!",
  premiumCta: "Nâng cấp ngay",
};

const studySidebarContent: Record<Locale, StudySidebarContent> = { vi, en: vi, zh: vi, de: vi };

export default studySidebarContent;

