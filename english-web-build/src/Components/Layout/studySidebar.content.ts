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
  navHome: "Trang chá»§",
  navDashboard: "Tổng quan",
  sectionLearning: "Há»c táº­p",
  sectionCommunity: "Cá»™ng Ä‘á»“ng",
  sectionOther: "KhÃ¡c",
  tree: {
    lessonBuilder: "AI táº¡o bÃ i há»c",
    overview: "Tá»•ng quan",
    placement: "Xáº¿p trÃ¬nh Ä‘á»™",
    placementTest: "Kiá»ƒm tra trÃ¬nh Ä‘á»™",
    placementDashboard: "Tổng quan",
    vocabulary: "Tá»« vá»±ng",
    vocabularyList: "Danh sÃ¡ch tá»«",
    review: "Ã”n táº­p",
    test: "Kiá»ƒm tra",
    grammar: "Ngá»¯ phÃ¡p",
    listening: "Nghe",
    listeningPractice: "Luyá»‡n nghe",
    listeningDictation: "Nghe chÃ©p chÃ­nh táº£",
    listeningReading: "Nghe hiá»ƒu Ä‘oáº¡n",
    listeningTopic: "Nghe theo chá»§ Ä‘á»",
    speaking: "NÃ³i",
    pronunciation: "Luyá»‡n phÃ¡t Ã¢m",
    speakingTopics: "Chá»§ Ä‘á» nÃ³i",
    speakingSituations: "TÃ¬nh huá»‘ng",
    conversation: "Há»™i thoáº¡i AI",
    studyRooms: "PhÃ²ng há»c nhÃ³m",
    reading: "Äá»c hiá»ƒu",
    readingOverview: "Tá»•ng quan Ä‘á»c",
    readingPractice: "Luyá»‡n Ä‘á»c",
    writing: "Viáº¿t",
    writingPractice: "Luyá»‡n viáº¿t",
    writingCheck: "AI cháº¥m bÃ i",
    flashcards: "Flashcards",
    flashcardsToday: "Ã”n táº­p hÃ´m nay",
    flashcardsAll: "Táº¥t cáº£ tháº»",
    flashcardsCreate: "Táº¡o bá»™ tháº»",
  },
  community: { community: "Cá»™ng Ä‘á»“ng", qa: "Há»i Ä‘Ã¡p", achievements: "ThÃ nh tÃ­ch" },
  other: { courses: "KhÃ³a há»c", shop: "Shop", settings: "CÃ i Ä‘áº·t" },
  premiumTitle: "NÃ¢ng cáº¥p Premium",
  premiumDesc: "Há»c khÃ´ng giá»›i háº¡n, nháº­n nhiá»u Ä‘áº·c quyá»n háº¥p dáº«n!",
  premiumCta: "NÃ¢ng cáº¥p ngay",
};

const studySidebarContent: Record<Locale, StudySidebarContent> = { vi, en: vi, zh: vi, de: vi };

export default studySidebarContent;

