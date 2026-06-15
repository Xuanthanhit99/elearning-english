import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { learningApi } from "../api/learningApi";
import { progressApi } from "../api/progressApi";
import { quizApi } from "../api/quizApi";
import { certificateApi } from "../api/certificateApi";

export default function LessonLearning() {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [latestQuizResult, setLatestQuizResult] = useState<any>(null);
  const [certificate, setCertificate] = useState<any>(null);

  const fetchLesson = async () => {
    if (!lessonId) return;

    try {
      const res = await learningApi.getLessonDetail(lessonId);
      setLesson(res.data);

      const quizRes = await quizApi.getLessonQuizzes(lessonId);
      setQuizzes(quizRes.data);
      setAnswers({});
      setQuizResult(null);

      const progressRes = await progressApi.getCourseProgress(
        res.data.course.id,
      );

      setProgress(progressRes.data);

      const latestResultRes = await quizApi.getLatestQuizResult(lessonId);
      setLatestQuizResult(latestResultRes.data);
    } catch (err: any) {
      console.error(err.response?.data || err);
      alert(err.response?.data?.message || "Không tải được bài học");
    }
  };

  useEffect(() => {
    fetchLesson();
  }, [lessonId]);

  const getFlatLessons = () => {
    const lessons: any[] = [];

    lesson?.course?.sections?.forEach((section: any) => {
      section.lessons?.forEach((item: any) => {
        lessons.push(item);
      });
    });

    return lessons;
  };

  const flatLessons = lesson ? getFlatLessons() : [];
  const currentIndex = flatLessons.findIndex((item) => item.id === lesson?.id);

  const prevLesson = flatLessons[currentIndex - 1];
  const nextLesson = flatLessons[currentIndex + 1];

  const handleComplete = async () => {
    if (!lessonId) return;

    try {
      await learningApi.completeLesson(lessonId);

      await fetchLesson();

      alert("Đã hoàn thành bài học");

      if (nextLesson) {
        navigate(`/learning/lessons/${nextLesson.id}`);
      } else {
        alert("Bạn đã hoàn thành bài cuối cùng");
        await fetchLesson();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Không thể hoàn thành bài học");
    }
  };

  const handleSubmitQuiz = async () => {
    const payload = {
      answers: quizzes.map((quiz) => ({
        quizId: quiz.id,
        answer: answers[quiz.id],
      })),
    };

    const res = await quizApi.submitQuiz(payload);

    setQuizResult(res.data);

    if (lessonId) {
      const latestResultRes = await quizApi.getLatestQuizResult(lessonId);
      setLatestQuizResult(latestResultRes.data);
    }
  };

  const handleGenerateCertificate = async () => {
    try {
      const res = await certificateApi.generate(lesson.course.id);

      setCertificate(res.data);

      alert("Tạo chứng chỉ thành công");
    } catch (err: any) {
      alert(err.response?.data?.message || "Không thể tạo chứng chỉ");
    }
  };
  if (!lesson) return <div>Đang tải bài học...</div>;
  const hasQuiz = quizzes.length > 0;
  const quizPassed = !hasQuiz || latestQuizResult?.score >= 80;
  const courseCompleted = progress?.percent === 100;

  return (
    <div>
      {progress && (
        <div style={{ marginBottom: 20 }}>
          <p>
            Tiến độ: {progress.completedLessons}/{progress.totalLessons} (
            {progress.percent}%)
          </p>

          <div
            style={{
              width: "100%",
              height: 12,
              background: "#eee",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                width: `${progress.percent}%`,
                height: "100%",
                background: "green",
                borderRadius: 6,
              }}
            />
          </div>
        </div>
      )}
      {courseCompleted && (
        <div
          style={{
            padding: 12,
            background: "#e6ffed",
            border: "1px solid #9ae6b4",
            marginTop: 12,
          }}
        >
          🎉 Bạn đã hoàn thành khóa học này!
        </div>
      )}
      {courseCompleted && (
        <div
          style={{
            padding: 16,
            border: "1px solid green",
            marginTop: 12,
          }}
        >
          <h3>🎉 Chúc mừng bạn đã hoàn thành khóa học</h3>

          <button onClick={handleGenerateCertificate}>Nhận chứng chỉ</button>

          {certificate && (
            <div>
              <p>
                Mã chứng chỉ:
                {certificate.code}
              </p>
            </div>
          )}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 24,
        }}
      >
        <aside style={{ borderRight: "1px solid #ddd", paddingRight: 16 }}>
          <h3>{lesson.course.title}</h3>

          {lesson.course.sections?.map((section: any) => (
            <div key={section.id}>
              <h4>{section.title}</h4>

              {section.lessons?.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/learning/lessons/${item.id}`)}
                  style={{
                    cursor: "pointer",
                    padding: 8,
                    background:
                      item.id === lesson.id ? "#f0f0f0" : "transparent",
                  }}
                >
                  {item.completed ? "✅ " : "○ "}
                  {item.title}
                </div>
              ))}
            </div>
          ))}
        </aside>

        <main>
          <h2>{lesson.title}</h2>

          {lesson.videoUrl && (
            <video src={lesson.videoUrl} width={700} controls />
          )}

          <div>
            <p>{lesson.content}</p>
          </div>

          {quizzes.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3>Trạng thái Quiz</h3>

              {!latestQuizResult && <p>Chưa làm quiz</p>}

              {latestQuizResult && latestQuizResult.score < 80 && (
                <p>Chưa đạt: {latestQuizResult.score}/100</p>
              )}

              {latestQuizResult && latestQuizResult.score >= 80 && (
                <p>Đã đạt: {latestQuizResult.score}/100</p>
              )}

              <h3>Quiz bài học</h3>

              {quizzes.map((quiz) => (
                <div key={quiz.id}>
                  <h4>{quiz.question}</h4>

                  {quiz.options.map((option: string) => (
                    <label key={option} style={{ display: "block" }}>
                      <input
                        type="radio"
                        name={quiz.id}
                        value={option}
                        checked={answers[quiz.id] === option}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [quiz.id]: e.target.value,
                          })
                        }
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ))}

              <button onClick={handleSubmitQuiz}>Nộp bài Quiz</button>

              {quizResult && (
                <div>
                  <p>
                    Đúng: {quizResult.correct}/{quizResult.total}
                  </p>
                  <p>Điểm: {quizResult.score}</p>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            {prevLesson && (
              <button
                onClick={() => navigate(`/learning/lessons/${prevLesson.id}`)}
              >
                ← Bài trước
              </button>
            )}

            {nextLesson && (
              <button
                onClick={() => navigate(`/learning/lessons/${nextLesson.id}`)}
                style={{ marginLeft: 12 }}
              >
                Bài tiếp theo →
              </button>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <button onClick={handleComplete} disabled={!quizPassed}>
              Hoàn thành bài học
            </button>

            {hasQuiz && !quizPassed && (
              <p style={{ color: "red" }}>
                Bạn cần đạt ít nhất 80 điểm quiz để hoàn thành bài học.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
