import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { courseApi } from "./api/courseApi";

const TeacherCourses = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<any[]>([]);

  const fetchCourse = async () => {
    const res = await courseApi.getMyCourse();
    setCourses(res.data);
  };

  useEffect(() => {
    fetchCourse();
  }, []);
  return (
    <div>
      <h2>Khóa học của tôi</h2>

      <button onClick={() => navigate("/teacher/courses/create")}>
        + Tạo khóa học
      </button>

      {courses.map((course) => (
        <div key={course.id}>
          <h3>{course.title}</h3>
          <p>Trạng thái: {course.status}</p>
          <p>Giá: {course.price}</p>

          <button onClick={() => navigate(`/teacher/courses/${course.id}`)}>
            Chi tiết
          </button>
        </div>
      ))}
    </div>
  );
};

export default TeacherCourses;
