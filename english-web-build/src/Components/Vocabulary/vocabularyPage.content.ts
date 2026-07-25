import { Locale } from "@/src/i18n/types";

export type VocabContent = {
  title: string;
  locked: { title: string; defaultReason: string; cta: string };
  messages: {
    loadWordsError: string;
    loadTodayError: string;
    loadingToday: string;
    alreadyCompleted: string;
    noValidWord: string;
    savedKnown: string;
    savedReview: string;
    savedKnownDone: string;
    savedReviewDone: string;
    saveProgressError: string;
    noWordForNotebook: string;
    removedFromNotebook: string;
    addedToNotebook: string;
    notebookUpdateError: string;
    flashcardCompleted: string;
    noAudio: string;
    allWordsViewed: string;
    completedToday: string;
    extraWordsAdded: string;
    sharePosted: string;
    shareCreated: string;
    goalReachedTomorrow: string;
  };
  topBar: { searchPlaceholder: string; streak: string; xpToday: string; coins: string };
  studyCard: {
    completedBadge: string;
    exampleLabel: string;
    addNotebook: string;
    savedNotebook: string;
    flashcard: string;
    known: string;
    review: string;
    share: string;
    wordCounter: string;
    defaultPartOfSpeech: string;
  };
  pager: { prevWord: string; nextWord: string; none: string; completeLesson: string; completed: string };
  tabs: { detail: string; example: string; synonym: string; antonym: string; relatedPhrase: string };
  detailTab: {
    wordType: string;
    level: string;
    mediumBadge: string;
    topic: string;
    defaultTopic: string;
    wordFamily: string;
    collocations: string;
    antonyms: string;
    memoTitle: string;
    memoText: string;
    flashcardTip: string;
    learnWithFlashcard: string;
  };
  exampleTab: { phonetic: string; meaning: string; examplesTitle: string; saveWord: string };
  synonymTab: {
    title: string;
    subtitle: string;
    viewAll: string;
    quickMemoTitle: string;
    quickMemoDesc: string;
    practiceNow: string;
  };
  antonymTab: { title: string; subtitle: string };
  relatedPhraseTab: { title: string };
  statsPanel: { title: string; mastered: string; learned: string; toMastered: string; toReview: string; notebook: string; unit: string };
  notebookPanel: { title: string; viewAll: string; empty: string; addedOn: string; defaultLabel: string };
  reviewSuggestion: { title: string; viewAll: string; defaultMeta: string };
  challengeCard: { title: string; defaultPrompt: string; start: string };
  detailModal: { defaultType: string; meaning: string; synonyms: string; antonyms: string; sameTopic: string };
  infoListEmpty: string;
  flashcardModal: { counter: string; again: string; hard: string; good: string; easy: string };
  shareModal: { title: string; subtitle: string; postButton: string; placeholder: string };
  challengeModal: {
    defaultTitle: string;
    resultFallback: string;
    hint: string;
    questionLabel: string;
    submit: string;
    sentencePlaceholder: string;
  };
  completedModal: {
    title: string;
    subtitle: string;
    statsTitle: string;
    newWords: string;
    accuracy: string;
    time: string;
    minutes: string;
    tipTitle: string;
    tipDesc: string;
    tomorrowTitle: string;
    tomorrowDesc: string;
    srsLine: string;
    reviewNow: string;
    learnMore: string;
    finishToday: string;
    goSpeaking: string;
    goReading: string;
    footerNote: string;
    reviewCounter: string;
    reviewModes: string[];
    chooseCorrectMeaning: string;
    typeWordMeaning: string;
    typeWordPlaceholder: string;
    listenAndChoose: string;
    listenNoAudioFallback: string;
    fillMissingWord: string;
    fillMissingPlaceholder: string;
    check: string;
    forgot: string;
    hard: string;
    remembered: string;
    reviewDoneTitle: string;
    reviewDoneDesc: string;
  };
};

