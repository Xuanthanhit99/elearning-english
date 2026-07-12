"use client";

import {
  BuilderOutline,
  lessonBuilderApi,
  type BuilderForm,
} from "@/src/lib/lesson-builder-api";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  Play,
  Plus,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BuilderProject = {
  id: string;
  status: string;
  goal: string;
  outline: BuilderOutline | null;
  courseId?: string | null;
  firstLessonId?: string | null;
  createdAt: string;
  course?: {
    id: string;
    title: string;
    sections: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        content?: string | null;
        quizzes?: unknown[];
      }>;
    }>;
  } | null;
};

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const skillOptions = ["Vocabulary", "Grammar", "Listening", "Speaking", "Reading", "Quiz"];

export default function LessonBuilderPage() {
  const [form, setForm] = useState<BuilderForm>({
    goal: "Tôi muốn học English for Kids, 5 tuổi, 20 phút/ngày, trong 30 ngày",
    audienceAge: "5 tuổi",
    level: "A1",
    dailyMinutes: 20,
    totalDays: 30,
    interests: ["animals", "colors", "songs"],
    focusSkills: ["Vocabulary", "Listening", "Speaking"],
  });
  const [interestText, setInterestText] = useState("animals, colors, songs");
  const [project, setProject] = useState<BuilderProject | null>(null);
  const [projects, setProjects] = useState<BuilderProject[]>([]);
  const [outline, setOutline] = useState<BuilderOutline | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const lessonCount = useMemo(
    () =>
      outline?.modules.reduce(
        (sum, module) => sum + (module.lessons?.length || 0),
        0,
      ) || 0,
    [outline],
  );

  useEffect(() => {
    void loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await lessonBuilderApi.listProjects();
      setProjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  function syncFormInterests(next: Partial<BuilderForm> = {}) {
    const interests = interestText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return { ...form, ...next, interests };
  }

  async function createOutline() {
    setError("");
    setLoading("outline");
    try {
      const res = await lessonBuilderApi.createOutline(syncFormInterests());
      setProject(res.data);
      setOutline(res.data.outline);
      await loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tạo được outline.");
    } finally {
      setLoading("");
    }
  }

  async function saveOutline() {
    if (!project || !outline) return;
    setLoading("save");
    setError("");
    try {
      const res = await lessonBuilderApi.updateOutline(project.id, outline);
      setProject(res.data);
      setOutline(res.data.outline);
      await loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || "Không lưu được outline.");
    } finally {
      setLoading("");
    }
  }

  async function confirmOutline() {
    if (!project || !outline) return;
    setLoading("confirm");
    setError("");
    try {
      await lessonBuilderApi.updateOutline(project.id, outline);
      const res = await lessonBuilderApi.confirmOutline(project.id);
      setProject(res.data);
      setOutline(res.data.outline);
      await loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || "Không xác nhận được outline.");
    } finally {
      setLoading("");
    }
  }

  async function generateContent(lessonId?: string) {
    if (!project) return;
    setLoading(lessonId ? `lesson-${lessonId}` : "content");
    setError("");
    try {
      const res = await lessonBuilderApi.generateContent(project.id, lessonId);
      setProject(res.data);
      setOutline(res.data.outline);
      await loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || "Không sinh được nội dung.");
    } finally {
      setLoading("");
    }
  }

  function updateModule(index: number, patch: Record<string, unknown>) {
    if (!outline) return;
    setOutline({
      ...outline,
      modules: outline.modules.map((module, moduleIndex) =>
        moduleIndex === index ? { ...module, ...patch } : module,
      ),
    });
  }

  function updateLesson(
    moduleIndex: number,
    lessonIndex: number,
    patch: Record<string, unknown>,
  ) {
    if (!outline) return;
    setOutline({
      ...outline,
      modules: outline.modules.map((module, currentModuleIndex) =>
        currentModuleIndex !== moduleIndex
          ? module
          : {
              ...module,
              lessons: module.lessons.map((lesson, currentLessonIndex) =>
                currentLessonIndex === lessonIndex
                  ? { ...lesson, ...patch }
                  : lesson,
              ),
            },
      ),
    });
  }

  function addLesson(moduleIndex: number) {
    if (!outline) return;
    const module = outline.modules[moduleIndex];
    updateModule(moduleIndex, {
      lessons: [
        ...module.lessons,
        {
          title: `Lesson ${module.lessons.length + 1}`,
          goal: "Mục tiêu bài học mới",
          duration: form.dailyMinutes || 15,
          skills: ["Vocabulary", "Speaking"],
        },
      ],
    });
  }

  function removeLesson(moduleIndex: number, lessonIndex: number) {
    if (!outline) return;
    const module = outline.modules[moduleIndex];
    updateModule(moduleIndex, {
      lessons: module.lessons.filter((_, index) => index !== lessonIndex),
    });
  }

  function selectProject(item: BuilderProject) {
    setProject(item);
    setOutline(item.outline);
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#fbfbff] px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[28px] border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
                <Sparkles size={16} />
                AI Lesson Builder
              </div>
              <h1 className="mt-4 text-4xl font-black text-slate-950">
                Tạo lộ trình học cá nhân hóa
              </h1>
              <p className="mt-3 max-w-3xl font-semibold leading-7 text-slate-600">
                Nhập mục tiêu, để AI tạo outline, chỉnh sửa nếu cần, rồi sinh
                nội dung đầy đủ cho từng bài học.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat icon={<Bot size={20} />} value="AI" label="phân tích" />
              <Stat icon={<BookOpen size={20} />} value={String(lessonCount)} label="bài học" />
              <Stat icon={<Clock size={20} />} value={`${outline?.estimatedMinutes || 0}p`} label="dự kiến" />
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
          <section className="space-y-6">
            <div className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                1. Người dùng nhập mục tiêu
              </h2>
              <label className="mt-4 block text-sm font-black text-slate-700">
                Chủ đề / mục tiêu
              </label>
              <textarea
                value={form.goal}
                onChange={(event) =>
                  setForm({ ...form, goal: event.target.value })
                }
                className="mt-2 min-h-28 w-full rounded-2xl border border-violet-100 px-4 py-3 font-semibold outline-none focus:border-violet-500"
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field label="Độ tuổi">
                  <input
                    value={form.audienceAge || ""}
                    onChange={(event) =>
                      setForm({ ...form, audienceAge: event.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Trình độ">
                  <select
                    value={form.level || "A1"}
                    onChange={(event) =>
                      setForm({ ...form, level: event.target.value })
                    }
                    className="input"
                  >
                    {levels.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Phút/ngày">
                  <input
                    type="number"
                    value={form.dailyMinutes || 20}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dailyMinutes: Number(event.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Số ngày">
                  <input
                    type="number"
                    value={form.totalDays || 30}
                    onChange={(event) =>
                      setForm({ ...form, totalDays: Number(event.target.value) })
                    }
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Sở thích">
                <input
                  value={interestText}
                  onChange={(event) => setInterestText(event.target.value)}
                  className="input"
                  placeholder="animals, travel, food"
                />
              </Field>

              <div className="mt-4">
                <p className="text-sm font-black text-slate-700">
                  Kỹ năng trọng tâm
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skillOptions.map((skill) => {
                    const active = form.focusSkills?.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          const current = form.focusSkills || [];
                          setForm({
                            ...form,
                            focusSkills: active
                              ? current.filter((item) => item !== skill)
                              : [...current, skill],
                          });
                        }}
                        className={`rounded-full px-3 py-2 text-xs font-black ${
                          active
                            ? "bg-violet-600 text-white"
                            : "bg-violet-50 text-violet-700"
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={createOutline}
                disabled={!form.goal.trim() || loading === "outline"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 font-black text-white shadow-lg shadow-violet-200 disabled:opacity-60"
              >
                {loading === "outline" ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Wand2 size={18} />
                )}
                AI tạo course outline
              </button>
            </div>

            <div className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
              <h2 className="font-black text-slate-950">Các lộ trình đã tạo</h2>
              <div className="mt-4 space-y-3">
                {projects.length === 0 && (
                  <p className="text-sm font-semibold text-slate-500">
                    Chưa có lộ trình nào.
                  </p>
                )}
                {projects.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectProject(item)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left ${
                      project?.id === item.id
                        ? "border-violet-400 bg-violet-50"
                        : "border-slate-100 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-black text-slate-900">
                      {item.outline?.title || item.goal}
                    </p>
                    <p className="mt-1 text-xs font-bold text-violet-600">
                      {item.status}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {!outline ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-[28px] border border-dashed border-violet-200 bg-white">
                <div className="max-w-md text-center">
                  <Bot className="mx-auto text-violet-500" size={56} />
                  <h2 className="mt-4 text-2xl font-black text-slate-950">
                    Outline sẽ xuất hiện ở đây
                  </h2>
                  <p className="mt-2 font-semibold text-slate-500">
                    Sau khi AI tạo cấu trúc, bạn có thể chỉnh từng module và
                    lesson trước khi lưu vào hệ thống.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-black text-slate-500">
                        Tên course
                      </label>
                      <input
                        value={outline.title}
                        onChange={(event) =>
                          setOutline({ ...outline, title: event.target.value })
                        }
                        className="mt-2 w-full rounded-2xl border border-violet-100 px-4 py-3 text-2xl font-black outline-none focus:border-violet-500"
                      />
                      <textarea
                        value={outline.description}
                        onChange={(event) =>
                          setOutline({
                            ...outline,
                            description: event.target.value,
                          })
                        }
                        className="mt-3 min-h-20 w-full rounded-2xl border border-violet-100 px-4 py-3 font-semibold text-slate-600 outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="rounded-2xl bg-violet-50 p-4 text-sm font-black text-violet-700">
                      <p>{outline.level}</p>
                      <p>{lessonCount} lessons</p>
                      <p>{outline.estimatedMinutes} phút</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={saveOutline}
                      disabled={loading === "save"}
                      className="btn-secondary"
                    >
                      <Save size={16} />
                      Lưu outline
                    </button>
                    <button
                      onClick={confirmOutline}
                      disabled={loading === "confirm"}
                      className="btn-primary"
                    >
                      {loading === "confirm" ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Xác nhận & lưu course
                    </button>
                    <button
                      onClick={() => generateContent()}
                      disabled={!project?.courseId || loading === "content"}
                      className="btn-primary bg-emerald-600 shadow-emerald-100 disabled:opacity-50"
                    >
                      {loading === "content" ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      Sinh nội dung tất cả bài
                    </button>
                    {project?.courseId && (
                      <Link
                        href={`/lesson-builder/course/${project.courseId}`}
                        className="btn-secondary"
                      >
                        <Play size={16} />
                        Bắt đầu học
                      </Link>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {outline.modules.map((module, moduleIndex) => (
                    <div
                      key={moduleIndex}
                      className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 font-black text-white">
                          {moduleIndex + 1}
                        </span>
                        <input
                          value={module.title}
                          onChange={(event) =>
                            updateModule(moduleIndex, {
                              title: event.target.value,
                            })
                          }
                          className="flex-1 rounded-2xl border border-violet-100 px-4 py-3 text-lg font-black outline-none focus:border-violet-500"
                        />
                      </div>
                      <input
                        value={module.description || ""}
                        onChange={(event) =>
                          updateModule(moduleIndex, {
                            description: event.target.value,
                          })
                        }
                        className="mt-3 w-full rounded-2xl border border-violet-100 px-4 py-3 font-semibold text-slate-600 outline-none focus:border-violet-500"
                        placeholder="Mô tả module"
                      />

                      <div className="mt-4 space-y-3">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const savedLesson =
                            project?.course?.sections?.[moduleIndex]?.lessons?.[
                              lessonIndex
                            ];
                          return (
                            <div
                              key={`${moduleIndex}-${lessonIndex}`}
                              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row">
                                <div className="flex-1">
                                  <input
                                    value={lesson.title}
                                    onChange={(event) =>
                                      updateLesson(moduleIndex, lessonIndex, {
                                        title: event.target.value,
                                      })
                                    }
                                    className="w-full rounded-xl border border-white bg-white px-4 py-3 font-black outline-none focus:border-violet-400"
                                  />
                                  <input
                                    value={lesson.goal || ""}
                                    onChange={(event) =>
                                      updateLesson(moduleIndex, lessonIndex, {
                                        goal: event.target.value,
                                      })
                                    }
                                    className="mt-2 w-full rounded-xl border border-white bg-white px-4 py-3 text-sm font-semibold text-slate-600 outline-none focus:border-violet-400"
                                    placeholder="Mục tiêu bài học"
                                  />
                                </div>
                                <input
                                  type="number"
                                  value={lesson.duration || 15}
                                  onChange={(event) =>
                                    updateLesson(moduleIndex, lessonIndex, {
                                      duration: Number(event.target.value),
                                    })
                                  }
                                  className="h-12 w-24 rounded-xl border border-white bg-white px-3 text-center font-black outline-none"
                                />
                                <button
                                  onClick={() =>
                                    removeLesson(moduleIndex, lessonIndex)
                                  }
                                  className="h-12 rounded-xl px-4 font-black text-red-500 hover:bg-red-50"
                                >
                                  Xóa
                                </button>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {(lesson.skills || []).map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-600"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {savedLesson && (
                                  <button
                                    onClick={() => generateContent(savedLesson.id)}
                                    disabled={loading === `lesson-${savedLesson.id}`}
                                    className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
                                  >
                                    {loading === `lesson-${savedLesson.id}` ? (
                                      <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                      <Sparkles size={14} />
                                    )}
                                    Sinh riêng bài này
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => addLesson(moduleIndex)}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-100 px-4 py-3 text-sm font-black text-violet-700 hover:bg-violet-50"
                      >
                        <Plus size={16} />
                        Thêm lesson
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <style jsx global>{`
        .input {
          margin-top: 0.5rem;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #ede9fe;
          padding: 0.75rem 1rem;
          font-weight: 700;
          outline: none;
        }
        .input:focus {
          border-color: #8b5cf6;
        }
        .btn-primary,
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 1rem;
          padding: 0.875rem 1rem;
          font-weight: 900;
        }
        .btn-primary {
          background: #7c3aed;
          color: white;
          box-shadow: 0 12px 30px rgba(124, 58, 237, 0.18);
        }
        .btn-secondary {
          border: 1px solid #ede9fe;
          background: white;
          color: #6d35ff;
        }
      `}</style>
    </main>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="mt-4 block text-sm font-black text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-violet-50 px-4 py-3">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600">
        {icon}
      </div>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}
