import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicCourseApi } from '../../api/publicCourseApi';

export default function CourseList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    publicCourseApi.getCourses().then((res) => {
      setCourses(res.data);
    });
  }, []);

  return (
    <div>
      <h2>Danh sách khóa học</h2>

      {courses.map((course) => (
        <div key={course.id}>
          <img src={course.thumbnail} width={200} />

          <h3>{course.title}</h3>
          <p>{course.description}</p>
          <p>Giá: {course.price}</p>
          <p>Giáo viên: {course.teacher?.fullName}</p>

          <button onClick={() => navigate(`/courses/${course.slug}`)}>
            Xem chi tiết
          </button>
        </div>
      ))}
    </div>
  );
}