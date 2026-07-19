import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { coursePageApi } from "../../api/coursePageApi";
import PageRenderer from "../PageRenderer";
import { uploadApi } from "../../api/uploadApi";

type BlockType =
  | "hero"
  | "text"
  | "benefits"
  | "faq"
  | "image"
  | "video"
  | "teacher"
  | "curriculum"
  | "buyButton";

type Block = {
  id: string;
  type: BlockType;
  props: any;
};

function SortableBlock({
  block,
  index,
  children,
}: {
  block: Block;
  index: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: block.id,
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: "1px solid #ddd",
    padding: 16,
    marginBottom: 16,
    background: "#fff",
    borderRadius: 8,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          marginBottom: 12,
          fontWeight: "bold",
          background: "#f5f5f5",
          padding: 8,
          borderRadius: 6,
        }}
      >
        ⠿ Kéo block #{index + 1} - {block.type}
      </div>

      {children}
    </div>
  );
}

export default function CoursePageBuilder() {
  const { id } = useParams();
  const [blocks, setBlocks] = useState<Block[]>([]);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    if (!id) return;

    coursePageApi.getPage(id).then((res) => {
      setBlocks(res.data.blocks || []);
    });
  }, [id]);

  const addHeroBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `hero_${Date.now()}`,
        type: "hero",
        props: {
          title: "Khóa học tiếng Anh giao tiếp",
          subtitle: "Học từ mất gốc đến tự tin giao tiếp",
          buttonText: "Đăng ký ngay",
        },
      },
    ]);
  };

  const addTextBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `text_${Date.now()}`,
        type: "text",
        props: {
          content: "Nhập nội dung giới thiệu khóa học tại đây",
        },
      },
    ]);
  };

  const addBenefitsBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `benefits_${Date.now()}`,
        type: "benefits",
        props: {
          items: ["Lợi ích 1", "Lợi ích 2", "Lợi ích 3"],
        },
      },
    ]);
  };

  const addFaqBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `faq_${Date.now()}`,
        type: "faq",
        props: {
          items: [
            {
              question: "Người mất gốc học được không?",
              answer: "Có, khóa học bắt đầu từ số 0.",
            },
          ],
        },
      },
    ]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter((block) => block.id !== blockId));
  };

  const updateBlockProps = (blockId: string, props: any) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              props,
            }
          : block,
      ),
    );
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);

    setBlocks(arrayMove(blocks, oldIndex, newIndex));
  };

  const handleSave = async () => {
    if (!id) return;

    await coursePageApi.updatePage(id, blocks);

    alert("Lưu page builder thành công");
  };

  const addImageBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `image_${Date.now()}`,
        type: "image",
        props: {
          imageUrl: "",
          alt: "Ảnh khóa học",
        },
      },
    ]);
  };

  const addVideoBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `video_${Date.now()}`,
        type: "video",
        props: {
          videoUrl: "",
        },
      },
    ]);
  };

  const handleUploadImageBlock = async (blockId: string, file: File) => {
    const res = await uploadApi.uploadImage(file);

    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    updateBlockProps(blockId, {
      ...block.props,
      imageUrl: res.data.url,
    });
  };

  const handleUploadVideoBlock = async (blockId: string, file: File) => {
    const res = await uploadApi.uploadVideo(file);

    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    updateBlockProps(blockId, {
      ...block.props,
      videoUrl: res.data.url,
    });
  };

  const addTeacherBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `teacher_${Date.now()}`,
        type: "teacher",
        props: {
          title: "Giảng viên của khóa học",
        },
      },
    ]);
  };

  const addCurriculumBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `curriculum_${Date.now()}`,
        type: "curriculum",
        props: {
          title: "Nội dung khóa học",
        },
      },
    ]);
  };

  const addBuyButtonBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `buyButton_${Date.now()}`,
        type: "buyButton",
        props: {
          text: "Đăng ký học ngay",
        },
      },
    ]);
  };

  const handleBuyCourse = async () => {

    alert("Khóa học có phí, bước sau sẽ tích hợp thanh toán");
  };

  return (
    <div>
      <h2>Course Page Builder</h2>

      <div style={{ marginBottom: 20 }}>
        <button onClick={addHeroBlock}>+ Hero</button>

        <button onClick={addTextBlock}>+ Text</button>

        <button onClick={addBenefitsBlock}>+ Benefits</button>

        <button onClick={addFaqBlock}>+ FAQ</button>

        <button onClick={addImageBlock}>+ Image</button>

        <button onClick={addVideoBlock}>+ Video</button>
        <button onClick={addTeacherBlock}>+ Teacher</button>
        <button onClick={addCurriculumBlock}>+ Curriculum</button>
        <button onClick={addBuyButtonBlock}>+ Buy Button</button>
        <button onClick={handleBuyCourse}>
          Đăng ký học miễn phí
        </button>
        <button onClick={handleSave} style={{ marginLeft: 12 }}>
          Lưu layout
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Cột trái */}
        <div>
          <h3>Chỉnh sửa blocks</h3>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((block) => block.id)}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block, index) => (
                <SortableBlock key={block.id} block={block} index={index}>
                  <button onClick={() => removeBlock(block.id)}>
                    Xóa block
                  </button>

                  {block.type === "hero" && (
                    <div>
                      <input
                        placeholder="Tiêu đề"
                        value={block.props.title}
                        onChange={(e) =>
                          updateBlockProps(block.id, {
                            ...block.props,
                            title: e.target.value,
                          })
                        }
                      />

                      <input
                        placeholder="Mô tả ngắn"
                        value={block.props.subtitle}
                        onChange={(e) =>
                          updateBlockProps(block.id, {
                            ...block.props,
                            subtitle: e.target.value,
                          })
                        }
                      />

                      <input
                        placeholder="Text button"
                        value={block.props.buttonText}
                        onChange={(e) =>
                          updateBlockProps(block.id, {
                            ...block.props,
                            buttonText: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  {block.type === "text" && (
                    <textarea
                      placeholder="Nội dung"
                      value={block.props.content}
                      onChange={(e) =>
                        updateBlockProps(block.id, {
                          ...block.props,
                          content: e.target.value,
                        })
                      }
                    />
                  )}

                  {block.type === "benefits" && (
                    <textarea
                      placeholder="Mỗi dòng là một lợi ích"
                      value={block.props.items.join("\n")}
                      onChange={(e) =>
                        updateBlockProps(block.id, {
                          ...block.props,
                          items: e.target.value.split("\n"),
                        })
                      }
                    />
                  )}

                  {block.type === "faq" && (
                    <textarea
                      placeholder="Mỗi dòng dạng: câu hỏi|câu trả lời"
                      value={block.props.items
                        .map((item: any) => `${item.question}|${item.answer}`)
                        .join("\n")}
                      onChange={(e) =>
                        updateBlockProps(block.id, {
                          ...block.props,
                          items: e.target.value
                            .split("\n")
                            .filter(Boolean)
                            .map((line) => {
                              const [question, answer] = line.split("|");

                              return {
                                question: question || "",
                                answer: answer || "",
                              };
                            }),
                        })
                      }
                    />
                  )}

                  {block.type === "image" && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadImageBlock(block.id, file);
                        }}
                      />

                      <input
                        placeholder="Alt text"
                        value={block.props.alt}
                        onChange={(e) =>
                          updateBlockProps(block.id, {
                            ...block.props,
                            alt: e.target.value,
                          })
                        }
                      />

                      {block.props.imageUrl && (
                        <img
                          src={block.props.imageUrl}
                          alt={block.props.alt}
                          width={200}
                        />
                      )}
                    </div>
                  )}

                  {block.type === "video" && (
                    <div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];

                          if (file) {
                            handleUploadVideoBlock(block.id, file);
                          }
                        }}
                      />

                      {block.props.videoUrl && (
                        <video
                          src={block.props.videoUrl}
                          width={300}
                          controls
                        />
                      )}
                    </div>
                  )}
                  {block.type === "teacher" && (
                    <input
                      placeholder="Tiêu đề block teacher"
                      value={block.props.title}
                      onChange={(e) =>
                        updateBlockProps(block.id, {
                          ...block.props,
                          title: e.target.value,
                        })
                      }
                    />
                  )}

                  {block.type === "curriculum" && (
                    <input
                      placeholder="Tiêu đề nội dung khóa học"
                      value={block.props.title}
                      onChange={(e) =>
                        updateBlockProps(block.id, {
                          ...block.props,
                          title: e.target.value,
                        })
                      }
                    />
                  )}

                  {block.type === "buyButton" && (
                    <input
                      placeholder="Text nút mua"
                      value={block.props.text}
                      onChange={(e) =>
                        updateBlockProps(block.id, {
                          ...block.props,
                          text: e.target.value,
                        })
                      }
                    />
                  )}
                </SortableBlock>
              ))}
            </SortableContext>
          </DndContext>
          <div
            style={{
              border: "1px solid #ddd",
              padding: 20,
              borderRadius: 8,
              background: "#fff",
              position: "sticky",
              top: 20,
            }}
          >
            <h3>Preview</h3>

            <PageRenderer blocks={blocks} />
          </div>
        </div>
      </div>
    </div>
  );
}
