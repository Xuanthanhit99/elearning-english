import { useEffect, useState } from "react";
import { enrollmentApi } from "../api/enrollmentApi";
import { useNavigate } from "react-router-dom";
import { progressApi } from "../api/progressApi";
import { reviewApi } from "../api/reviewApi";

export default function MyLearning() {
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();
  const [progressMap, setProgressMap] = useState<any>({});
  const [reviewForm, setReviewForm] = useState<any>({});

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

  const handleSubmitReview = async (courseId: string) => {
    const form = reviewForm[courseId];

    if (!form?.rating) {
      alert("Vui lòng chọn số sao");
      return;
    }

    await reviewApi.createOrUpdate(courseId, {
      rating: Number(form.rating),
      comment: form.comment || "",
    });

    alert("Đánh giá khóa học thành công");
  };

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
            {course.thumbnail && <img src={course.thumbnail} width={200} />}

            <h3>{course.title}</h3>
            <p>{course.teacher?.fullName}</p>
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
              Vào học
            </button>

            <div style={{ marginTop: 12 }}>
              <h4>Đánh giá khóa học</h4>

              <select
                value={reviewForm[course.id]?.rating || ""}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    [course.id]: {
                      ...reviewForm[course.id],
                      rating: e.target.value,
                    },
                  })
                }
              >
                <option value="">Chọn số sao</option>
                <option value="5">5 sao</option>
                <option value="4">4 sao</option>
                <option value="3">3 sao</option>
                <option value="2">2 sao</option>
                <option value="1">1 sao</option>
              </select>

              <textarea
                placeholder="Nhận xét của bạn"
                value={reviewForm[course.id]?.comment || ""}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    [course.id]: {
                      ...reviewForm[course.id],
                      comment: e.target.value,
                    },
                  })
                }
              />

              <button onClick={() => handleSubmitReview(course.id)}>
                Gửi đánh giá
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}