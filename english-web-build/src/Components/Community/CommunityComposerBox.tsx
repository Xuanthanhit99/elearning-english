"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { type ReactNode, useEffect, useState } from "react";
import { AppIcon, LegacyIcon } from "@/src/Components/UI/AppIcon";

type ComposerMode = "post" | "speaking" | "writing" | "word" | "question" | "image" | "poll";

type CommunityComposerBoxProps = {
  mode?: ComposerMode;
  setMode?: (mode: ComposerMode) => void;
  onClose: () => void;
};

const contentTypes: Array<{ mode: ComposerMode; icon: string; label: string }> = [
  { mode: "image", icon: "▧", label: "Ảnh / Video" },
  { mode: "post", icon: "Aa", label: "Tạo mới" },
  { mode: "writing", icon: "☑", label: "Check bài" },
  { mode: "poll", icon: "▥", label: "Thăm dò ý kiến" },
  { mode: "question", icon: "?", label: "Hỏi đáp" },
];

const modalCopy: Record<ComposerMode, { title: string; desc: string; icon: string }> = {
  image: {
    title: "Đăng ảnh / video",
    desc: "Chia sẻ hình ảnh, video học tập và thêm mô tả để đăng lên cộng đồng.",
    icon: "▧",
  },
  post: {
    title: "Tạo bài viết mới",
    desc: "Viết nội dung đầy đủ, thêm chủ đề và đăng bài chia sẻ kiến thức.",
    icon: "Aa",
  },
  writing: {
    title: "Nhờ cộng đồng check bài",
    desc: "Gửi bài viết hoặc file để mọi người góp ý, sửa lỗi và cải thiện nhanh hơn.",
    icon: "☑",
  },
  poll: {
    title: "Tạo thăm dò ý kiến",
    desc: "Đặt câu hỏi, thêm lựa chọn và đăng poll để lấy ý kiến cộng đồng.",
    icon: "▥",
  },
  question: {
    title: "Đặt câu hỏi",
    desc: "Hỏi cộng đồng về từ vựng, ngữ pháp, speaking hoặc bài học bạn chưa rõ.",
    icon: "?",
  },
  speaking: {
    title: "Chia sẻ speaking",
    desc: "Gửi câu nói hoặc ghi chú speaking để nhận góp ý từ cộng đồng.",
    icon: "🎙",
  },
  word: {
    title: "Chia sẻ từ mới",
    desc: "Đăng từ mới, nghĩa, phát âm và ví dụ để cùng nhau ghi nhớ.",
    icon: "Aa",
  },
};

