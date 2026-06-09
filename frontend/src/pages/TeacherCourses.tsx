import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

export default function TeacherCourses() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    axiosClient.get('/courses/my-courses').then((res) => {
      setCourses(res.data);
    });
  }, []);

  return (
    <div>
      <h2>Khóa học của tôi</h2>

      {courses.map((course: any) => (
        <div key={course.id}>
          <h3>{course.title}</h3>
          <p>{course.status}</p>
        </div>
      ))}
    </div>
  );
}