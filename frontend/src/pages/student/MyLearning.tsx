import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { enrollmentApi } from "../../api/enrollmentApi";
import { progressApi } from "../../api/progressApi";

export default function MyLearning() {
  const navigate = useNavigate();

  const [items, setItems] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      const res = await enrollmentApi.getMyCourses();
      setItems(res.data);

      const progressData: any = {};

      for (const item of res.data) {
        const progressRes = await progressApi.getCourseProgress(item.course.id);
        progressData[item.course.id] = progressRes.data;
      }

      setProgressMap(progressData);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>Khóa học của tôi</h2>

      {items.map((item) => {
        const course = item.course;
        const progress = progressMap[course.id];

        const firstLesson = course.sections?.[0]?.lessons?.[0];

        return (
          <div
            key={item.id}
            style={{
              border: "1px solid #ddd",
              padding: 16,
              marginBottom: 16,
            }}
          >
            {course.thumbnail && (
              <img src={course.thumbnail} width={200} />
            )}

            <h3>{course.title}</h3>

            <p>Tiến độ: {progress?.percent || 0}%</p>

            <button
              onClick={() => {
                if (!firstLesson) {
                  alert("Khóa học chưa có bài học");
                  return;
                }

                navigate(`/learning/lessons/${firstLesson.id}`);
              }}
            >
              Tiếp tục học
            </button>
          </div>
        );
      })}
    </div>
  );
}