export default function CommunityComposerBox({ mode, setMode, onClose }: CommunityComposerBoxProps) {
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [activeMode, setActiveMode] = useState<ComposerMode>(mode || "post");
  const [featureModal, setFeatureModal] = useState<ComposerMode | null>(null);

  useEffect(() => {
    if (mode && mode !== "post") {
      setFeatureModal(mode);
    }
  }, [mode]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Chia sẻ chi tiết nội dung của bạn...",
      }),
      TextAlign.configure({
        types: ["paragraph"],
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[280px] px-5 py-5 text-lg font-bold leading-8 text-[#121735] outline-none prose-editor",
      },
    },
    onUpdate: ({ editor }) => {
      setBodyText(editor.getText().slice(0, 5000));
    },
  });

  const openFeature = (nextMode: ComposerMode) => {
    setActiveMode(nextMode);
    setMode?.(nextMode);
    setFeatureModal(nextMode);
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập link", previousUrl || "https://");

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const submitMainPost = () => {
    onClose();
  };

  return (
    <section className="rounded-2xl border border-[#e8e9f5] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef0f7] pb-5">
        <div>
          <h1 className="text-2xl font-black">Tạo bài viết mới</h1>
          <p className="mt-2 font-bold text-[#69708b]">
            Chọn một tính năng bên dưới để mở form đăng bài đúng loại nội dung.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#d9ceff] px-6 py-3 text-sm font-black text-[#6d35ff]">
            Lưu nháp
          </button>
          <button type="button" onClick={submitMainPost} className="rounded-xl bg-[#6d35ff] px-6 py-3 text-sm font-black text-white shadow-[0_16px_30px_rgba(109,53,255,0.24)]">
            Đăng bài
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e8e9f5] p-3">
          <button type="button" className="flex items-center gap-3 rounded-xl border border-[#e8e9f5] px-4 py-3 text-sm font-black">
            🌐 Công khai⌄
          </button>
          <span className="text-sm font-bold text-[#69708b]">Bất kỳ ai cũng có thể xem</span>
        </div>

        <label className="block">
          <div className="relative">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 100))}
              placeholder="Tiêu đề của bạn là gì?"
              className="w-full rounded-xl border border-[#d9ceff] px-5 py-5 text-xl font-bold outline-none placeholder:text-[#a6a3c4] focus:border-[#6d35ff]"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#69708b]">{title.length}/100</span>
          </div>
        </label>

        <section className="overflow-hidden rounded-xl border border-[#e8e9f5]">
          <div className="flex flex-wrap items-center gap-1 border-b border-[#eef0f7] px-4 py-3 text-lg font-black">
            <EditorButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>B</EditorButton>
            <EditorButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></EditorButton>
            <EditorButton active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>U</u></EditorButton>
            <EditorButton active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><s>S</s></EditorButton>
            <EditorButton active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>☷</EditorButton>
            <EditorButton active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>☰</EditorButton>
            <EditorButton active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>≡</EditorButton>
            <EditorButton active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>☰</EditorButton>
            <EditorButton active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❞</EditorButton>
            <EditorButton active={editor?.isActive("codeBlock")} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>{"</>"}</EditorButton>
            <EditorButton active={editor?.isActive("link")} onClick={setLink}>🔗</EditorButton>
            <EditorButton onClick={() => editor?.chain().focus().setHorizontalRule().run()}>━</EditorButton>
            <EditorButton onClick={() => editor?.chain().focus().insertContent(" 😊 ").run()}>☺</EditorButton>
          </div>
          <div className="relative">
            <EditorContent editor={editor} />
            <span className="absolute bottom-5 right-5 text-sm font-bold text-[#69708b]">{bodyText.length}/5000</span>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-5">
          {contentTypes.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => openFeature(item.mode)}
              className={`flex items-center justify-center gap-3 rounded-xl border px-4 py-4 text-sm font-black ${
                activeMode === item.mode ? "border-[#6d35ff] bg-[#efe9ff] text-[#6d35ff]" : "border-[#e8e9f5] text-[#303956] hover:bg-[#f5f2ff]"
              }`}
            >
              <LegacyIcon icon={item.icon} label={item.label} tone={activeMode === item.mode ? "purple" : "slate"} className="h-8 w-8" size={16} />
              {item.label}
            </button>
          ))}
        </div>

        <section className="rounded-xl border border-[#e8e9f5] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-black">Thêm chủ đề</h2>
            <button type="button" className="rounded-xl border border-[#e8e9f5] px-4 py-3"><AppIcon name="search" tone="purple" size={16} bare /></button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {["# Vocabulary", "# Grammar", "# Listening", "# Speaking", "# IELTS", "# StudyTips"].map((tag) => (
              <button key={tag} type="button" className="rounded-xl border border-[#d9ceff] px-4 py-2 text-sm font-black text-[#6d35ff]">
                {tag}
              </button>
            ))}
          </div>
        </section>

        <label className="block">
          <span className="font-black">Chọn nhóm <span className="font-bold text-[#69708b]">(tùy chọn)</span></span>
          <button type="button" className="mt-3 flex w-full items-center justify-between rounded-xl border border-[#e8e9f5] px-5 py-4 text-left font-bold text-[#8b91aa]">
            <span className="inline-flex items-center gap-2"><AppIcon name="users" tone="purple" size={16} bare /> Chọn nhóm phù hợp với nội dung</span>
            <AppIcon name="chevronRight" tone="slate" size={16} bare />
          </button>
        </label>
      </div>

      <FeaturePostModal
        mode={featureModal}
        onClose={() => setFeatureModal(null)}
        onSubmit={() => {
          setFeatureModal(null);
          onClose();
        }}
      />

      <style jsx global>{`
        .prose-editor p.is-editor-empty:first-child::before {
          color: #a6a3c4;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .prose-editor ul {
          list-style: disc;
          padding-left: 1.5rem;
        }
        .prose-editor ol {
          list-style: decimal;
          padding-left: 1.5rem;
        }
        .prose-editor blockquote {
          border-left: 4px solid #d9ceff;
          color: #59627f;
          margin: 0.75rem 0;
          padding-left: 1rem;
        }
        .prose-editor pre {
          background: #171b3f;
          border-radius: 12px;
          color: white;
          padding: 1rem;
        }
        .prose-editor a {
          color: #6d35ff;
          text-decoration: underline;
        }
      `}</style>
    </section>
  );
}

