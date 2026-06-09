import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { publicCourseApi } from "../../api/publicCourseApi";
import PageRenderer from "../../components/page-builder/PageRenderer";

export default function CoursePublicDetail() {
  const { slug } = useParams();
  const [course, setCourse] = useState<any>(null);
  const landing = course.landing;
  useEffect(() => {
    if (!slug) return;

    publicCourseApi.getCourseDetail(slug).then((res) => {
      setCourse(res.data);
    });
  }, [slug]);

  const handleBuyCourse = async () => {
    if (!course) return;

    if (course.price === 0) {
      await axiosClient.post(`/enrollments/free/${course.id}`);
      alert("Đăng ký khóa học thành công");
      return;
    }

    alert("Khóa học có phí, bước sau sẽ tích hợp thanh toán");
  };

  if (!course) return <div>Đang tải...</div>;

  return (
    <div>
      <h2>{course.title}</h2>

      {course.thumbnail && <img src={course.thumbnail} width={400} />}

      <p>{course.description}</p>
      <p>Level: {course.level}</p>
      <p>Giá: {course.price}</p>
      <p>Giáo viên: {course.teacher?.fullName}</p>

      <button>Mua khóa học</button>

      <h3>Nội dung khóa học</h3>

      {course.sections.map((section: any) => (
        <div key={section.id}>
          <h4>{section.title}</h4>

          {section.lessons.map((lesson: any) => (
            <p key={lesson.id}>
              {lesson.title} {lesson.isPreview ? "(Học thử)" : ""}
            </p>
          ))}
        </div>
      ))}

      <h1>{landing?.headline || course.title}</h1>

      <p>{landing?.subTitle || course.description}</p>

      {landing?.introVideo && (
        <video src={landing.introVideo} width={500} controls />
      )}

      <h3>Bạn sẽ học được gì?</h3>

      <ul>
        {landing?.benefits?.map((item: string, index: number) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <h3>FAQ</h3>

      {landing?.faq?.map((item: any, index: number) => (
        <div key={index}>
          <b>{item.question}</b>
          <p>{item.answer}</p>
        </div>
      ))}

      {course.page?.blocks?.length > 0 ? (
        <PageRenderer blocks={course.page.blocks} />
      ) : (
        <>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </>
      )}
      <PageRenderer
        blocks={course.page.blocks}
        course={course}
        onBuyClick={handleBuyCourse}
      />
    </div>
  );
}
