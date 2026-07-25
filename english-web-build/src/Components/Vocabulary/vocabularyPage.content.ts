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
  title: "Từ vựng",
  locked: {
    title: "Tuần học mới đang bị khóa",
    defaultReason: "Bạn cần hoàn thành bài kiểm tra tuần trước để tiếp tục.",
    cta: "Làm bài kiểm tra",
  },
  messages: {
    loadWordsError: "Không tải được danh sách từ hôm nay. Hãy đăng nhập lại hoặc tải lại trang.",
    loadTodayError: "Chưa tải được bài học từ vựng. Hãy kiểm tra đăng nhập rồi Thử lại.",
    loadingToday: "Đang chuẩn bị bài từ vựng hôm nay của bạn...",
    alreadyCompleted: "Bạn đã hoàn thành bài học hôm nay. Ngày mai sẽ có chủ đề mới.",
    noValidWord: "Chưa có từ vựng hợp lệ để lưu tiến độ. Hãy đăng nhập và tải lại bài học.",
    savedKnown: "?ã lưu: bạn đã biết từ này. Chuyển sang từ tiếp theo.",
    savedReview: "?ã đưa từ vào lịch ôn tập. Chuyển sang từ tiếp theo.",
    savedKnownDone: "?ã lưu: bạn đã biết từ này. Bạn đã xem hết danh sách hôm nay.",
    savedReviewDone: "?ã đưa từ vào lịch ôn tập. Bạn đã xem hết danh sách hôm nay.",
    saveProgressError: "Không lưu được tiến độ. Hãy đăng nhập lại rồi thử tiếp.",
    noWordForNotebook: "Chưa có từ vựng hợp lệ để lưu sổ tay.",
    removedFromNotebook: "?ã bỏ từ khỏi sổ tay.",
    addedToNotebook: "?ã thêm từ vào sổ tay.",
    notebookUpdateError: "Không cập nhật được sổ tay. Hãy đăng nhập lại rồi thử tiếp.",
    flashcardCompleted: "?ã hoàn thành bộ flashcard hôm nay. Beacon đã cập nhật lịch ôn cho bạn.",
    noAudio: "Từ này chưa có audio. Backend có thể bổ sung TTS sau để tự sinh file phát âm.",
    allWordsViewed: "Bạn đã xem hết danh sách từ hôm nay. Có thể bấm hoàn thành bài học.",
    completedToday: "?ã hoàn thành bài học hôm nay. Các từ sẽ được đưa vào lịch ôn tập.",
    extraWordsAdded: "?ã mở thêm {amount} từ. Hãy học vừa sức để nhớ lâu hơn nhé.",
    sharePosted: "?ã đăng bài từ vựng sang cộng đồng.",
    shareCreated: "?ã tạo nội dung chia sẻ.",
    goalReachedTomorrow: "Bạn đã hoàn thành mục tiêu hôm nay. Ngày mai AI sẽ chọn thêm từ mới.",
  },
  topBar: {
    searchPlaceholder: "Tìm bài học, từ vựng, ngữ pháp...",
    streak: "Streak",
    xpToday: "XP hôm nay",
    coins: "Xu",
  },
  studyCard: {
    completedBadge: "?ã hoàn thành hôm nay",
    exampleLabel: "Ví dụ",
    addNotebook: "Thêm vào sổ tay",
    savedNotebook: "?ã lưu sổ tay",
    flashcard: "Flashcard",
    known: "?ã biết",
    review: "Cần ôn lại",
    share: "Chia sẻ",
    wordCounter: "Từ {current}/{total}",
    defaultPartOfSpeech: "Danh từ",
  },
  pager: {
    prevWord: "Từ trước",
    nextWord: "Từ tiếp",
    none: "Không có",
    completeLesson: "Hoàn thành bài học",
    completed: "?ã hoàn thành",
  },
  tabs: {
    detail: "Chi tiết",
    example: "Ví dụ",
    synonym: "Từ đồng nghĩa",
    antonym: "Từ trái nghĩa",
    relatedPhrase: "Cụm từ liên quan",
  },
  detailTab: {
    wordType: "Loại từ",
    level: "Cấp độ",
    mediumBadge: "Trung cấp",
    topic: "Chủ đề",
    defaultTopic: "Theo chủ đề hôm nay",
    wordFamily: "Word family",
    collocations: "Collocations",
    antonyms: "Từ trái nghĩa",
    memoTitle: "Ghi nhớ",
    memoText: "Liên tưởng: “{word}” với ngữ cảnh thật trong ví dụ. Dùng flashcard để ôn lại nhanh và lưu lịch ôn tự động.",
    flashcardTip: "Ghi nhớ từ mới hiệu quả hơn với flashcard nhé!",
    learnWithFlashcard: "Học với flashcard",
  },
  exampleTab: {
    phonetic: "Phiên âm",
    meaning: "Nghĩa",
    examplesTitle: "Ví dụ",
    saveWord: "Lưu từ",
  },
  synonymTab: {
    title: "Từ đồng nghĩa",
    subtitle: "Những từ có nghĩa tương tự với “{word}”.",
    viewAll: "Xem tất cả",
    quickMemoTitle: "Ghi nhớ nhanh",
    quickMemoDesc: "Học từ đồng nghĩa giúp bạn diễn đạt tự nhiên hơn và ghi nhớ từ vựng lâu hơn.",
    practiceNow: "Luyện tập ngay",
  },
  antonymTab: {
    title: "Từ trái nghĩa",
    subtitle: "Những từ có nghĩa trái ngược với “{word}”.",
  },
  relatedPhraseTab: {
    title: "Cụm từ thường gặp với “{word}”",
  },
  statsPanel: {
    title: "Tiến độ của bạn",
    mastered: "?ã thành thạo",
    learned: "?ã học",
    toMastered: "Thành thạo",
    toReview: "Cần ôn",
    notebook: "Sổ tay",
    unit: "từ",
  },
  notebookPanel: {
    title: "Sổ tay của tôi",
    viewAll: "Xem tất cả",
    empty: "Chưa có từ nào trong sổ tay.",
    addedOn: "?ã thêm vào {date}",
    defaultLabel: "Từ hôm nay",
  },
  reviewSuggestion: {
    title: "Ôn tập gợi ý",
    viewAll: "Xem tất cả",
    defaultMeta: "B1 · Danh từ",
  },
  challengeCard: {
    title: "Thử thách hôm nay",
    defaultPrompt: "Sử dụng từ “{word}” trong 1 câu",
    start: "Bắt đầu thử thách",
  },
  detailModal: {
    defaultType: "Từ vựng",
    meaning: "Nghĩa",
    synonyms: "Đồng nghĩa",
    antonyms: "Trái nghĩa",
    sameTopic: "Cùng chủ đề",
  },
  infoListEmpty: "Chưa có dữ liệu",
  flashcardModal: {
    counter: "Flashcard {index}/{total}",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
  },
  shareModal: {
    title: "Chia sẻ từ vựng",
    subtitle: "Tạo bài viết cộng đồng cho từ",
    postButton: "?ăng lên cộng đồng",
    placeholder: "Hôm nay mình học từ \"{word}\". {meaning}",
  },
  challengeModal: {
    defaultTitle: "Thử thách hôm nay",
    resultFallback: "Kết quả: {correct}/{total} câu đúng · {score}%",
    hint: "Gợi ý",
    questionLabel: "Câu {n}",
    submit: "Nộp bài",
    sentencePlaceholder: "Ví dụ: We should protect the environment every day.",
  },
  completedModal: {
    title: "🎉 Bạn đã hoàn thành \n mục tiêu hôm nay!",
    subtitle: "Bạn vừa hoàn thành Daily Goal. Giờ hãy chọn bước tiếp theo: ôn lại để nhớ lâu, học thêm vừa sức, hoặc kết thúc hôm nay.",
    statsTitle: "Thành tích của bạn hôm nay",
    newWords: "Từ mới",
    accuracy: "Độ chính xác",
    time: "Thời gian",
    minutes: "{n} phút",
    tipTitle: "Khuyến nghị học bền vững",
    tipDesc: "Học quá nhiều từ mới trong một ngày có thể làm giảm khả năng ghi nhớ. BeaconVie khuyến nghị 10-20 từ/ngày và ưu tiên ôn tập SRS.",
    tomorrowTitle: "Ngày mai học thông minh hơn",
    tomorrowDesc: "AI sẽ ưu tiên ôn lại các từ đến hạn trước khi mở từ mới.",
    srsLine: "SRS: 1 ngày → 3 ngày → 7 ngày → 14 ngày",
    reviewNow: "Ôn tập ngay",
    learnMore: "Học thêm {amount}",
    finishToday: "Hoàn thành hôm nay",
    goSpeaking: "Đi luyện nói",
    goReading: "Đi luyện đọc",
    footerNote: "Trong thời gian chờ từ mới, bạn có thể luyện đọc, luyện nghe, luyện nói hoặc ngữ pháp.",
    reviewCounter: "Ôn tập SRS {index}/{total}",
    reviewModes: ["Thẻ ghi nhớ", "Chọn nghĩa", "Gõ lại từ", "Nghe và chọn", "Điền từ"],
    chooseCorrectMeaning: "Chọn nghĩa đúng của:",
    typeWordMeaning: "Gõ lại từ có nghĩa là:",
    typeWordPlaceholder: "Nhập từ tiếng Anh...",
    listenAndChoose: "Nghe phát âm",
    listenNoAudioFallback: "Không có audio thì hãy chọn từ theo nghĩa:",
    fillMissingWord: "Điền từ còn thiếu:",
    fillMissingPlaceholder: "Nhập từ còn thiếu...",
    check: "Kiểm tra",
    forgot: "Quên",
    hard: "Khó nhớ",
    remembered: "Nhớ rồi",
    reviewDoneTitle: "Ôn tập xong!",
    reviewDoneDesc: "Bạn nhớ đúng {remembered}/{total} từ. Lịch SRS đã được cập nhật.",
  },
};

const vocab: Record<Locale, VocabContent> = { vi, en: vi, zh: vi, de: vi };

export default vocab;

