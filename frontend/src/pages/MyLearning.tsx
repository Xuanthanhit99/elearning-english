import { useEffect, useState } from "react";
import { enrollmentApi } from "../api/enrollmentApi";
import { useNavigate } from "react-router-dom";
import { progressApi } from "../api/progressApi";

export default function MyLearning() {
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();
  const [progressMap, setProgressMap] = useState<any>({});
  useEffect(() => {
    enrollmentApi.getMyCourses().then((res) => {
      setItems(res.data);
    });
  }, []);

  useEffect(() => {
    enrollmentApi.getMyCourses().then(async (res) => {
      setItems(res.data);

      const progressData: any = {};

      for (const item of res.data) {
        const progressRes = await progressApi.getCourseProgress(item.course.id);
        progressData[item.course.id] = progressRes.data;
      }

      setProgressMap(progressData);
    });
  }, []);

  return (
    <div>
      <h2>Khóa học của tôi</h2>

      {items.map((item) => (
        <div key={item.id}>
          <h3>{item.course.title}</h3>
          <p>{item.course.teacher?.fullName}</p>
          <p>Tiến độ: {progressMap[item.course.id]?.percent || 0}%</p>
          <button
            onClick={() => {
              const firstLesson = item.course.sections?.[0]?.lessons?.[0];

              if (!firstLesson) {
                alert("Khóa học chưa có bài học");
                return;
              }

              navigate(`/learning/lessons/${firstLesson.id}`);
            }}
          >
            Vào học
          </button>
        </div>
      ))}
    </div>
  );
}
