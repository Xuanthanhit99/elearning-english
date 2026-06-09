import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { learningApi } from "../api/learningApi";

export default function LessonLearning() {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState<any>(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (!lessonId) return;

    learningApi
      .getLessonDetail(lessonId)
      .then((res) => {
        setLesson(res.data);
      })
      .catch((err) => {
        console.error(err.response?.data || err);
        alert(err.response?.data?.message || "Không tải được bài học");
      });
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

  console.log("lesson hiện tại:", lesson);
  console.log("flatLessons:", flatLessons);
  console.log("currentIndex:", currentIndex);
  console.log("nextLesson:", nextLesson);

  await learningApi.completeLesson(lessonId);

  alert("Đã hoàn thành bài học");

  if (nextLesson) {
    navigate(`/learning/lessons/${nextLesson.id}`);
  } else {
    alert("Đây là bài cuối cùng hoặc API chưa trả đủ danh sách bài học");
  }
};
  if (!lesson) return <div>Đang tải bài học...</div>;

  return (
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
                  background: item.id === lesson.id ? "#f0f0f0" : "transparent",
                }}
              >
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
          <button onClick={handleComplete}>Hoàn thành bài học</button>
        </div>
      </main>
    </div>
  );
}
