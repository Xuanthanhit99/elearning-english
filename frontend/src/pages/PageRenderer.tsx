type Props = {
  blocks: any[];
};

export default function PageRenderer({ blocks }: Props) {
  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "hero":
            return (
              <section key={block.id}>
                <h1>{block.props.title}</h1>
                <p>{block.props.subtitle}</p>

                <button>{block.props.buttonText}</button>
              </section>
            );

          case "text":
            return (
              <section key={block.id}>
                <p>{block.props.content}</p>
              </section>
            );

          case "benefits":
            return (
              <section key={block.id}>
                <ul>
                  {block.props.items.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </section>
            );
          case "image":
            return (
              <section key={block.id}>
                {block.props.imageUrl && (
                  <img
                    src={block.props.imageUrl}
                    alt={block.props.alt || ""}
                    style={{ maxWidth: "100%" }}
                  />
                )}
              </section>
            );

          case "video":
            return (
              <section key={block.id}>
                {block.props.videoUrl && (
                  <video
                    src={block.props.videoUrl}
                    controls
                    style={{ maxWidth: "100%" }}
                  />
                )}
              </section>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