const vi: VocabContent = {
  title: "Tá»« vá»±ng",
  locked: {
    title: "Tuáº§n há»c má»›i Ä‘ang bá»‹ khÃ³a",
    defaultReason: "Báº¡n cáº§n hoÃ n thÃ nh bÃ i kiá»ƒm tra tuáº§n trÆ°á»›c Ä‘á»ƒ tiáº¿p tá»¥c.",
    cta: "LÃ m bÃ i kiá»ƒm tra",
  },
  messages: {
    loadWordsError: "KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch tá»« hÃ´m nay. HÃ£y Ä‘Äƒng nháº­p láº¡i hoáº·c táº£i láº¡i trang.",
    loadTodayError: "ChÆ°a táº£i Ä‘Æ°á»£c bÃ i há»c tá»« vá»±ng. HÃ£y kiá»ƒm tra Ä‘Äƒng nháº­p rá»“i thá»­ láº¡i.",
    loadingToday: "Äang chuáº©n bá»‹ bÃ i tá»« vá»±ng hÃ´m nay cá»§a báº¡n...",
    alreadyCompleted: "Báº¡n Ä‘Ã£ hoÃ n thÃ nh bÃ i há»c hÃ´m nay. NgÃ y mai sáº½ cÃ³ chá»§ Ä‘á» má»›i.",
    noValidWord: "ChÆ°a cÃ³ tá»« vá»±ng há»£p lá»‡ Ä‘á»ƒ lÆ°u tiáº¿n Ä‘á»™. HÃ£y Ä‘Äƒng nháº­p vÃ  táº£i láº¡i bÃ i há»c.",
    savedKnown: "ÄÃ£ lÆ°u: báº¡n Ä‘Ã£ biáº¿t tá»« nÃ y. Chuyá»ƒn sang tá»« tiáº¿p theo.",
    savedReview: "ÄÃ£ Ä‘Æ°a tá»« vÃ o lá»‹ch Ã´n táº­p. Chuyá»ƒn sang tá»« tiáº¿p theo.",
    savedKnownDone: "ÄÃ£ lÆ°u: báº¡n Ä‘Ã£ biáº¿t tá»« nÃ y. Báº¡n Ä‘Ã£ xem háº¿t danh sÃ¡ch hÃ´m nay.",
    savedReviewDone: "ÄÃ£ Ä‘Æ°a tá»« vÃ o lá»‹ch Ã´n táº­p. Báº¡n Ä‘Ã£ xem háº¿t danh sÃ¡ch hÃ´m nay.",
    saveProgressError: "KhÃ´ng lÆ°u Ä‘Æ°á»£c tiáº¿n Ä‘á»™. HÃ£y Ä‘Äƒng nháº­p láº¡i rá»“i thá»­ tiáº¿p.",
    noWordForNotebook: "ChÆ°a cÃ³ tá»« vá»±ng há»£p lá»‡ Ä‘á»ƒ lÆ°u sá»• tay.",
    removedFromNotebook: "ÄÃ£ bá» tá»« khá»i sá»• tay.",
    addedToNotebook: "ÄÃ£ thÃªm tá»« vÃ o sá»• tay.",
    notebookUpdateError: "KhÃ´ng cáº­p nháº­t Ä‘Æ°á»£c sá»• tay. HÃ£y Ä‘Äƒng nháº­p láº¡i rá»“i thá»­ tiáº¿p.",
    flashcardCompleted: "ÄÃ£ hoÃ n thÃ nh bá»™ flashcard hÃ´m nay. Beacon Ä‘Ã£ cáº­p nháº­t lá»‹ch Ã´n cho báº¡n.",
    noAudio: "Tá»« nÃ y chÆ°a cÃ³ audio. Backend cÃ³ thá»ƒ bá»• sung TTS sau Ä‘á»ƒ tá»± sinh file phÃ¡t Ã¢m.",
    allWordsViewed: "Báº¡n Ä‘Ã£ xem háº¿t danh sÃ¡ch tá»« hÃ´m nay. CÃ³ thá»ƒ báº¥m hoÃ n thÃ nh bÃ i há»c.",
    completedToday: "ÄÃ£ hoÃ n thÃ nh bÃ i há»c hÃ´m nay. CÃ¡c tá»« sáº½ Ä‘Æ°á»£c Ä‘Æ°a vÃ o lá»‹ch Ã´n táº­p.",
    extraWordsAdded: "ÄÃ£ má»Ÿ thÃªm {amount} tá»«. HÃ£y há»c vá»«a sá»©c Ä‘á»ƒ nhá»› lÃ¢u hÆ¡n nhÃ©.",
    sharePosted: "ÄÃ£ Ä‘Äƒng bÃ i tá»« vá»±ng sang cá»™ng Ä‘á»“ng.",
    shareCreated: "ÄÃ£ táº¡o ná»™i dung chia sáº».",
    goalReachedTomorrow: "Báº¡n Ä‘Ã£ hoÃ n thÃ nh má»¥c tiÃªu hÃ´m nay. NgÃ y mai AI sáº½ chá»n thÃªm tá»« má»›i.",
  },
  topBar: {
    searchPlaceholder: "TÃ¬m bÃ i há»c, tá»« vá»±ng, ngá»¯ phÃ¡p...",
    streak: "Streak",
    xpToday: "XP hÃ´m nay",
    coins: "Xu",
  },
  studyCard: {
    completedBadge: "ÄÃ£ hoÃ n thÃ nh hÃ´m nay",
    exampleLabel: "VÃ­ dá»¥",
    addNotebook: "ThÃªm vÃ o sá»• tay",
    savedNotebook: "ÄÃ£ lÆ°u sá»• tay",
    flashcard: "Flashcard",
    known: "ÄÃ£ biáº¿t",
    review: "Cáº§n Ã´n láº¡i",
    share: "Chia sáº»",
    wordCounter: "Tá»« {current}/{total}",
    defaultPartOfSpeech: "Danh tá»«",
  },
  pager: {
    prevWord: "Tá»« trÆ°á»›c",
    nextWord: "Tá»« tiáº¿p",
    none: "KhÃ´ng cÃ³",
    completeLesson: "HoÃ n thÃ nh bÃ i há»c",
    completed: "ÄÃ£ hoÃ n thÃ nh",
  },
  tabs: {
    detail: "Chi tiáº¿t",
    example: "VÃ­ dá»¥",
    synonym: "Tá»« Ä‘á»“ng nghÄ©a",
    antonym: "Tá»« trÃ¡i nghÄ©a",
    relatedPhrase: "Cá»¥m tá»« liÃªn quan",
  },
  detailTab: {
    wordType: "Loáº¡i tá»«",
    level: "Cáº¥p Ä‘á»™",
    mediumBadge: "Trung cáº¥p",
    topic: "Chá»§ Ä‘á»",
    defaultTopic: "Theo chá»§ Ä‘á» hÃ´m nay",
    wordFamily: "Word family",
    collocations: "Collocations",
    antonyms: "Tá»« trÃ¡i nghÄ©a",
    memoTitle: "Ghi nhá»›",
    memoText: "LiÃªn tÆ°á»Ÿng: â€œ{word}â€ vá»›i ngá»¯ cáº£nh tháº­t trong vÃ­ dá»¥. DÃ¹ng flashcard Ä‘á»ƒ Ã´n láº¡i nhanh vÃ  lÆ°u lá»‹ch Ã´n tá»± Ä‘á»™ng.",
    flashcardTip: "Ghi nhá»› tá»« má»›i hiá»‡u quáº£ hÆ¡n vá»›i flashcard nhÃ©!",
    learnWithFlashcard: "Há»c vá»›i flashcard",
  },
  exampleTab: {
    phonetic: "PhiÃªn Ã¢m",
    meaning: "NghÄ©a",
    examplesTitle: "VÃ­ dá»¥",
    saveWord: "LÆ°u tá»«",
  },
  synonymTab: {
    title: "Tá»« Ä‘á»“ng nghÄ©a",
    subtitle: "Nhá»¯ng tá»« cÃ³ nghÄ©a tÆ°Æ¡ng tá»± vá»›i â€œ{word}â€.",
    viewAll: "Xem táº¥t cáº£",
    quickMemoTitle: "Ghi nhá»› nhanh",
    quickMemoDesc: "Há»c tá»« Ä‘á»“ng nghÄ©a giÃºp báº¡n diá»…n Ä‘áº¡t tá»± nhiÃªn hÆ¡n vÃ  ghi nhá»› tá»« vá»±ng lÃ¢u hÆ¡n.",
    practiceNow: "Luyá»‡n táº­p ngay",
  },
  antonymTab: {
    title: "Tá»« trÃ¡i nghÄ©a",
    subtitle: "Nhá»¯ng tá»« cÃ³ nghÄ©a trÃ¡i ngÆ°á»£c vá»›i â€œ{word}â€.",
  },
  relatedPhraseTab: {
    title: "Cá»¥m tá»« thÆ°á»ng gáº·p vá»›i â€œ{word}â€",
  },
  statsPanel: {
    title: "Tiáº¿n Ä‘á»™ cá»§a báº¡n",
    mastered: "ÄÃ£ thÃ nh tháº¡o",
    learned: "ÄÃ£ há»c",
    toMastered: "ThÃ nh tháº¡o",
    toReview: "Cáº§n Ã´n",
    notebook: "Sá»• tay",
    unit: "tá»«",
  },
  notebookPanel: {
    title: "Sá»• tay cá»§a tÃ´i",
    viewAll: "Xem táº¥t cáº£",
    empty: "ChÆ°a cÃ³ tá»« nÃ o trong sá»• tay.",
    addedOn: "ÄÃ£ thÃªm vÃ o {date}",
    defaultLabel: "Tá»« hÃ´m nay",
  },
  reviewSuggestion: {
    title: "Ã”n táº­p gá»£i Ã½",
    viewAll: "Xem táº¥t cáº£",
    defaultMeta: "B1 Â· Danh tá»«",
  },
  challengeCard: {
    title: "Thá»­ thÃ¡ch hÃ´m nay",
    defaultPrompt: "Sá»­ dá»¥ng tá»« â€œ{word}â€ trong 1 cÃ¢u",
    start: "Báº¯t Ä‘áº§u thá»­ thÃ¡ch",
  },
  detailModal: {
    defaultType: "Tá»« vá»±ng",
    meaning: "NghÄ©a",
    synonyms: "Äá»“ng nghÄ©a",
    antonyms: "TrÃ¡i nghÄ©a",
    sameTopic: "CÃ¹ng chá»§ Ä‘á»",
  },
  infoListEmpty: "ChÆ°a cÃ³ dá»¯ liá»‡u",
  flashcardModal: {
    counter: "Flashcard {index}/{total}",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
  },
  shareModal: {
    title: "Chia sáº» tá»« vá»±ng",
    subtitle: "Táº¡o bÃ i viáº¿t cá»™ng Ä‘á»“ng cho tá»«",
    postButton: "ÄÄƒng lÃªn cá»™ng Ä‘á»“ng",
    placeholder: "HÃ´m nay mÃ¬nh há»c tá»« \"{word}\". {meaning}",
  },
  challengeModal: {
    defaultTitle: "Thá»­ thÃ¡ch hÃ´m nay",
    resultFallback: "Káº¿t quáº£: {correct}/{total} cÃ¢u Ä‘Ãºng Â· {score}%",
    hint: "Gá»£i Ã½",
    questionLabel: "CÃ¢u {n}",
    submit: "Ná»™p bÃ i",
    sentencePlaceholder: "VÃ­ dá»¥: We should protect the environment every day.",
  },
  completedModal: {
    title: "ðŸŽ‰ Báº¡n Ä‘Ã£ hoÃ n thÃ nh \n má»¥c tiÃªu hÃ´m nay!",
    subtitle: "Báº¡n vá»«a hoÃ n thÃ nh Daily Goal. Giá» hÃ£y chá»n bÆ°á»›c tiáº¿p theo: Ã´n láº¡i Ä‘á»ƒ nhá»› lÃ¢u, há»c thÃªm vá»«a sá»©c, hoáº·c káº¿t thÃºc hÃ´m nay.",
    statsTitle: "ThÃ nh tÃ­ch cá»§a báº¡n hÃ´m nay",
    newWords: "Tá»« má»›i",
    accuracy: "Äá»™ chÃ­nh xÃ¡c",
    time: "Thá»i gian",
    minutes: "{n} phÃºt",
    tipTitle: "Khuyáº¿n nghá»‹ há»c bá»n vá»¯ng",
    tipDesc: "Há»c quÃ¡ nhiá»u tá»« má»›i trong má»™t ngÃ y cÃ³ thá»ƒ lÃ m giáº£m kháº£ nÄƒng ghi nhá»›. BeaconVie khuyáº¿n nghá»‹ 10-20 tá»«/ngÃ y vÃ  Æ°u tiÃªn Ã´n táº­p SRS.",
    tomorrowTitle: "NgÃ y mai há»c thÃ´ng minh hÆ¡n",
    tomorrowDesc: "AI sáº½ Æ°u tiÃªn Ã´n láº¡i cÃ¡c tá»« Ä‘áº¿n háº¡n trÆ°á»›c khi má»Ÿ tá»« má»›i.",
    srsLine: "SRS: 1 ngÃ y â†’ 3 ngÃ y â†’ 7 ngÃ y â†’ 14 ngÃ y",
    reviewNow: "Ã”n táº­p ngay",
    learnMore: "Há»c thÃªm {amount}",
    finishToday: "HoÃ n thÃ nh hÃ´m nay",
    goSpeaking: "Đi luyện nói",
    goReading: "Đi luyện đọc",
    footerNote: "Trong thời gian chờ từ mới, bạn có thể luyện đọc, luyện nghe, luyện nói hoặc ngữ pháp.",
    reviewCounter: "Ã”n táº­p SRS {index}/{total}",
    reviewModes: ["Thẻ ghi nhớ", "Chá»n nghÄ©a", "GÃµ láº¡i tá»«", "Nghe vÃ  chá»n", "Äiá»n tá»«"],
    chooseCorrectMeaning: "Chá»n nghÄ©a Ä‘Ãºng cá»§a:",
    typeWordMeaning: "GÃµ láº¡i tá»« cÃ³ nghÄ©a lÃ :",
    typeWordPlaceholder: "Nháº­p tá»« tiáº¿ng Anh...",
    listenAndChoose: "Nghe phÃ¡t Ã¢m",
    listenNoAudioFallback: "KhÃ´ng cÃ³ audio thÃ¬ hÃ£y chá»n tá»« theo nghÄ©a:",
    fillMissingWord: "Äiá»n tá»« cÃ²n thiáº¿u:",
    fillMissingPlaceholder: "Nháº­p tá»« cÃ²n thiáº¿u...",
    check: "Kiá»ƒm tra",
    forgot: "QuÃªn",
    hard: "KhÃ³ nhá»›",
    remembered: "Nhá»› rá»“i",
    reviewDoneTitle: "Ã”n táº­p xong!",
    reviewDoneDesc: "Báº¡n nhá»› Ä‘Ãºng {remembered}/{total} tá»«. Lá»‹ch SRS Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t.",
  },
};

const vocab: Record<Locale, VocabContent> = { vi, en: vi, zh: vi, de: vi };

export default vocab;

