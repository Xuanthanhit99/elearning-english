import { Locale } from "@/src/i18n/types";

export type VocabContent = {
  title: string;
  locked: { title: string; defaultReason: string; cta: string };
  messages: {
    loadWordsError: string;
    loadTodayError: string;
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
    loadTodayError: "Chưa tải được bài học từ vựng. Hãy kiểm tra đăng nhập rồi thử lại.",
    alreadyCompleted: "Bạn đã hoàn thành bài học hôm nay. Ngày mai sẽ có chủ đề mới.",
    noValidWord: "Chưa có từ vựng hợp lệ để lưu tiến độ. Hãy đăng nhập và tải lại bài học.",
    savedKnown: "Đã lưu: bạn đã biết từ này. Chuyển sang từ tiếp theo.",
    savedReview: "Đã đưa từ vào lịch ôn tập. Chuyển sang từ tiếp theo.",
    savedKnownDone: "Đã lưu: bạn đã biết từ này. Bạn đã xem hết danh sách hôm nay.",
    savedReviewDone: "Đã đưa từ vào lịch ôn tập. Bạn đã xem hết danh sách hôm nay.",
    saveProgressError: "Không lưu được tiến độ. Hãy đăng nhập lại rồi thử tiếp.",
    noWordForNotebook: "Chưa có từ vựng hợp lệ để lưu sổ tay.",
    removedFromNotebook: "Đã bỏ từ khỏi sổ tay.",
    addedToNotebook: "Đã thêm từ vào sổ tay.",
    notebookUpdateError: "Không cập nhật được sổ tay. Hãy đăng nhập lại rồi thử tiếp.",
    flashcardCompleted: "Đã hoàn thành bộ flashcard hôm nay. Foxy đã cập nhật lịch ôn cho bạn.",
    noAudio: "Từ này chưa có audio. Backend có thể bổ sung TTS sau để tự sinh file phát âm.",
    allWordsViewed: "Bạn đã xem hết danh sách từ hôm nay. Có thể bấm hoàn thành bài học.",
    completedToday: "Đã hoàn thành bài học hôm nay. Các từ sẽ được đưa vào lịch ôn tập.",
    extraWordsAdded: "Đã mở thêm {amount} từ. Hãy học vừa sức để nhớ lâu hơn nhé.",
    sharePosted: "Đã đăng bài từ vựng sang cộng đồng.",
    shareCreated: "Đã tạo nội dung chia sẻ.",
    goalReachedTomorrow: "Bạn đã hoàn thành mục tiêu hôm nay. Ngày mai AI sẽ chọn thêm từ mới.",
  },
  topBar: {
    searchPlaceholder: "Tìm bài học, từ vựng, ngữ pháp...",
    streak: "Streak",
    xpToday: "XP hôm nay",
    coins: "Xu",
  },
  studyCard: {
    completedBadge: "Đã hoàn thành hôm nay",
    exampleLabel: "Ví dụ",
    addNotebook: "Thêm vào sổ tay",
    savedNotebook: "Đã lưu sổ tay",
    flashcard: "Flashcard",
    known: "Đã biết",
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
    completed: "Đã hoàn thành",
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
    mastered: "Đã thành thạo",
    learned: "Đã học",
    toMastered: "Thành thạo",
    toReview: "Cần ôn",
    notebook: "Sổ tay",
    unit: "từ",
  },
  notebookPanel: {
    title: "Sổ tay của tôi",
    viewAll: "Xem tất cả",
    empty: "Chưa có từ nào trong sổ tay.",
    addedOn: "Đã thêm vào {date}",
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
    postButton: "Đăng lên cộng đồng",
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
    tipDesc: "Học quá nhiều từ mới trong một ngày có thể làm giảm khả năng ghi nhớ. Lumiverse khuyến nghị 10-20 từ/ngày và ưu tiên ôn tập SRS.",
    tomorrowTitle: "Ngày mai học thông minh hơn",
    tomorrowDesc: "AI sẽ ưu tiên ôn lại các từ đến hạn trước khi mở từ mới.",
    srsLine: "SRS: 1 ngày → 3 ngày → 7 ngày → 14 ngày",
    reviewNow: "Ôn tập ngay",
    learnMore: "Học thêm {amount}",
    finishToday: "Hoàn thành hôm nay",
    goSpeaking: "Đi luyện Speaking",
    goReading: "Đi luyện Reading",
    footerNote: "Trong thời gian chờ từ mới, bạn có thể luyện Reading, Listening, Speaking hoặc Grammar.",
    reviewCounter: "Ôn tập SRS {index}/{total}",
    reviewModes: ["Flashcard", "Chọn nghĩa", "Gõ lại từ", "Nghe và chọn", "Điền từ"],
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

const en: VocabContent = {
  title: "Vocabulary",
  locked: {
    title: "This week is locked",
    defaultReason: "Complete last week's test to continue.",
    cta: "Take the test",
  },
  messages: {
    loadWordsError: "Couldn't load today's words. Please sign in again or reload the page.",
    loadTodayError: "Couldn't load the vocabulary lesson. Please check you're signed in and try again.",
    alreadyCompleted: "You've completed today's lesson. A new topic will be ready tomorrow.",
    noValidWord: "No valid word to save progress for. Please sign in and reload the lesson.",
    savedKnown: "Saved: you know this word. Moving to the next one.",
    savedReview: "Added to your review schedule. Moving to the next one.",
    savedKnownDone: "Saved: you know this word. You've gone through today's list.",
    savedReviewDone: "Added to your review schedule. You've gone through today's list.",
    saveProgressError: "Couldn't save progress. Please sign in again and retry.",
    noWordForNotebook: "No valid word to save to the notebook.",
    removedFromNotebook: "Removed from notebook.",
    addedToNotebook: "Added to notebook.",
    notebookUpdateError: "Couldn't update the notebook. Please sign in again and retry.",
    flashcardCompleted: "You've finished today's flashcards. Foxy updated your review schedule.",
    noAudio: "This word has no audio yet. The backend may add TTS later to generate pronunciation.",
    allWordsViewed: "You've gone through today's words. You can mark the lesson as complete.",
    completedToday: "Today's lesson is complete. These words are now on your review schedule.",
    extraWordsAdded: "Unlocked {amount} more words. Pace yourself for better retention.",
    sharePosted: "Your vocabulary post was shared to the community.",
    shareCreated: "Share content created.",
    goalReachedTomorrow: "You've reached today's goal. The AI will pick new words for tomorrow.",
  },
  topBar: {
    searchPlaceholder: "Search lessons, vocabulary, grammar...",
    streak: "Streak",
    xpToday: "XP today",
    coins: "Coins",
  },
  studyCard: {
    completedBadge: "Completed today",
    exampleLabel: "Example",
    addNotebook: "Add to notebook",
    savedNotebook: "Saved to notebook",
    flashcard: "Flashcard",
    known: "Known",
    review: "Needs review",
    share: "Share",
    wordCounter: "Word {current}/{total}",
    defaultPartOfSpeech: "Noun",
  },
  pager: {
    prevWord: "Previous word",
    nextWord: "Next word",
    none: "None",
    completeLesson: "Complete lesson",
    completed: "Completed",
  },
  tabs: {
    detail: "Detail",
    example: "Example",
    synonym: "Synonyms",
    antonym: "Antonyms",
    relatedPhrase: "Related phrases",
  },
  detailTab: {
    wordType: "Part of speech",
    level: "Level",
    mediumBadge: "Intermediate",
    topic: "Topic",
    defaultTopic: "Today's topic",
    wordFamily: "Word family",
    collocations: "Collocations",
    antonyms: "Antonyms",
    memoTitle: "Memory tip",
    memoText: "Associate “{word}” with a real context from the example. Use flashcards to review quickly with automatic scheduling.",
    flashcardTip: "Remember new words better with flashcards!",
    learnWithFlashcard: "Study with flashcards",
  },
  exampleTab: {
    phonetic: "Phonetic",
    meaning: "Meaning",
    examplesTitle: "Examples",
    saveWord: "Save word",
  },
  synonymTab: {
    title: "Synonyms",
    subtitle: "Words with a similar meaning to “{word}”.",
    viewAll: "View all",
    quickMemoTitle: "Quick tip",
    quickMemoDesc: "Learning synonyms helps you sound more natural and remember vocabulary longer.",
    practiceNow: "Practice now",
  },
  antonymTab: {
    title: "Antonyms",
    subtitle: "Words with the opposite meaning to “{word}”.",
  },
  relatedPhraseTab: {
    title: "Common phrases with “{word}”",
  },
  statsPanel: {
    title: "Your progress",
    mastered: "Mastered",
    learned: "Learned",
    toMastered: "Mastered",
    toReview: "To review",
    notebook: "Notebook",
    unit: "words",
  },
  notebookPanel: {
    title: "My notebook",
    viewAll: "View all",
    empty: "No words in your notebook yet.",
    addedOn: "Added on {date}",
    defaultLabel: "Today's word",
  },
  reviewSuggestion: {
    title: "Suggested review",
    viewAll: "View all",
    defaultMeta: "B1 · Noun",
  },
  challengeCard: {
    title: "Today's challenge",
    defaultPrompt: "Use the word “{word}” in a sentence",
    start: "Start the challenge",
  },
  detailModal: {
    defaultType: "Vocabulary",
    meaning: "Meaning",
    synonyms: "Synonyms",
    antonyms: "Antonyms",
    sameTopic: "Same topic",
  },
  infoListEmpty: "No data yet",
  flashcardModal: {
    counter: "Flashcard {index}/{total}",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
  },
  shareModal: {
    title: "Share this word",
    subtitle: "Create a community post for the word",
    postButton: "Post to community",
    placeholder: "Today I learned the word \"{word}\". {meaning}",
  },
  challengeModal: {
    defaultTitle: "Today's challenge",
    resultFallback: "Result: {correct}/{total} correct · {score}%",
    hint: "Hint",
    questionLabel: "Question {n}",
    submit: "Submit",
    sentencePlaceholder: "Example: We should protect the environment every day.",
  },
  completedModal: {
    title: "🎉 You've reached \n today's goal!",
    subtitle: "You just completed your Daily Goal. Now choose what's next: review to remember longer, learn a bit more, or wrap up for today.",
    statsTitle: "Today's results",
    newWords: "New words",
    accuracy: "Accuracy",
    time: "Time",
    minutes: "{n} min",
    tipTitle: "Sustainable learning tip",
    tipDesc: "Learning too many new words in one day can hurt retention. Lumiverse recommends 10-20 words/day and prioritizing SRS review.",
    tomorrowTitle: "Learn smarter tomorrow",
    tomorrowDesc: "The AI will prioritize reviewing due words before introducing new ones.",
    srsLine: "SRS: 1 day → 3 days → 7 days → 14 days",
    reviewNow: "Review now",
    learnMore: "Learn {amount} more",
    finishToday: "Finish for today",
    goSpeaking: "Go practice Speaking",
    goReading: "Go practice Reading",
    footerNote: "While waiting for new words, you can practice Reading, Listening, Speaking or Grammar.",
    reviewCounter: "SRS review {index}/{total}",
    reviewModes: ["Flashcard", "Choose meaning", "Type the word", "Listen and choose", "Fill in the blank"],
    chooseCorrectMeaning: "Choose the correct meaning of:",
    typeWordMeaning: "Type the word that means:",
    typeWordPlaceholder: "Type the English word...",
    listenAndChoose: "Play pronunciation",
    listenNoAudioFallback: "No audio available — choose the word by meaning:",
    fillMissingWord: "Fill in the missing word:",
    fillMissingPlaceholder: "Type the missing word...",
    check: "Check",
    forgot: "Forgot",
    hard: "Hard to recall",
    remembered: "Remembered",
    reviewDoneTitle: "Review complete!",
    reviewDoneDesc: "You remembered {remembered}/{total} words. Your SRS schedule has been updated.",
  },
};

const zh: VocabContent = {
  title: "词汇",
  locked: {
    title: "本周内容已锁定",
    defaultReason: "请先完成上周的测验以继续。",
    cta: "去做测验",
  },
  messages: {
    loadWordsError: "无法加载今日单词列表，请重新登录或刷新页面。",
    loadTodayError: "词汇课程加载失败，请检查登录状态后重试。",
    alreadyCompleted: "你今天的课程已完成，明天会有新主题。",
    noValidWord: "没有有效的单词可保存进度，请登录并重新加载课程。",
    savedKnown: "已保存：你已掌握此单词，切换到下一个。",
    savedReview: "已加入复习计划，切换到下一个。",
    savedKnownDone: "已保存：你已掌握此单词。你已看完今日列表。",
    savedReviewDone: "已加入复习计划。你已看完今日列表。",
    saveProgressError: "进度保存失败，请重新登录后再试。",
    noWordForNotebook: "没有有效的单词可保存到生词本。",
    removedFromNotebook: "已从生词本中移除。",
    addedToNotebook: "已添加到生词本。",
    notebookUpdateError: "生词本更新失败，请重新登录后再试。",
    flashcardCompleted: "今日单词卡已完成，Foxy 已为你更新复习计划。",
    noAudio: "此单词暂无音频，后端可能会later添加语音合成。",
    allWordsViewed: "你已看完今日单词列表，可以点击完成课程。",
    completedToday: "今日课程已完成，单词已加入复习计划。",
    extraWordsAdded: "已解锁 {amount} 个新单词，请量力而行以便更好记忆。",
    sharePosted: "词汇内容已分享到社区。",
    shareCreated: "分享内容已生成。",
    goalReachedTomorrow: "你已完成今日目标，明天 AI 会为你挑选新单词。",
  },
  topBar: {
    searchPlaceholder: "搜索课程、词汇、语法...",
    streak: "连续天数",
    xpToday: "今日经验值",
    coins: "金币",
  },
  studyCard: {
    completedBadge: "今日已完成",
    exampleLabel: "例句",
    addNotebook: "添加到生词本",
    savedNotebook: "已存入生词本",
    flashcard: "单词卡",
    known: "已掌握",
    review: "需要复习",
    share: "分享",
    wordCounter: "第 {current}/{total} 个单词",
    defaultPartOfSpeech: "名词",
  },
  pager: {
    prevWord: "上一个单词",
    nextWord: "下一个单词",
    none: "无",
    completeLesson: "完成课程",
    completed: "已完成",
  },
  tabs: {
    detail: "详情",
    example: "例句",
    synonym: "近义词",
    antonym: "反义词",
    relatedPhrase: "相关短语",
  },
  detailTab: {
    wordType: "词性",
    level: "等级",
    mediumBadge: "中级",
    topic: "主题",
    defaultTopic: "今日主题",
    wordFamily: "Word family",
    collocations: "Collocations",
    antonyms: "反义词",
    memoTitle: "记忆技巧",
    memoText: "将 “{word}” 与例句中的真实语境联系起来。使用单词卡快速复习并自动安排复习计划。",
    flashcardTip: "使用单词卡能更有效地记住新单词！",
    learnWithFlashcard: "用单词卡学习",
  },
  exampleTab: {
    phonetic: "音标",
    meaning: "释义",
    examplesTitle: "例句",
    saveWord: "保存单词",
  },
  synonymTab: {
    title: "近义词",
    subtitle: "与 “{word}” 意思相近的单词。",
    viewAll: "查看全部",
    quickMemoTitle: "快速记忆",
    quickMemoDesc: "学习近义词能让你的表达更自然，并且更持久地记住词汇。",
    practiceNow: "立即练习",
  },
  antonymTab: {
    title: "反义词",
    subtitle: "与 “{word}” 意思相反的单词。",
  },
  relatedPhraseTab: {
    title: "与 “{word}” 相关的常用短语",
  },
  statsPanel: {
    title: "你的进度",
    mastered: "已掌握",
    learned: "已学习",
    toMastered: "已掌握",
    toReview: "待复习",
    notebook: "生词本",
    unit: "个单词",
  },
  notebookPanel: {
    title: "我的生词本",
    viewAll: "查看全部",
    empty: "生词本中还没有单词。",
    addedOn: "添加于 {date}",
    defaultLabel: "今日单词",
  },
  reviewSuggestion: {
    title: "推荐复习",
    viewAll: "查看全部",
    defaultMeta: "B1 · 名词",
  },
  challengeCard: {
    title: "今日挑战",
    defaultPrompt: "用单词 “{word}” 造一个句子",
    start: "开始挑战",
  },
  detailModal: {
    defaultType: "词汇",
    meaning: "释义",
    synonyms: "近义词",
    antonyms: "反义词",
    sameTopic: "同主题词汇",
  },
  infoListEmpty: "暂无数据",
  flashcardModal: {
    counter: "单词卡 {index}/{total}",
    again: "重来",
    hard: "较难",
    good: "掌握",
    easy: "简单",
  },
  shareModal: {
    title: "分享词汇",
    subtitle: "为这个单词创建一篇社区帖子",
    postButton: "发布到社区",
    placeholder: "今天我学到了单词 \"{word}\"。{meaning}",
  },
  challengeModal: {
    defaultTitle: "今日挑战",
    resultFallback: "结果：{correct}/{total} 题正确 · {score}%",
    hint: "提示",
    questionLabel: "第 {n} 题",
    submit: "提交",
    sentencePlaceholder: "例如：We should protect the environment every day.",
  },
  completedModal: {
    title: "🎉 你已完成 \n 今日目标！",
    subtitle: "你刚刚完成了每日目标。现在可以选择下一步：复习巩固记忆、适量多学一点，或结束今天的学习。",
    statsTitle: "今日成果",
    newWords: "新单词",
    accuracy: "正确率",
    time: "用时",
    minutes: "{n} 分钟",
    tipTitle: "可持续学习建议",
    tipDesc: "一天学习太多新单词可能会降低记忆效果。Lumiverse 建议每天学习 10-20 个单词，并优先进行 SRS 复习。",
    tomorrowTitle: "明天学得更聪明",
    tomorrowDesc: "AI 会优先复习到期的单词，然后再引入新单词。",
    srsLine: "SRS：1 天 → 3 天 → 7 天 → 14 天",
    reviewNow: "立即复习",
    learnMore: "再学 {amount} 个",
    finishToday: "结束今天的学习",
    goSpeaking: "去练习口语",
    goReading: "去练习阅读",
    footerNote: "在等待新单词期间，你可以练习阅读、听力、口语或语法。",
    reviewCounter: "SRS 复习 {index}/{total}",
    reviewModes: ["单词卡", "选择释义", "重新输入单词", "听音选择", "填空"],
    chooseCorrectMeaning: "选择正确的释义：",
    typeWordMeaning: "输入符合以下释义的单词：",
    typeWordPlaceholder: "输入英文单词...",
    listenAndChoose: "播放发音",
    listenNoAudioFallback: "暂无音频，请根据释义选择单词：",
    fillMissingWord: "填写缺失的单词：",
    fillMissingPlaceholder: "输入缺失的单词...",
    check: "检查",
    forgot: "忘记了",
    hard: "记不清",
    remembered: "记住了",
    reviewDoneTitle: "复习完成！",
    reviewDoneDesc: "你答对了 {remembered}/{total} 个单词。SRS 复习计划已更新。",
  },
};

const de: VocabContent = {
  title: "Wortschatz",
  locked: {
    title: "Diese Woche ist gesperrt",
    defaultReason: "Schließe den Test der letzten Woche ab, um fortzufahren.",
    cta: "Test starten",
  },
  messages: {
    loadWordsError: "Die heutigen Wörter konnten nicht geladen werden. Bitte melde dich erneut an oder lade die Seite neu.",
    loadTodayError: "Die Vokabellektion konnte nicht geladen werden. Bitte prüfe deine Anmeldung und versuche es erneut.",
    alreadyCompleted: "Du hast die heutige Lektion abgeschlossen. Morgen gibt es ein neues Thema.",
    noValidWord: "Kein gültiges Wort, um den Fortschritt zu speichern. Bitte melde dich an und lade die Lektion neu.",
    savedKnown: "Gespeichert: Du kennst dieses Wort. Weiter zum nächsten.",
    savedReview: "Zum Wiederholungsplan hinzugefügt. Weiter zum nächsten.",
    savedKnownDone: "Gespeichert: Du kennst dieses Wort. Du hast die heutige Liste durchgesehen.",
    savedReviewDone: "Zum Wiederholungsplan hinzugefügt. Du hast die heutige Liste durchgesehen.",
    saveProgressError: "Fortschritt konnte nicht gespeichert werden. Bitte melde dich erneut an und versuche es noch einmal.",
    noWordForNotebook: "Kein gültiges Wort, um es im Notizbuch zu speichern.",
    removedFromNotebook: "Aus dem Notizbuch entfernt.",
    addedToNotebook: "Zum Notizbuch hinzugefügt.",
    notebookUpdateError: "Notizbuch konnte nicht aktualisiert werden. Bitte melde dich erneut an und versuche es noch einmal.",
    flashcardCompleted: "Du hast die heutigen Karteikarten abgeschlossen. Foxy hat deinen Wiederholungsplan aktualisiert.",
    noAudio: "Für dieses Wort gibt es noch kein Audio. Das Backend könnte später TTS zur automatischen Aussprache hinzufügen.",
    allWordsViewed: "Du hast die heutigen Wörter durchgesehen. Du kannst die Lektion als abgeschlossen markieren.",
    completedToday: "Die heutige Lektion ist abgeschlossen. Diese Wörter stehen jetzt auf deinem Wiederholungsplan.",
    extraWordsAdded: "{amount} weitere Wörter freigeschaltet. Lerne in deinem Tempo für besseres Behalten.",
    sharePosted: "Dein Vokabel-Beitrag wurde in der Community geteilt.",
    shareCreated: "Freigabeinhalt erstellt.",
    goalReachedTomorrow: "Du hast dein heutiges Ziel erreicht. Die KI wählt morgen neue Wörter aus.",
  },
  topBar: {
    searchPlaceholder: "Lektionen, Wortschatz, Grammatik suchen...",
    streak: "Streak",
    xpToday: "XP heute",
    coins: "Münzen",
  },
  studyCard: {
    completedBadge: "Heute abgeschlossen",
    exampleLabel: "Beispiel",
    addNotebook: "Zum Notizbuch hinzufügen",
    savedNotebook: "Im Notizbuch gespeichert",
    flashcard: "Karteikarte",
    known: "Bekannt",
    review: "Muss wiederholt werden",
    share: "Teilen",
    wordCounter: "Wort {current}/{total}",
    defaultPartOfSpeech: "Nomen",
  },
  pager: {
    prevWord: "Vorheriges Wort",
    nextWord: "Nächstes Wort",
    none: "Keins",
    completeLesson: "Lektion abschließen",
    completed: "Abgeschlossen",
  },
  tabs: {
    detail: "Details",
    example: "Beispiel",
    synonym: "Synonyme",
    antonym: "Antonyme",
    relatedPhrase: "Verwandte Phrasen",
  },
  detailTab: {
    wordType: "Wortart",
    level: "Niveau",
    mediumBadge: "Mittelstufe",
    topic: "Thema",
    defaultTopic: "Heutiges Thema",
    wordFamily: "Word family",
    collocations: "Collocations",
    antonyms: "Antonyme",
    memoTitle: "Merktipp",
    memoText: "Verbinde “{word}” mit einem echten Kontext aus dem Beispiel. Nutze Karteikarten für schnelle Wiederholung mit automatischer Planung.",
    flashcardTip: "Merke dir neue Wörter besser mit Karteikarten!",
    learnWithFlashcard: "Mit Karteikarten lernen",
  },
  exampleTab: {
    phonetic: "Lautschrift",
    meaning: "Bedeutung",
    examplesTitle: "Beispiele",
    saveWord: "Wort speichern",
  },
  synonymTab: {
    title: "Synonyme",
    subtitle: "Wörter mit ähnlicher Bedeutung wie “{word}”.",
    viewAll: "Alle anzeigen",
    quickMemoTitle: "Schneller Tipp",
    quickMemoDesc: "Synonyme zu lernen hilft dir, natürlicher zu klingen und Vokabeln länger zu behalten.",
    practiceNow: "Jetzt üben",
  },
  antonymTab: {
    title: "Antonyme",
    subtitle: "Wörter mit gegenteiliger Bedeutung zu “{word}”.",
  },
  relatedPhraseTab: {
    title: "Gebräuchliche Phrasen mit “{word}”",
  },
  statsPanel: {
    title: "Dein Fortschritt",
    mastered: "Gemeistert",
    learned: "Gelernt",
    toMastered: "Gemeistert",
    toReview: "Zu wiederholen",
    notebook: "Notizbuch",
    unit: "Wörter",
  },
  notebookPanel: {
    title: "Mein Notizbuch",
    viewAll: "Alle anzeigen",
    empty: "Noch keine Wörter im Notizbuch.",
    addedOn: "Hinzugefügt am {date}",
    defaultLabel: "Heutiges Wort",
  },
  reviewSuggestion: {
    title: "Empfohlene Wiederholung",
    viewAll: "Alle anzeigen",
    defaultMeta: "B1 · Nomen",
  },
  challengeCard: {
    title: "Heutige Herausforderung",
    defaultPrompt: "Verwende das Wort “{word}” in einem Satz",
    start: "Herausforderung starten",
  },
  detailModal: {
    defaultType: "Wortschatz",
    meaning: "Bedeutung",
    synonyms: "Synonyme",
    antonyms: "Antonyme",
    sameTopic: "Gleiches Thema",
  },
  infoListEmpty: "Noch keine Daten",
  flashcardModal: {
    counter: "Karteikarte {index}/{total}",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
  },
  shareModal: {
    title: "Wort teilen",
    subtitle: "Erstelle einen Community-Beitrag für das Wort",
    postButton: "In der Community teilen",
    placeholder: "Heute habe ich das Wort \"{word}\" gelernt. {meaning}",
  },
  challengeModal: {
    defaultTitle: "Heutige Herausforderung",
    resultFallback: "Ergebnis: {correct}/{total} richtig · {score}%",
    hint: "Tipp",
    questionLabel: "Frage {n}",
    submit: "Absenden",
    sentencePlaceholder: "Beispiel: We should protect the environment every day.",
  },
  completedModal: {
    title: "🎉 Du hast dein \n heutiges Ziel erreicht!",
    subtitle: "Du hast gerade dein Tagesziel erreicht. Wähle jetzt den nächsten Schritt: wiederholen, um länger zu behalten, etwas mehr lernen oder für heute abschließen.",
    statsTitle: "Deine heutigen Ergebnisse",
    newWords: "Neue Wörter",
    accuracy: "Genauigkeit",
    time: "Zeit",
    minutes: "{n} Min.",
    tipTitle: "Tipp für nachhaltiges Lernen",
    tipDesc: "Zu viele neue Wörter an einem Tag können das Behalten verschlechtern. Lumiverse empfiehlt 10-20 Wörter/Tag und Vorrang für SRS-Wiederholung.",
    tomorrowTitle: "Morgen smarter lernen",
    tomorrowDesc: "Die KI wiederholt zuerst fällige Wörter, bevor neue eingeführt werden.",
    srsLine: "SRS: 1 Tag → 3 Tage → 7 Tage → 14 Tage",
    reviewNow: "Jetzt wiederholen",
    learnMore: "{amount} weitere lernen",
    finishToday: "Für heute abschließen",
    goSpeaking: "Sprechen üben",
    goReading: "Lesen üben",
    footerNote: "Während du auf neue Wörter wartest, kannst du Lesen, Hören, Sprechen oder Grammatik üben.",
    reviewCounter: "SRS-Wiederholung {index}/{total}",
    reviewModes: ["Karteikarte", "Bedeutung wählen", "Wort eingeben", "Hören und wählen", "Lücke füllen"],
    chooseCorrectMeaning: "Wähle die richtige Bedeutung von:",
    typeWordMeaning: "Gib das Wort ein, das Folgendes bedeutet:",
    typeWordPlaceholder: "Englisches Wort eingeben...",
    listenAndChoose: "Aussprache abspielen",
    listenNoAudioFallback: "Kein Audio verfügbar — wähle das Wort nach Bedeutung:",
    fillMissingWord: "Fehlendes Wort ausfüllen:",
    fillMissingPlaceholder: "Fehlendes Wort eingeben...",
    check: "Prüfen",
    forgot: "Vergessen",
    hard: "Schwer zu merken",
    remembered: "Gemerkt",
    reviewDoneTitle: "Wiederholung abgeschlossen!",
    reviewDoneDesc: "Du hast {remembered}/{total} Wörter richtig erinnert. Dein SRS-Plan wurde aktualisiert.",
  },
};

const vocab: Record<Locale, VocabContent> = { vi, en, zh, de };

export default vocab;
