import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { courseApi } from "./api/courseApi";
import { uploadApi } from "./api/uploadApi";
import { quizApi } from "./api/quizApi";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [error, setError] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");

  const [quizForm, setQuizForm] = useState({
    lessonId: "",
    question: "",
    optionsText: "",
    answer: "",
  });

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
        error.response?.data?.message || "Không lấy được chi tiết khóa học",
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

    const selectedSection = course.sections.find(
      (section: any) => section.id === lessonForm.sectionId,
    );

    const nextOrder = (selectedSection?.lessons?.length || 0) + 1;

    await courseApi.createLesson(lessonForm.sectionId, {
      title: lessonForm.title,
      content: lessonForm.content,
      order: nextOrder,
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

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quizForm.lessonId) {
      alert("Vui lòng chọn bài học");
      return;
    }

    if (!quizForm.question.trim()) {
      alert("Vui lòng nhập câu hỏi");
      return;
    }

    const options = quizForm.optionsText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    if (options.length < 2) {
      alert("Cần ít nhất 2 đáp án");
      return;
    }

    if (!quizForm.answer.trim()) {
      alert("Vui lòng nhập đáp án đúng");
      return;
    }

    await quizApi.createQuiz(quizForm.lessonId, {
      question: quizForm.question,
      options,
      answer: quizForm.answer,
    });

    alert("Tạo quiz thành công");

    setQuizForm({
      lessonId: "",
      question: "",
      optionsText: "",
      answer: "",
    });

    await fetchCourse();
  };

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

      <h3>Thêm Quiz cho bài học</h3>

      <form onSubmit={handleAddQuiz}>
        <select
          value={quizForm.lessonId}
          onChange={(e) =>
            setQuizForm({
              ...quizForm,
              lessonId: e.target.value,
            })
          }
        >
          <option value="">Chọn bài học</option>

          {course.sections?.map((section: any) =>
            section.lessons?.map((lesson: any) => (
              <option key={lesson.id} value={lesson.id}>
                {section.title} - {lesson.title}
              </option>
            )),
          )}
        </select>

        <input
          placeholder="Câu hỏi"
          value={quizForm.question}
          onChange={(e) =>
            setQuizForm({
              ...quizForm,
              question: e.target.value,
            })
          }
        />

        <textarea
          placeholder="Mỗi dòng là một đáp án"
          value={quizForm.optionsText}
          onChange={(e) =>
            setQuizForm({
              ...quizForm,
              optionsText: e.target.value,
            })
          }
        />

        <input
          placeholder="Đáp án đúng"
          value={quizForm.answer}
          onChange={(e) =>
            setQuizForm({
              ...quizForm,
              answer: e.target.value,
            })
          }
        />

        <button type="submit">Thêm Quiz</button>
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

              {lesson.quizzes?.length > 0 && (
                <div style={{ marginLeft: 20 }}>
                  <b>Quiz:</b>

                  {lesson.quizzes.map((quiz: any) => (
                    <div key={quiz.id}>- {quiz.question}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CourseDetail;
