type Block = {
  id: string;
  type: string;
  props: any;
};

function HeroBlock({ props }: any) {
  return (
    <section style={{ padding: 40, background: "#f5f5f5" }}>
      <h1>{props.title}</h1>
      <p>{props.subtitle}</p>
      <button>{props.buttonText}</button>
    </section>
  );
}

function TextBlock({ props }: any) {
  return (
    <section style={{ padding: 24 }}>
      <p>{props.content}</p>
    </section>
  );
}

function BenefitsBlock({ props }: any) {
  return (
    <section style={{ padding: 24 }}>
      <h2>Bạn sẽ học được gì?</h2>

      <ul>
        {props.items?.map((item: string, index: number) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ImageBlock({ props }: any) {
  return (
    <section style={{ padding: 24 }}>
      {props.imageUrl && (
        <img
          src={props.imageUrl}
          alt={props.alt || ""}
          style={{ maxWidth: "100%" }}
        />
      )}
    </section>
  );
}

function VideoBlock({ props }: any) {
  return (
    <section style={{ padding: 24 }}>
      {props.videoUrl && (
        <video src={props.videoUrl} controls style={{ maxWidth: "100%" }} />
      )}
    </section>
  );
}

function FaqBlock({ props }: any) {
  return (
    <section style={{ padding: 24 }}>
      <h2>Câu hỏi thường gặp</h2>

      {props.items?.map((item: any, index: number) => (
        <div key={index}>
          <h4>{item.question}</h4>
          <p>{item.answer}</p>
        </div>
      ))}
    </section>
  );
}

export default function PageRenderer({
  blocks,
  course,
  onBuyClick,
}: {
  blocks: Block[];
  course?: any;
  onBuyClick?: () => void;
}) {
  return (
    <>
      {blocks.map((block) => {
        if (block.type === "hero") {
          return <HeroBlock key={block.id} props={block.props} />;
        }

        if (block.type === "text") {
          return <TextBlock key={block.id} props={block.props} />;
        }

        if (block.type === "benefits") {
          return <BenefitsBlock key={block.id} props={block.props} />;
        }

        if (block.type === "faq") {
          return <FaqBlock key={block.id} props={block.props} />;
        }

        if (block.type === "image") {
          return <ImageBlock key={block.id} props={block.props} />;
        }

        if (block.type === "video") {
          return <VideoBlock key={block.id} props={block.props} />;
        }

        if (block.type === "teacher") {
          return (
            <section key={block.id} style={{ padding: 24 }}>
              <h2>{block.props.title}</h2>
              <p>{course?.teacher?.fullName}</p>
              {course?.teacher?.avatar && (
                <img src={course.teacher.avatar} width={120} />
              )}
            </section>
          );
        }

        if (block.type === "curriculum") {
          return (
            <section key={block.id} style={{ padding: 24 }}>
              <h2>{block.props.title}</h2>

              {course?.sections?.map((section: any) => (
                <div key={section.id}>
                  <h4>{section.title}</h4>

                  {section.lessons?.map((lesson: any) => (
                    <p key={lesson.id}>- {lesson.title}</p>
                  ))}
                </div>
              ))}
            </section>
          );
        }

        if (block.type === "buyButton") {
          return (
            <section key={block.id} style={{ padding: 24 }}>
              <button onClick={onBuyClick}>
                {block.props.text || "Đăng ký học ngay"}
              </button>
            </section>
          );
        }

        return null;
      })}
    </>
  );
}
