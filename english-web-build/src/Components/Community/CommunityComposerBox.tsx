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
  { mode: "image", icon: "â–§", label: "áº¢nh / Video" },
  { mode: "post", icon: "Aa", label: "Táº¡o má»›i" },
  { mode: "writing", icon: "â˜‘", label: "Check bÃ i" },
  { mode: "poll", icon: "â–¥", label: "ThÄƒm dÃ² Ã½ kiáº¿n" },
  { mode: "question", icon: "?", label: "Há»i Ä‘Ã¡p" },
];

const modalCopy: Record<ComposerMode, { title: string; desc: string; icon: string }> = {
  image: {
    title: "ÄÄƒng áº£nh / video",
    desc: "Chia sáº» hÃ¬nh áº£nh, video há»c táº­p vÃ  thÃªm mÃ´ táº£ Ä‘á»ƒ Ä‘Äƒng lÃªn cá»™ng Ä‘á»“ng.",
    icon: "â–§",
  },
  post: {
    title: "Táº¡o bÃ i viáº¿t má»›i",
    desc: "Viáº¿t ná»™i dung Ä‘áº§y Ä‘á»§, thÃªm chá»§ Ä‘á» vÃ  Ä‘Äƒng bÃ i chia sáº» kiáº¿n thá»©c.",
    icon: "Aa",
  },
  writing: {
    title: "Nhá» cá»™ng Ä‘á»“ng check bÃ i",
    desc: "Gá»­i bÃ i viáº¿t hoáº·c file Ä‘á»ƒ má»i ngÆ°á»i gÃ³p Ã½, sá»­a lá»—i vÃ  cáº£i thiá»‡n nhanh hÆ¡n.",
    icon: "â˜‘",
  },
  poll: {
    title: "Táº¡o thÄƒm dÃ² Ã½ kiáº¿n",
    desc: "Äáº·t cÃ¢u há»i, thÃªm lá»±a chá»n vÃ  Ä‘Äƒng poll Ä‘á»ƒ láº¥y Ã½ kiáº¿n cá»™ng Ä‘á»“ng.",
    icon: "â–¥",
  },
  question: {
    title: "Äáº·t cÃ¢u há»i",
    desc: "Há»i cá»™ng Ä‘á»“ng vá» tá»« vá»±ng, ngá»¯ phÃ¡p, speaking hoáº·c bÃ i há»c báº¡n chÆ°a rÃµ.",
    icon: "?",
  },
  speaking: {
    title: "Chia sáº» speaking",
    desc: "Gá»­i cÃ¢u nÃ³i hoáº·c ghi chÃº speaking Ä‘á»ƒ nháº­n gÃ³p Ã½ tá»« cá»™ng Ä‘á»“ng.",
    icon: "ðŸŽ™",
  },
  word: {
    title: "Chia sáº» tá»« má»›i",
    desc: "ÄÄƒng tá»« má»›i, nghÄ©a, phÃ¡t Ã¢m vÃ  vÃ­ dá»¥ Ä‘á»ƒ cÃ¹ng nhau ghi nhá»›.",
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
        placeholder: "Chia sáº» chi tiáº¿t ná»™i dung cá»§a báº¡n...",
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
    const url = window.prompt("Nháº­p link", previousUrl || "https://");

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
          <h1 className="text-2xl font-black">Táº¡o bÃ i viáº¿t má»›i</h1>
          <p className="mt-2 font-bold text-[#69708b]">
            Chá»n má»™t tÃ­nh nÄƒng bÃªn dÆ°á»›i Ä‘á»ƒ má»Ÿ form Ä‘Äƒng bÃ i Ä‘Ãºng loáº¡i ná»™i dung.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#d9ceff] px-6 py-3 text-sm font-black text-[#6d35ff]">
            LÆ°u nhÃ¡p
          </button>
          <button type="button" onClick={submitMainPost} className="rounded-xl bg-[#6d35ff] px-6 py-3 text-sm font-black text-white shadow-[0_16px_30px_rgba(109,53,255,0.24)]">
            ÄÄƒng bÃ i
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e8e9f5] p-3">
          <button type="button" className="flex items-center gap-3 rounded-xl border border-[#e8e9f5] px-4 py-3 text-sm font-black">
            ðŸŒ CÃ´ng khaiâŒ„
          </button>
          <span className="text-sm font-bold text-[#69708b]">Báº¥t ká»³ ai cÅ©ng cÃ³ thá»ƒ xem</span>
        </div>

        <label className="block">
          <div className="relative">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 100))}
              placeholder="TiÃªu Ä‘á» cá»§a báº¡n lÃ  gÃ¬?"
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
            <EditorButton active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>â˜·</EditorButton>
            <EditorButton active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>â˜°</EditorButton>
            <EditorButton active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>â‰¡</EditorButton>
            <EditorButton active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>â˜°</EditorButton>
            <EditorButton active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>âž</EditorButton>
            <EditorButton active={editor?.isActive("codeBlock")} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>{"</>"}</EditorButton>
            <EditorButton active={editor?.isActive("link")} onClick={setLink}>ðŸ”—</EditorButton>
            <EditorButton onClick={() => editor?.chain().focus().setHorizontalRule().run()}>â”</EditorButton>
            <EditorButton onClick={() => editor?.chain().focus().insertContent(" ðŸ˜Š ").run()}>â˜º</EditorButton>
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
            <h2 className="font-black">ThÃªm chá»§ Ä‘á»</h2>
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
          <span className="font-black">Chá»n nhÃ³m <span className="font-bold text-[#69708b]">(tÃ¹y chá»n)</span></span>
          <button type="button" className="mt-3 flex w-full items-center justify-between rounded-xl border border-[#e8e9f5] px-5 py-4 text-left font-bold text-[#8b91aa]">
            <span className="inline-flex items-center gap-2"><AppIcon name="users" tone="purple" size={16} bare /> Chá»n nhÃ³m phÃ¹ há»£p vá»›i ná»™i dung</span>
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
  const [pollOptions, setPollOptions] = useState(["Từ vựng", "Ngữ pháp", "Luyện nghe"]);

  if (!mode) return null;

  const copy = modalCopy[mode];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#111827]/55 px-4 py-6 backdrop-blur-md">
      <section className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1ecff] text-3xl font-black text-[#6d35ff] hover:bg-[#e3d8ff]"
          aria-label="ÄÃ³ng"
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
          <p className="text-sm font-bold text-[#69708b]">Beacon sáº½ Ä‘Äƒng ná»™i dung nÃ y lÃªn báº£ng tin cá»™ng Ä‘á»“ng.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#d9ceff] px-6 py-3 text-sm font-black text-[#6d35ff]">
              Há»§y
            </button>
            <button type="button" onClick={onSubmit} className="rounded-xl bg-[#6d35ff] px-7 py-3 text-sm font-black text-white shadow-[0_16px_30px_rgba(109,53,255,0.24)]">
              ÄÄƒng bÃ i
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
        <FormInput label="TiÃªu Ä‘á»" placeholder="Khoáº£nh kháº¯c há»c tiáº¿ng Anh hÃ´m nay" />
        <FormTextarea label="MÃ´ táº£" rows={5} placeholder="Viáº¿t mÃ´ táº£ cho áº£nh/video, vÃ­ dá»¥ bÃ i há»c báº¡n rÃºt ra..." />
        <div className="grid gap-3 sm:grid-cols-3">
          <UploadTile label="áº¢nh ghi chÃº" />
          <UploadTile label="Video ngáº¯n" play />
          <UploadTile label="ThÃªm file" add />
        </div>
      </div>
      <SideHint title="Gá»£i Ã½ Ä‘Äƒng áº£nh" items={["Tá»‘i Ä‘a 10 áº£nh hoáº·c 1 video", "Video nÃªn dÆ°á»›i 5 phÃºt", "ThÃªm caption Ä‘á»ƒ má»i ngÆ°á»i dá»… gÃ³p Ã½"]} />
    </div>
  );
}

