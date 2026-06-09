import { useEffect, useState } from 'react';
import { adminApi } from './api/adminApi';

export default function PendingCourses() {
  const [courses, setCourses] = useState<any[]>([]);

  const fetchCourses = async () => {
    const res = await adminApi.getPendingCourses();
    setCourses(res.data);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleApprove = async (courseId: string) => {
    await adminApi.approveCourse(courseId);
    fetchCourses();
  };

  const handleReject = async (courseId: string) => {
    await adminApi.rejectCourse(courseId);
    fetchCourses();
  };

  return (
    <div>
      <h2>Khóa học chờ duyệt</h2>

      {courses.map((course) => (
        <div
          key={course.id}
          style={{
            border: '1px solid #ddd',
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3>{course.title}</h3>

          <p>Giá: {course.price}</p>
          <p>Level: {course.level}</p>
          <p>Teacher: {course.teacher?.fullName}</p>
          <p>Email: {course.teacher?.email}</p>

          <p>Số chương: {course.sections?.length}</p>

          <button onClick={() => handleApprove(course.id)}>
            Duyệt
          </button>

          <button onClick={() => handleReject(course.id)}>
            Từ chối
          </button>
        </div>
      ))}
    </div>
  );
}