function FeaturePostModal({
  mode,
  onClose,
  onSubmit,
}: {
  mode: ComposerMode | null;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [pollOptions, setPollOptions] = useState(["Vocabulary", "Grammar", "Listening"]);

  if (!mode) return null;

  const copy = modalCopy[mode];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#111827]/55 px-4 py-6 backdrop-blur-md">
      <section className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1ecff] text-3xl font-black text-[#6d35ff] hover:bg-[#e3d8ff]"
          aria-label="Đóng"
        >
          <AppIcon name="x" tone="purple" size={22} bare />
        </button>

        <div className="flex gap-4 pr-16">
          <LegacyIcon icon={copy.icon} label={copy.title} tone="purple" className="h-16 w-16" size={30} />
          <div>
            <h2 className="text-3xl font-black text-[#121735]">{copy.title}</h2>
            <p className="mt-2 text-base font-bold leading-7 text-[#69708b]">{copy.desc}</p>
          </div>
        </div>

        <div className="mt-7">
          {mode === "image" && <ImagePostForm />}
          {mode === "post" && <RichPostForm />}
          {mode === "writing" && <WritingCheckForm />}
          {mode === "poll" && <PollPostForm options={pollOptions} setOptions={setPollOptions} />}
          {mode === "question" && <QuestionPostForm />}
          {mode === "speaking" && <SpeakingPostForm />}
          {mode === "word" && <WordPostForm />}
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#eef0f7] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[#69708b]">Foxy sẽ đăng nội dung này lên bảng tin cộng đồng.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#d9ceff] px-6 py-3 text-sm font-black text-[#6d35ff]">
              Hủy
            </button>
            <button type="button" onClick={onSubmit} className="rounded-xl bg-[#6d35ff] px-7 py-3 text-sm font-black text-white shadow-[0_16px_30px_rgba(109,53,255,0.24)]">
              Đăng bài
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ImagePostForm() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <FormInput label="Tiêu đề" placeholder="Khoảnh khắc học tiếng Anh hôm nay" />
        <FormTextarea label="Mô tả" rows={5} placeholder="Viết mô tả cho ảnh/video, ví dụ bài học bạn rút ra..." />
        <div className="grid gap-3 sm:grid-cols-3">
          <UploadTile label="Ảnh ghi chú" />
          <UploadTile label="Video ngắn" play />
          <UploadTile label="Thêm file" add />
        </div>
      </div>
      <SideHint title="Gợi ý đăng ảnh" items={["Tối đa 10 ảnh hoặc 1 video", "Video nên dưới 5 phút", "Thêm caption để mọi người dễ góp ý"]} />
    </div>
  );
}

function RichPostForm() {
  return (
    <div className="space-y-4">
      <FormInput label="Tiêu đề bài viết" placeholder="5 cách ghi nhớ từ vựng hiệu quả" />
      <FormTextarea label="Nội dung" rows={9} placeholder="Viết nội dung chi tiết, chia sẻ kinh nghiệm, bài học hoặc tài liệu..." />
      <FormInput label="Chủ đề" placeholder="#Vocabulary #StudyTips" />
    </div>
  );
}

function WritingCheckForm() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <FormInput label="Tiêu đề cần góp ý" placeholder="Please check my writing about My favorite place" />
        <FormTextarea label="Bài viết cần check" rows={7} placeholder="Dán bài writing của bạn vào đây..." />
        <label className="block rounded-2xl border border-dashed border-[#b99cff] bg-[#fbf9ff] p-5 text-center font-black text-[#6d35ff]">
          📄 Tải file .docx / .pdf
          <input type="file" className="hidden" accept=".doc,.docx,.pdf,.txt" />
        </label>
      </div>
      <SideHint title="Người góp ý sẽ thấy" items={["Nội dung bài viết", "Yêu cầu sửa lỗi cụ thể", "File đính kèm nếu có"]} />
    </div>
  );
}

function PollPostForm({ options, setOptions }: { options: string[]; setOptions: (options: string[]) => void }) {
  const updateOption = (index: number, value: string) => {
    setOptions(options.map((option, optionIndex) => (optionIndex === index ? value : option)));
  };

  return (
    <div className="space-y-4">
      <FormInput label="Câu hỏi thăm dò" placeholder="Bạn muốn học chủ đề nào trong tuần này?" />
      <div className="space-y-3 rounded-2xl border border-[#e8e9f5] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black">Các lựa chọn</h3>
          <button type="button" onClick={() => setOptions([...options, ""])} className="rounded-xl bg-[#efe9ff] px-4 py-2 text-sm font-black text-[#6d35ff]">
            + Thêm lựa chọn
          </button>
        </div>
        {options.map((option, index) => (
          <input
            key={index}
            value={option}
            onChange={(event) => updateOption(index, event.target.value)}
            placeholder={`Lựa chọn ${index + 1}`}
            className="w-full rounded-xl border border-[#e8e9f5] px-4 py-3 font-bold outline-none focus:border-[#6d35ff]"
          />
        ))}
      </div>
      <div className="rounded-2xl bg-[#fff8e8] p-4 text-sm font-bold text-[#8a5a00]">
        Poll sẽ hiển thị kết quả theo thời gian thực sau khi người dùng bình chọn.
      </div>
    </div>
  );
}