function RichPostForm() {
  return (
    <div className="space-y-4">
      <FormInput label="TiÃªu Ä‘á» bÃ i viáº¿t" placeholder="5 cÃ¡ch ghi nhá»› tá»« vá»±ng hiá»‡u quáº£" />
      <FormTextarea label="Ná»™i dung" rows={9} placeholder="Viáº¿t ná»™i dung chi tiáº¿t, chia sáº» kinh nghiá»‡m, bÃ i há»c hoáº·c tÃ i liá»‡u..." />
      <FormInput label="Chá»§ Ä‘á»" placeholder="#Vocabulary #StudyTips" />
    </div>
  );
}

function WritingCheckForm() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <FormInput label="TiÃªu Ä‘á» cáº§n gÃ³p Ã½" placeholder="Please check my writing about My favorite place" />
        <FormTextarea label="BÃ i viáº¿t cáº§n check" rows={7} placeholder="DÃ¡n bÃ i writing cá»§a báº¡n vÃ o Ä‘Ã¢y..." />
        <label className="block rounded-2xl border border-dashed border-[#b99cff] bg-[#fbf9ff] p-5 text-center font-black text-[#6d35ff]">
          ðŸ“„ Táº£i file .docx / .pdf
          <input type="file" className="hidden" accept=".doc,.docx,.pdf,.txt" />
        </label>
      </div>
      <SideHint title="NgÆ°á»i gÃ³p Ã½ sáº½ tháº¥y" items={["Ná»™i dung bÃ i viáº¿t", "YÃªu cáº§u sá»­a lá»—i cá»¥ thá»ƒ", "File Ä‘Ã­nh kÃ¨m náº¿u cÃ³"]} />
    </div>
  );
}

