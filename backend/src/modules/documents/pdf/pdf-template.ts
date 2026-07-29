import {
  GeneratedFinalTest,
  GeneratedLesson,
  GeneratedOutline,
  GeneratedStudyPlan,
} from '../generation/document-generation.types';

interface AssembledContent {
  outline: GeneratedOutline;
  lessons: GeneratedLesson[];
  finalTest: GeneratedFinalTest | null;
  studyPlan: GeneratedStudyPlan | null;
}

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderVocabularyTable(lesson: GeneratedLesson): string {
  const rows = (lesson.vocabulary ?? [])
    .map(
      (v) => `<tr>
        <td>${esc(v.word)}</td>
        <td>${esc(v.ipa ?? '')}</td>
        <td>${esc(v.partOfSpeech)}</td>
        <td>${esc(v.meaning)}</td>
        <td>${esc(v.example)}${v.exampleTranslation ? `<br/><em>${esc(v.exampleTranslation)}</em>` : ''}</td>
      </tr>`,
    )
    .join('');
  return `<table class="vocab-table">
    <thead><tr><th>Từ vựng</th><th>IPA</th><th>Loại từ</th><th>Nghĩa</th><th>Ví dụ</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderDialogue(lesson: GeneratedLesson): string {
  if (!lesson.dialogue) return '';
  const lines = (lesson.dialogue.lines ?? [])
    .map(
      (l) =>
        `<p class="dialogue-line"><strong>${esc(l.speaker)}:</strong> ${esc(l.english)}${l.translation ? `<br/><span class="translation">${esc(l.translation)}</span>` : ''}</p>`,
    )
    .join('');
  return `<div class="dialogue"><h3>Hội thoại</h3><p class="dialogue-context">${esc(lesson.dialogue.context)}</p>${lines}</div>`;
}

function renderGrammar(lesson: GeneratedLesson): string {
  if (!lesson.grammar) return '';
  const examples = (lesson.grammar.examples ?? [])
    .map(
      (e) =>
        `<li>${esc(e.english)}${e.translation ? ` — <em>${esc(e.translation)}</em>` : ''}</li>`,
    )
    .join('');
  const mistakes = (lesson.grammar.commonMistakes ?? [])
    .map((m) => `<li>${esc(m)}</li>`)
    .join('');
  return `<div class="grammar">
    <h3>Ngữ pháp: ${esc(lesson.grammar.title)}</h3>
    <p>${esc(lesson.grammar.explanation)}</p>
    <p class="structure"><strong>Cấu trúc:</strong> ${esc(lesson.grammar.structure)}</p>
    <ul>${examples}</ul>
    ${mistakes ? `<p><strong>Lỗi thường gặp:</strong></p><ul>${mistakes}</ul>` : ''}
  </div>`;
}

function renderExercises(lesson: GeneratedLesson): string {
  const exercises = (lesson.exercises ?? [])
    .map((ex) => {
      const questions = (
        ex.questions as Array<{ id?: string; prompt?: string }>
      )
        .map((q) => `<li>${esc(q.prompt ?? JSON.stringify(q))}</li>`)
        .join('');
      return `<div class="exercise"><h4>${esc(ex.instruction)}</h4><ol>${questions}</ol></div>`;
    })
    .join('');
  return `<div class="exercises"><h3>Bài tập</h3>${exercises}</div>`;
}

function renderAnswerKey(lesson: GeneratedLesson): string {
  if (!lesson.answers?.length) return '';
  const rows = lesson.answers
    .map(
      (a) =>
        `<li><strong>${esc(a.questionId)}:</strong> ${esc(typeof a.answer === 'string' ? a.answer : JSON.stringify(a.answer))}${a.explanation ? ` — ${esc(a.explanation)}` : ''}</li>`,
    )
    .join('');
  return `<div class="answer-key"><h4>Đáp án</h4><ul>${rows}</ul></div>`;
}

export function renderDocumentHtml(input: {
  title: string;
  category: string;
  level: string | null;
  content: AssembledContent;
}): string {
  const { title, category, level, content } = input;
  const toc = content.lessons
    .map((l) => `<li>Bài ${l.lessonNumber}: ${esc(l.title)}</li>`)
    .join('');

  const lessonsHtml = content.lessons
    .map(
      (lesson) => `<section class="lesson" id="lesson-${lesson.lessonNumber}">
      <h2>Bài ${lesson.lessonNumber}: ${esc(lesson.title)}</h2>
      ${lesson.vietnameseTitle ? `<p class="vi-title">${esc(lesson.vietnameseTitle)}</p>` : ''}
      <ul class="objectives">${(lesson.objectives ?? []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
      ${renderVocabularyTable(lesson)}
      ${renderDialogue(lesson)}
      ${renderGrammar(lesson)}
      ${renderExercises(lesson)}
      ${renderAnswerKey(lesson)}
    </section>`,
    )
    .join('');

  const finalTestHtml = content.finalTest
    ? `<section class="final-test"><h2>Bài kiểm tra cuối khoá</h2>
      <p>${esc(content.finalTest.instructions)}</p>
      <ol>${content.finalTest.questions.map((q) => `<li>${esc(q.prompt)} (${q.score} điểm)</li>`).join('')}</ol>
      <h3>Đáp án</h3>
      <ul>${content.finalTest.answers.map((a) => `<li>${esc(a.questionId)}: ${esc(typeof a.answer === 'string' ? a.answer : JSON.stringify(a.answer))}</li>`).join('')}</ul>
    </section>`
    : '';

  const studyPlanHtml = content.studyPlan
    ? `<section class="study-plan"><h2>Lộ trình học</h2>
      <ol>${content.studyPlan.days.map((d) => `<li>Ngày ${d.day}: ${esc(d.focus)} — ${(d.tasks ?? []).join(', ')}</li>`).join('')}</ol>
    </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 20mm 16mm; }
  body { font-family: "Noto Sans", "Segoe UI", Arial, sans-serif; color: #1a1a2e; font-size: 12px; line-height: 1.6; }
  h1 { font-size: 26px; color: #2b2d6e; }
  h2 { font-size: 18px; color: #2b2d6e; margin-top: 28px; page-break-before: auto; }
  h3 { font-size: 14px; color: #4b3f9e; }
  .cover { text-align: center; padding-top: 120px; page-break-after: always; }
  .cover .brand { font-size: 14px; letter-spacing: 4px; color: #7a5cf0; text-transform: uppercase; }
  .cover h1 { margin-top: 24px; }
  .cover .meta { margin-top: 16px; color: #555; }
  .toc { page-break-after: always; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { padding: 4px 0; border-bottom: 1px dotted #ccc; }
  .lesson { page-break-before: always; }
  table.vocab-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
  table.vocab-table th, table.vocab-table td { border: 1px solid #d8d8e8; padding: 6px 8px; text-align: left; vertical-align: top; }
  table.vocab-table th { background: #f1effe; }
  .dialogue-line { margin: 4px 0; }
  .translation { color: #666; font-style: italic; }
  .objectives { color: #444; }
  .exercise { margin: 10px 0; }
  .answer-key { background: #f7f7fb; padding: 8px 12px; border-radius: 6px; margin-top: 10px; }
  .final-test, .study-plan { page-break-before: always; }
  footer.page-footer { position: fixed; bottom: 0; font-size: 10px; color: #999; }
</style>
</head>
<body>
  <div class="cover">
    <div class="brand">BeaconVie</div>
    <h1>${esc(title)}</h1>
    <p class="meta">Danh mục: ${esc(category)} ${level ? `· Cấp độ: ${esc(level)}` : ''}</p>
  </div>
  <div class="toc">
    <h2>Mục lục</h2>
    <ul>${toc}</ul>
  </div>
  ${lessonsHtml}
  ${finalTestHtml}
  ${studyPlanHtml}
</body>
</html>`;
}
