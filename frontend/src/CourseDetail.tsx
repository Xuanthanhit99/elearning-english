import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { courseApi } from "./api/courseApi";
import { uploadApi } from "./api/uploadApi";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [error, setError] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");

  const [lessonForm, setLessonForm] = useState({
    sectionId: "",
    title: "",
    content: "",
  });

  const fetchCourse = async () => {
    if (!id) return;

    try {
      setError("");
      const res = await courseApi.getCourseDetail(id);
      setCourse(res.data);
    } catch (error: any) {
      console.error("Get course detail error:", error.response?.data);
      setError(
        error.response?.data?.message || "Không lấy được chi tiết khóa học"
      );
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    if (!sectionTitle.trim()) {
      alert("Vui lòng nhập tên chương");
      return;
    }

    await courseApi.createSection(id, {
      title: sectionTitle,
      order: (course?.sections?.length || 0) + 1,
    });

    setSectionTitle("");
    fetchCourse();
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lessonForm.sectionId) {
      alert("Vui lòng chọn chương");
      return;
    }

    if (!lessonForm.title.trim()) {
      alert("Vui lòng nhập tên bài học");
      return;
    }

    await courseApi.createLesson(lessonForm.sectionId, {
      title: lessonForm.title,
      content: lessonForm.content,
      order: 1,
      isPreview: false,
    });

    setLessonForm({
      sectionId: "",
      title: "",
      content: "",
    });

    fetchCourse();
  };

  const handleSubmitCourse = async () => {
    if (!id) return;

    await courseApi.submitCourse(id);
    fetchCourse();
  };

  const handleUploadThumbnail = async (file: File) => {
    if (!id) return;

    const uploadRes = await uploadApi.uploadImage(file);

    await courseApi.updateCourse(id, {
      thumbnail: uploadRes.data.url,
    });

    fetchCourse();
  };

  const handleUploadLessonVideo = async (lessonId: string, file: File) => {
    const uploadRes = await uploadApi.uploadVideo(file);

    await courseApi.updateLesson(lessonId, {
      videoUrl: uploadRes.data.url,
    });

    fetchCourse();
  };

  if (error) {
    return (
      <div>
        <h3>Lỗi</h3>
        <p>{error}</p>
        <p>Course ID: {id}</p>
      </div>
    );
  }

  if (!course) return <div>Đang tải...</div>;

  return (
    <div>
      <h2>{course.title}</h2>

      <p>Trạng thái: {course.status}</p>
      <p>{course.description}</p>

      <button onClick={() => navigate(`/teacher/courses/${course.id}/landing`)}>
        Sửa Landing Page
      </button>

      <button
        onClick={() => navigate(`/teacher/courses/${course.id}/page-builder`)}
      >
        Mở Page Builder
      </button>

      <button onClick={handleSubmitCourse}>Gửi duyệt khóa học</button>

      <hr />

      <h3>Ảnh đại diện khóa học</h3>

      {course.thumbnail && (
        <img src={course.thumbnail} alt={course.title} width={200} />
      )}

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadThumbnail(file);
        }}
      />

      <hr />

      <h3>Thêm chương</h3>

      <form onSubmit={handleAddSection}>
        <input
          placeholder="Tên chương"
          value={sectionTitle}
          onChange={(e) => setSectionTitle(e.target.value)}
        />

        <button type="submit">Thêm chương</button>
      </form>

      <hr />

      <h3>Thêm bài học</h3>

      <form onSubmit={handleAddLesson}>
        <select
          value={lessonForm.sectionId}
          onChange={(e) =>
            setLessonForm({
              ...lessonForm,
              sectionId: e.target.value,
            })
          }
        >
          <option value="">Chọn chương</option>

          {course.sections?.map((section: any) => (
            <option key={section.id} value={section.id}>
              {section.title}
            </option>
          ))}
        </select>

        <input
          placeholder="Tên bài học"
          value={lessonForm.title}
          onChange={(e) =>
            setLessonForm({
              ...lessonForm,
              title: e.target.value,
            })
          }
        />

        <textarea
          placeholder="Nội dung bài học"
          value={lessonForm.content}
          onChange={(e) =>
            setLessonForm({
              ...lessonForm,
              content: e.target.value,
            })
          }
        />

        <button type="submit">Thêm bài học</button>
      </form>

      <hr />

      <h3>Danh sách chương / bài học</h3>

      {course.sections?.map((section: any) => (
        <div key={section.id}>
          <h4>
            {section.order}. {section.title}
          </h4>

          {section.lessons?.map((lesson: any) => (
            <div key={lesson.id}>
              <p>- {lesson.title}</p>

              {lesson.videoUrl && (
                <video src={lesson.videoUrl} width={300} controls />
              )}

              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadLessonVideo(lesson.id, file);
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CourseDetail;