function PollPostForm({ options, setOptions }: { options: string[]; setOptions: (options: string[]) => void }) {
  const updateOption = (index: number, value: string) => {
    setOptions(options.map((option, optionIndex) => (optionIndex === index ? value : option)));
  };

  return (
    <div className="space-y-4">
      <FormInput label="CÃ¢u há»i thÄƒm dÃ²" placeholder="Báº¡n muá»‘n há»c chá»§ Ä‘á» nÃ o trong tuáº§n nÃ y?" />
      <div className="space-y-3 rounded-2xl border border-[#e8e9f5] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black">CÃ¡c lá»±a chá»n</h3>
          <button type="button" onClick={() => setOptions([...options, ""])} className="rounded-xl bg-[#efe9ff] px-4 py-2 text-sm font-black text-[#6d35ff]">
            + ThÃªm lá»±a chá»n
          </button>
        </div>
        {options.map((option, index) => (
          <input
            key={index}
            value={option}
            onChange={(event) => updateOption(index, event.target.value)}
            placeholder={`Lá»±a chá»n ${index + 1}`}
            className="w-full rounded-xl border border-[#e8e9f5] px-4 py-3 font-bold outline-none focus:border-[#6d35ff]"
          />
        ))}
      </div>
      <div className="rounded-2xl bg-[#fff8e8] p-4 text-sm font-bold text-[#8a5a00]">
        Poll sáº½ hiá»ƒn thá»‹ káº¿t quáº£ theo thá»i gian thá»±c sau khi ngÆ°á»i dÃ¹ng bÃ¬nh chá»n.
      </div>
    </div>
  );
}

function QuestionPostForm() {
  return (
    <div className="space-y-4">
      <FormInput label="CÃ¢u há»i" placeholder="Khi nÃ o dÃ¹ng for vÃ  since?" />
      <FormTextarea label="MÃ´ táº£ chi tiáº¿t" rows={7} placeholder="Báº¡n Ä‘ang vÆ°á»›ng pháº§n nÃ o? ThÃªm vÃ­ dá»¥ Ä‘á»ƒ cá»™ng Ä‘á»“ng tráº£ lá»i chÃ­nh xÃ¡c hÆ¡n..." />
      <div className="grid gap-3 sm:grid-cols-3">
        <FormSelect label="Ká»¹ nÄƒng" options={["Ngữ pháp", "Từ vựng", "Luyện nghe", "Luyện nói"]} />
        <FormSelect label="TrÃ¬nh Ä‘á»™" options={["A1", "A2", "B1", "B2", "C1"]} />
        <FormSelect label="Tráº¡ng thÃ¡i" options={["Cáº§n tráº£ lá»i", "Cáº§n vÃ­ dá»¥", "Cáº§n sá»­a lá»—i"]} />
      </div>
    </div>
  );
}

function SpeakingPostForm() {
  return (
    <div className="space-y-4">
      <FormInput label="CÃ¢u luyá»‡n nÃ³i" placeholder="I want to improve my English speaking." />
      <FormTextarea label="Ghi chÃº" rows={5} placeholder="Báº¡n muá»‘n má»i ngÆ°á»i gÃ³p Ã½ phÃ¡t Ã¢m, ngá»¯ Ä‘iá»‡u hay Ä‘á»™ tá»± nhiÃªn?" />
      <div className="rounded-2xl border border-[#e8e9f5] bg-[#fbf9ff] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="rounded-xl bg-[#6d35ff] px-5 py-3 text-sm font-black text-white">ðŸŽ™ Ghi Ã¢m</button>
          <button type="button" className="rounded-xl border border-[#d9ceff] px-5 py-3 text-sm font-black text-[#6d35ff]">ðŸ”Š Nghe máº«u</button>
        </div>
        <div className="mt-5 flex h-14 items-end gap-1 text-3xl text-[#6d35ff]">
          <span>â–‚</span><span>â–ƒ</span><span>â–…</span><span>â–‡</span><span>â–…</span><span>â–ƒ</span><span>â–‚</span>
        </div>
      </div>
    </div>
  );
}

function WordPostForm() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Tá»« má»›i" placeholder="Resilient" />
      <FormInput label="PhiÃªn Ã¢m" placeholder="/rÉªËˆzÉªliÉ™nt/" />
      <FormInput label="NghÄ©a" placeholder="KiÃªn cÆ°á»ng" />
      <FormInput label="VÃ­ dá»¥" placeholder="She is resilient." />
      <div className="sm:col-span-2">
        <FormTextarea label="Máº¹o ghi nhá»›" rows={5} placeholder="Chia sáº» cÃ¡ch báº¡n ghi nhá»› tá»« nÃ y..." />
      </div>
    </div>
  );
}

function UploadTile({ add, label, play }: { add?: boolean; label: string; play?: boolean }) {
  return (
    <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#b99cff] bg-[#fbf9ff] text-center font-black text-[#6d35ff]">
      <span className="text-3xl">{play ? "â–¶" : add ? "+" : "â–§"}</span>
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
            <span className="text-[#6d35ff]">âœ“</span>
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