function QuestionPostForm() {
  return (
    <div className="space-y-4">
      <FormInput label="Câu hỏi" placeholder="Khi nào dùng for và since?" />
      <FormTextarea label="Mô tả chi tiết" rows={7} placeholder="Bạn đang vướng phần nào? Thêm ví dụ để cộng đồng trả lời chính xác hơn..." />
      <div className="grid gap-3 sm:grid-cols-3">
        <FormSelect label="Kỹ năng" options={["Grammar", "Vocabulary", "Listening", "Speaking"]} />
        <FormSelect label="Trình độ" options={["A1", "A2", "B1", "B2", "C1"]} />
        <FormSelect label="Trạng thái" options={["Cần trả lời", "Cần ví dụ", "Cần sửa lỗi"]} />
      </div>
    </div>
  );
}

function SpeakingPostForm() {
  return (
    <div className="space-y-4">
      <FormInput label="Câu luyện nói" placeholder="I want to improve my English speaking." />
      <FormTextarea label="Ghi chú" rows={5} placeholder="Bạn muốn mọi người góp ý phát âm, ngữ điệu hay độ tự nhiên?" />
      <div className="rounded-2xl border border-[#e8e9f5] bg-[#fbf9ff] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="rounded-xl bg-[#6d35ff] px-5 py-3 text-sm font-black text-white">🎙 Ghi âm</button>
          <button type="button" className="rounded-xl border border-[#d9ceff] px-5 py-3 text-sm font-black text-[#6d35ff]">🔊 Nghe mẫu</button>
        </div>
        <div className="mt-5 flex h-14 items-end gap-1 text-3xl text-[#6d35ff]">
          <span>▂</span><span>▃</span><span>▅</span><span>▇</span><span>▅</span><span>▃</span><span>▂</span>
        </div>
      </div>
    </div>
  );
}

function WordPostForm() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Từ mới" placeholder="Resilient" />
      <FormInput label="Phiên âm" placeholder="/rɪˈzɪliənt/" />
      <FormInput label="Nghĩa" placeholder="Kiên cường" />
      <FormInput label="Ví dụ" placeholder="She is resilient." />
      <div className="sm:col-span-2">
        <FormTextarea label="Mẹo ghi nhớ" rows={5} placeholder="Chia sẻ cách bạn ghi nhớ từ này..." />
      </div>
    </div>
  );
}

function UploadTile({ add, label, play }: { add?: boolean; label: string; play?: boolean }) {
  return (
    <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#b99cff] bg-[#fbf9ff] text-center font-black text-[#6d35ff]">
      <span className="text-3xl">{play ? "▶" : add ? "+" : "▧"}</span>
      <span className="mt-2 text-sm">{label}</span>
      <input type="file" className="hidden" accept={play ? "video/*" : "image/*,video/*"} />
    </label>
  );
}

function SideHint({ items, title }: { items: string[]; title: string }) {
  return (
    <aside className="rounded-2xl bg-[#f6f2ff] p-5">
      <h3 className="font-black text-[#121735]">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 text-sm font-bold leading-6 text-[#59627f]">
            <span className="text-[#6d35ff]">✓</span>
            {item}
          </div>
        ))}
      </div>
    </aside>
  );
}

function FormInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#303956]">{label}</span>
      <input placeholder={placeholder} className="mt-2 w-full rounded-xl border border-[#e8e9f5] px-4 py-3 font-bold outline-none placeholder:text-[#a6a3c4] focus:border-[#6d35ff]" />
    </label>
  );
}

function FormTextarea({ label, placeholder, rows }: { label: string; placeholder: string; rows: number }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#303956]">{label}</span>
      <textarea rows={rows} placeholder={placeholder} className="mt-2 w-full resize-none rounded-xl border border-[#e8e9f5] px-4 py-3 font-bold outline-none placeholder:text-[#a6a3c4] focus:border-[#6d35ff]" />
    </label>
  );
}

function FormSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#303956]">{label}</span>
      <select className="mt-2 w-full rounded-xl border border-[#e8e9f5] px-4 py-3 font-bold outline-none focus:border-[#6d35ff]">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function EditorButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 min-w-10 items-center justify-center rounded-lg px-2 hover:bg-[#f5f2ff] ${
        active ? "bg-[#efe9ff] text-[#6d35ff]" : ""
      }`}
    >
      {children}
    </button>
  );
}
