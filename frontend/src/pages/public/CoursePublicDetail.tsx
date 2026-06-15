import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { publicCourseApi } from "../../api/publicCourseApi";
import PageRenderer from "../../components/page-builder/PageRenderer";
import { orderApi } from "../../api/orderApi";
import { paymentApi } from "../../api/paymentApi";
import { reviewApi } from "../../api/reviewApi";

export default function CoursePublicDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [reviewData, setReviewData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      try {
        const courseRes = await publicCourseApi.getCourseDetail(slug);
        setCourse(courseRes.data);

        const reviewRes = await reviewApi.getCourseReviews(courseRes.data.id);
        setReviewData(reviewRes.data);
      } catch (err: any) {
        console.error(err.response?.data || err);
        alert(err.response?.data?.message || "Không tải được khóa học");
      }
    };

    fetchData();
  }, [slug]);

  const handleBuyCourse = async () => {
    if (!course) return;

    try {
      const orderRes = await orderApi.createOrder(course.id);

      if (orderRes.data.type === "FREE") {
        alert("Đăng ký khóa học miễn phí thành công");
        navigate("/my-learning");
        return;
      }

      const paymentRes = await paymentApi.createVnpayUrl(
        orderRes.data.order.id
      );

      window.location.href = paymentRes.data.paymentUrl;
    } catch (err: any) {
      alert(err.response?.data?.message || "Không thể mua khóa học");
    }
  };

  if (!course) return <div>Đang tải...</div>;

  const landing = course.landing;

  return (
    <div>
      {course.page?.blocks?.length > 0 ? (
        <PageRenderer
          blocks={course.page.blocks}
          course={course}
          onBuyClick={handleBuyCourse}
        />
      ) : (
        <>
          <h1>{landing?.headline || course.title}</h1>

          {course.thumbnail && <img src={course.thumbnail} width={400} />}

          <p>{landing?.subTitle || course.description}</p>

          <p>Level: {course.level}</p>
          <p>Giá: {course.price}</p>
          <p>Giáo viên: {course.teacher?.fullName}</p>

          <button onClick={handleBuyCourse}>Mua khóa học</button>

          {landing?.introVideo && (
            <video src={landing.introVideo} width={500} controls />
          )}

          {landing?.benefits?.length > 0 && (
            <>
              <h3>Bạn sẽ học được gì?</h3>

              <ul>
                {landing.benefits.map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </>
          )}

          <h3>Nội dung khóa học</h3>

          {course.sections?.map((section: any) => (
            <div key={section.id}>
              <h4>{section.title}</h4>

              {section.lessons?.map((lesson: any) => (
                <p key={lesson.id}>
                  {lesson.title} {lesson.isPreview ? "(Học thử)" : ""}
                </p>
              ))}
            </div>
          ))}

          {landing?.faq?.length > 0 && (
            <>
              <h3>FAQ</h3>

              {landing.faq.map((item: any, index: number) => (
                <div key={index}>
                  <b>{item.question}</b>
                  <p>{item.answer}</p>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {reviewData && (
        <div>
          <h3>Đánh giá khóa học</h3>

          <p>
            Trung bình: {reviewData.avgRating}/5 sao ({reviewData.total} đánh
            giá)
          </p>

          {reviewData.reviews.map((review: any) => (
            <div key={review.id}>
              <p>
                <b>{review.user.fullName}</b> - {review.rating} sao
              </p>
              <p>{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}