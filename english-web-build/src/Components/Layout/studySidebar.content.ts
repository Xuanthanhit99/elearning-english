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
  navDashboard: "Dashboard",
  sectionLearning: "Học tập",
  sectionCommunity: "Cộng đồng",
  sectionOther: "Khác",
  tree: {
    lessonBuilder: "AI tạo bài học",
    overview: "Tổng quan",
    placement: "Xếp trình độ",
    placementTest: "Kiểm tra trình độ",
    placementDashboard: "Dashboard",
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

const en: StudySidebarContent = {
  navHome: "Home",
  navDashboard: "Dashboard",
  sectionLearning: "Learning",
  sectionCommunity: "Community",
  sectionOther: "Other",
  tree: {
    lessonBuilder: "AI Lesson Builder",
    overview: "Overview",
    placement: "Placement test",
    placementTest: "Take placement test",
    placementDashboard: "Dashboard",
    vocabulary: "Vocabulary",
    vocabularyList: "Word list",
    review: "Review",
    test: "Test",
    grammar: "Grammar",
    listening: "Listening",
    listeningPractice: "Listening practice",
    listeningDictation: "Dictation",
    listeningReading: "Listening comprehension",
    listeningTopic: "Topic listening",
    speaking: "Speaking",
    pronunciation: "Pronunciation practice",
    speakingTopics: "Speaking topics",
    speakingSituations: "Situations",
    reading: "Reading",
    readingOverview: "Reading overview",
    readingPractice: "Reading practice",
    writing: "Writing",
    writingPractice: "Writing practice",
    writingCheck: "AI writing check",
    flashcards: "Flashcards",
    flashcardsToday: "Today's review",
    flashcardsAll: "All cards",
    flashcardsCreate: "Create deck",
  },
  community: { community: "Community", qa: "Q&A", achievements: "Achievements" },
  other: { courses: "Courses", shop: "Shop", settings: "Settings" },
  premiumTitle: "Upgrade to Premium",
  premiumDesc: "Learn without limits and unlock more perks!",
  premiumCta: "Upgrade now",
};

const zh: StudySidebarContent = {
  navHome: "首页",
  navDashboard: "仪表盘",
  sectionLearning: "学习",
  sectionCommunity: "社区",
  sectionOther: "其他",
  tree: {
    lessonBuilder: "AI 课程生成",
    overview: "总览",
    placement: "分级测试",
    placementTest: "参加分级测试",
    placementDashboard: "仪表盘",
    vocabulary: "词汇",
    vocabularyList: "单词列表",
    review: "复习",
    test: "测验",
    grammar: "语法",
    listening: "听力",
    listeningPractice: "听力练习",
    listeningDictation: "听写",
    listeningReading: "听力理解",
    listeningTopic: "主题听力",
    speaking: "口语",
    pronunciation: "发音练习",
    speakingTopics: "口语话题",
    speakingSituations: "情景对话",
    reading: "阅读",
    readingOverview: "阅读总览",
    readingPractice: "阅读练习",
    writing: "写作",
    writingPractice: "写作练习",
    writingCheck: "AI 批改作文",
    flashcards: "单词卡",
    flashcardsToday: "今日复习",
    flashcardsAll: "全部卡片",
    flashcardsCreate: "创建卡组",
  },
  community: { community: "社区", qa: "问答", achievements: "成就" },
  other: { courses: "课程", shop: "商店", settings: "设置" },
  premiumTitle: "升级高级版",
  premiumDesc: "无限学习，解锁更多专属特权！",
  premiumCta: "立即升级",
};

const de: StudySidebarContent = {
  navHome: "Startseite",
  navDashboard: "Dashboard",
  sectionLearning: "Lernen",
  sectionCommunity: "Community",
  sectionOther: "Sonstiges",
  tree: {
    lessonBuilder: "KI-Lektionsersteller",
    overview: "Übersicht",
    placement: "Einstufungstest",
    placementTest: "Einstufungstest machen",
    placementDashboard: "Dashboard",
    vocabulary: "Wortschatz",
    vocabularyList: "Wortliste",
    review: "Wiederholung",
    test: "Test",
    grammar: "Grammatik",
    listening: "Hören",
    listeningPractice: "Hörübung",
    listeningDictation: "Diktat",
    listeningReading: "Hörverständnis",
    listeningTopic: "Themenbezogenes Hören",
    speaking: "Sprechen",
    pronunciation: "Ausspracheübung",
    speakingTopics: "Sprechthemen",
    speakingSituations: "Situationen",
    reading: "Lesen",
    readingOverview: "Leseübersicht",
    readingPractice: "Leseübung",
    writing: "Schreiben",
    writingPractice: "Schreibübung",
    writingCheck: "KI-Textkorrektur",
    flashcards: "Karteikarten",
    flashcardsToday: "Heutige Wiederholung",
    flashcardsAll: "Alle Karten",
    flashcardsCreate: "Kartenset erstellen",
  },
  community: { community: "Community", qa: "Fragen & Antworten", achievements: "Erfolge" },
  other: { courses: "Kurse", shop: "Shop", settings: "Einstellungen" },
  premiumTitle: "Auf Premium upgraden",
  premiumDesc: "Lerne ohne Limits und schalte weitere Vorteile frei!",
  premiumCta: "Jetzt upgraden",
};

const studySidebarContent: Record<Locale, StudySidebarContent> = { vi, en, zh, de };

export default studySidebarContent;
