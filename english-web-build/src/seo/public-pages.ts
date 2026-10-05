export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://beaconvie.com";

export type SeoPage = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  outcomes: string[];
  appPath: string;
};

export const seoPages: SeoPage[] = [
  { slug: "hoc-tieng-anh", title: "Học tiếng Anh online theo lộ trình cá nhân hóa", description: "Học tiếng Anh online cùng BeaconVie với lộ trình theo CEFR, luyện đủ 6 kỹ năng và theo dõi tiến bộ mỗi ngày.", eyebrow: "Lộ trình học tiếng Anh", heading: "Học tiếng Anh có lộ trình, không học lan man", intro: "Bắt đầu từ trình độ hiện tại, luyện đúng kỹ năng còn yếu và duy trì nhịp học mỗi ngày với BeaconVie.", outcomes: ["Xác định trình độ CEFR", "Lộ trình học theo mục tiêu", "Luyện tập và theo dõi tiến bộ"], appPath: "/learning-path" },
  { slug: "kiem-tra-trinh-do-tieng-anh", title: "Kiểm tra trình độ tiếng Anh theo CEFR", description: "Kiểm tra trình độ tiếng Anh và xác định mức CEFR từ A1 đến C1 để bắt đầu lộ trình phù hợp trên BeaconVie.", eyebrow: "CEFR A1–C1", heading: "Biết mình đang ở đâu trước khi bắt đầu học", intro: "Bài kiểm tra giúp bạn có điểm xuất phát rõ ràng thay vì chọn bài học theo cảm tính.", outcomes: ["Ước lượng mức CEFR", "Nhận điểm xuất phát", "Đi tiếp vào lộ trình phù hợp"], appPath: "/placement" },
  { slug: "hoc-tu-vung-tieng-anh", title: "Học từ vựng tiếng Anh theo trình độ", description: "Học từ vựng tiếng Anh theo chủ đề và trình độ, ôn tập có hệ thống và đưa từ mới vào luyện tập thực tế.", eyebrow: "Từ vựng", heading: "Học từ vựng để dùng được, không chỉ để nhớ", intro: "Tổ chức từ mới theo mục tiêu học và luyện lại trong ngữ cảnh để xây vốn từ bền vững.", outcomes: ["Từ vựng theo chủ đề", "Ôn tập có hệ thống", "Gắn từ mới với kỹ năng thực tế"], appPath: "/vocabulary" },
  { slug: "ngu-phap-tieng-anh", title: "Ngữ pháp tiếng Anh từ cơ bản đến nâng cao", description: "Học ngữ pháp tiếng Anh theo lộ trình rõ ràng, từ nền tảng đến ứng dụng trong đọc, viết, nghe và nói.", eyebrow: "Ngữ pháp", heading: "Hiểu ngữ pháp để sử dụng tiếng Anh tự nhiên hơn", intro: "Học từng điểm ngữ pháp theo mức độ, có luyện tập và kết nối với các kỹ năng khác.", outcomes: ["Nền tảng theo trình độ", "Luyện tập sau mỗi chủ điểm", "Ứng dụng vào giao tiếp và viết"], appPath: "/grammar" },
  { slug: "luyen-nghe-tieng-anh", title: "Luyện nghe tiếng Anh theo trình độ", description: "Luyện nghe tiếng Anh từ cơ bản đến nâng cao với nội dung phù hợp trình độ và lộ trình học trên BeaconVie.", eyebrow: "Listening", heading: "Luyện nghe vừa sức rồi tăng độ khó từng bước", intro: "Xây khả năng nhận diện âm, hiểu ý chính và nghe chi tiết bằng nội dung phù hợp với trình độ hiện tại.", outcomes: ["Nghe theo mức CEFR", "Tăng dần độ khó", "Theo dõi tiến bộ qua luyện tập"], appPath: "/listening" },
  { slug: "luyen-noi-tieng-anh", title: "Luyện nói tiếng Anh và phản xạ giao tiếp", description: "Luyện nói tiếng Anh, phát triển phản xạ và sự tự tin qua các hoạt động giao tiếp phù hợp trình độ.", eyebrow: "Speaking", heading: "Biến kiến thức thành phản xạ nói tiếng Anh", intro: "Tập nói thường xuyên theo tình huống để giảm khoảng cách giữa biết từ, biết ngữ pháp và thực sự giao tiếp.", outcomes: ["Luyện phản xạ theo tình huống", "Thực hành thường xuyên", "Kết nối từ vựng và ngữ pháp"], appPath: "/speaking" },
  { slug: "luyen-doc-tieng-anh", title: "Luyện đọc tiếng Anh theo trình độ", description: "Luyện đọc tiếng Anh với nội dung phù hợp CEFR, phát triển từ vựng, khả năng hiểu ý và đọc chi tiết.", eyebrow: "Reading", heading: "Đọc đúng trình độ để hiểu nhiều hơn mỗi ngày", intro: "Phát triển tốc độ đọc và khả năng hiểu bằng văn bản vừa sức, sau đó nâng dần độ khó.", outcomes: ["Bài đọc theo trình độ", "Mở rộng vốn từ trong ngữ cảnh", "Rèn hiểu ý chính và chi tiết"], appPath: "/reading" },
  { slug: "luyen-viet-tieng-anh", title: "Luyện viết tiếng Anh từ câu đến bài hoàn chỉnh", description: "Luyện viết tiếng Anh theo từng bước, củng cố ngữ pháp, từ vựng và khả năng diễn đạt rõ ràng.", eyebrow: "Writing", heading: "Luyện viết từng bước để diễn đạt rõ ràng hơn", intro: "Bắt đầu từ cấu trúc vừa sức, luyện cách dùng từ và tổ chức ý trước khi tiến tới bài viết dài hơn.", outcomes: ["Luyện cấu trúc câu", "Dùng từ trong ngữ cảnh", "Phát triển cách tổ chức và diễn đạt ý"], appPath: "/writing" },
];

export const seoPageBySlug = new Map(seoPages.map((page) => [page.slug, page]));
