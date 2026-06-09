import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { courseLandingApi } from '../api/courseLandingApi';

export default function CourseLandingEdit() {
  const { id } = useParams();

  const [form, setForm] = useState({
    headline: '',
    subTitle: '',
    introVideo: '',
    benefitsText: '',
    faqText: '',
  });

  useEffect(() => {
    if (!id) return;

    courseLandingApi.getLanding(id).then((res) => {
      const landing = res.data;

      if (landing) {
        setForm({
          headline: landing.headline || '',
          subTitle: landing.subTitle || '',
          introVideo: landing.introVideo || '',
          benefitsText: landing.benefits?.join('\n') || '',
          faqText:
            landing.faq
              ?.map((x: any) => `${x.question}|${x.answer}`)
              .join('\n') || '',
        });
      }
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    await courseLandingApi.updateLanding(id, {
      headline: form.headline,
      subTitle: form.subTitle,
      introVideo: form.introVideo,
      benefits: form.benefitsText
        .split('\n')
        .filter(Boolean),
      faq: form.faqText
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [question, answer] = line.split('|');

          return {
            question,
            answer,
          };
        }),
    });

    alert('Lưu landing page thành công');
  };

  console.log("first")

  return (
    <form onSubmit={handleSubmit}>
      <h2>Sửa Landing Page</h2>

      <input
        placeholder="Tiêu đề chính"
        value={form.headline}
        onChange={(e) =>
          setForm({ ...form, headline: e.target.value })
        }
      />

      <textarea
        placeholder="Mô tả ngắn"
        value={form.subTitle}
        onChange={(e) =>
          setForm({ ...form, subTitle: e.target.value })
        }
      />

      <input
        placeholder="Intro video URL"
        value={form.introVideo}
        onChange={(e) =>
          setForm({ ...form, introVideo: e.target.value })
        }
      />

      <label>Lợi ích, mỗi dòng 1 ý</label>
      <textarea
        value={form.benefitsText}
        onChange={(e) =>
          setForm({ ...form, benefitsText: e.target.value })
        }
      />

      <label>FAQ, mỗi dòng dạng: câu hỏi|câu trả lời</label>
      <textarea
        value={form.faqText}
        onChange={(e) =>
          setForm({ ...form, faqText: e.target.value })
        }
      />

      <button type="submit">Lưu landing page</button>
    </form>
  );
}