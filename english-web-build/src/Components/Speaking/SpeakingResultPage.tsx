'use client';

import { ArrowRight, CheckCircle2, Mic, RotateCcw, Sparkles, Target, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSpeakingResult, practiceSpeakingAgain } from '@/src/lib/speaking-processing-api';
import type { SpeakingResultResponse } from '@/src/lib/speaking-processing.types';

type Tab = 'OVERVIEW' | 'TRANSCRIPT' | 'CORRECTIONS' | 'AI_COACH';

export default function SpeakingResultPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId ?? params.id);
  const [data, setData] = useState<SpeakingResultResponse | null>(null);
  const [tab, setTab] = useState<Tab>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getSpeakingResult(sessionId)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(errorText(err, 'KhÃ´ng táº£i Ä‘Æ°á»£c káº¿t quáº£ Speaking.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [sessionId]);

  const scoreLabel = useMemo(() => data ? getScoreLabel(data.scores.overallScore) : '', [data]);

  async function practiceAgain() {
    try {
      setRestarting(true);
      const result = await practiceSpeakingAgain(sessionId);
      router.push(result.redirectUrl);
    } catch (err) {
      setError(errorText(err, 'KhÃ´ng thá»ƒ báº¯t Ä‘áº§u luyá»‡n láº¡i.'));
    } finally {
      setRestarting(false);
    }
  }

  if (loading) return <State text="Äang táº£i káº¿t quáº£..." />;
  if (!data) return <State text={error || 'KhÃ´ng cÃ³ káº¿t quáº£.'} />;

  return (
    <main className="min-h-screen bg-[#fbfbff] px-4 py-7 text-slate-900 md:px-8">
      <div className="mx-auto max-w-[1450px]">
        <section className="rounded-[32px] bg-gradient-to-r from-violet-700 to-indigo-600 p-8 text-white shadow-xl shadow-violet-200">
          <div className="grid gap-7 md:grid-cols-[1fr_280px] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black"><Sparkles size={16} /> AI SPEAKING RESULT</div>
              <h1 className="mt-4 text-3xl font-black md:text-4xl">{data.summary.lessonTitle}</h1>
              <p className="mt-3 text-white/75">{data.summary.topicTitle} Â· {data.summary.practiceType.replaceAll('_', ' ')}</p>
              {data.missionUpdated && <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-400/20 px-4 py-3 font-black text-emerald-100"><CheckCircle2 size={18} /> Nhiá»‡m vá»¥ Speaking Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t</div>}
            </div>
            <div className="rounded-3xl bg-white/10 p-6 text-center backdrop-blur"><p className="text-sm font-bold text-white/70">Overall Score</p><p className="mt-1 text-6xl font-black">{data.scores.overallScore}</p><p className="mt-3 font-black text-yellow-300">{scoreLabel}</p></div>
          </div>
        </section>

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-7">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Score label="Pronunciation" value={data.scores.pronunciation} />
              <Score label="Fluency" value={data.scores.fluency} />
              <Score label="Ngữ pháp" value={data.scores.grammar} />
              <Score label="Từ vựng" value={data.scores.vocabulary} />
              <Score label="Confidence" value={data.scores.confidence} />
            </div>

            <div className="flex flex-wrap gap-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
              {([['OVERVIEW', 'Tá»•ng quan'], ['TRANSCRIPT', 'Báº£n ghi & Transcript'], ['CORRECTIONS', 'Sá»­a lá»—i'], ['AI_COACH', 'AI Coach']] as const).map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`rounded-xl px-5 py-3 text-sm font-black ${tab === value ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-violet-50'}`}>{label}</button>)}
            </div>

            {tab === 'OVERVIEW' && <Overview data={data} />}
            {tab === 'TRANSCRIPT' && <Transcript data={data} />}
            {tab === 'CORRECTIONS' && <Corrections data={data} />}
            {tab === 'AI_COACH' && <AiCoach data={data} />}
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><h2 className="text-lg font-black">BÃ i nÃ³i cá»§a báº¡n</h2>{data.answer.audioUrl ? <audio controls src={data.answer.audioUrl} className="mt-5 w-full" /> : <p className="mt-4 text-sm text-slate-500">KhÃ´ng cÃ³ file ghi Ã¢m.</p>}</section>
            {data.aiFeedback.nextPractice && <section className="rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-600 p-6 text-white shadow-lg"><div className="flex items-center gap-2 text-sm font-black text-white/75"><Target size={18} /> AI RECOMMENDATION</div><h2 className="mt-4 text-xl font-black">{data.aiFeedback.nextPractice.title}</h2><p className="mt-2 text-sm font-bold text-violet-200">Táº­p trung: {data.aiFeedback.nextPractice.focusSkill}</p><p className="mt-3 text-sm leading-6 text-white/75">{data.aiFeedback.nextPractice.reason}</p><button onClick={() => router.push('/speaking/topics')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-black text-violet-700">Chá»n bÃ i tiáº¿p theo <ArrowRight size={17} /></button></section>}
            <button onClick={practiceAgain} disabled={restarting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-black text-white disabled:opacity-60"><RotateCcw size={18} />{restarting ? 'Äang táº¡o phiÃªn má»›i...' : 'Luyá»‡n láº¡i'}</button>
            <button onClick={() => router.push('/speaking/history')} className="w-full rounded-xl border border-violet-200 bg-white py-4 font-black text-violet-700">Xem lá»‹ch sá»­</button>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Overview({ data }: { data: SpeakingResultResponse }) {
  return <section className="space-y-6"><article className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><Sparkles className="text-violet-600" /><h2 className="text-xl font-black">Pháº£n há»“i tá»•ng quan</h2></div><p className="mt-5 rounded-2xl bg-violet-50 p-5 leading-7 text-slate-700">{data.aiFeedback.feedback}</p></article>{data.aiFeedback.suggestions.length > 0 && <article className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Gá»£i Ã½ cáº£i thiá»‡n</h2><div className="mt-5 space-y-3">{data.aiFeedback.suggestions.map((item, index) => <div key={index} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><CheckCircle2 size={19} className="mt-0.5 text-emerald-600" /><p className="text-sm font-semibold leading-6 text-slate-600">{item}</p></div>)}</div></article>}</section>;
}

function Transcript({ data }: { data: SpeakingResultResponse }) {
  return <section className="grid gap-6 lg:grid-cols-2"><Panel title="Báº¡n Ä‘Ã£ nÃ³i" icon={<Volume2 size={20} />} text={data.answer.transcript} /><Panel title="PhiÃªn báº£n Ä‘Ã£ sá»­a" icon={<Sparkles size={20} />} text={data.answer.correctedText || data.aiFeedback.improvedVersion || 'ChÆ°a cÃ³ phiÃªn báº£n sá»­a.'} />{data.answer.expectedText && <div className="lg:col-span-2"><Panel title="CÃ¢u máº«u" icon={<Mic size={20} />} text={data.answer.expectedText} /></div>}</section>;
}

function Corrections({ data }: { data: SpeakingResultResponse }) {
  if (!data.aiFeedback.mistakes.length) return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7 text-center"><CheckCircle2 size={44} className="mx-auto text-emerald-600" /><h2 className="mt-4 text-xl font-black">KhÃ´ng phÃ¡t hiá»‡n lá»—i Ä‘Ã¡ng ká»ƒ</h2></section>;
  return <section className="space-y-4">{data.aiFeedback.mistakes.map((m, index) => <article key={index} className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">{m.type}</span><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-red-50 p-4"><p className="text-xs font-black uppercase text-red-500">Cáº§n sá»­a</p><p className="mt-2 font-bold text-red-900">{m.original || 'KhÃ´ng xÃ¡c Ä‘á»‹nh'}</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-600">NÃªn dÃ¹ng</p><p className="mt-2 font-bold text-emerald-900">{m.corrected}</p></div></div><p className="mt-4 text-sm leading-6 text-slate-600">{m.explanation}</p></article>)}</section>;
}

function AiCoach({ data }: { data: SpeakingResultResponse }) {
  return <section className="space-y-6"><Panel title="PhiÃªn báº£n nÃ³i tá»± nhiÃªn hÆ¡n" icon={<Sparkles size={20} />} text={data.aiFeedback.improvedVersion || data.answer.correctedText || 'ChÆ°a cÃ³ ná»™i dung.'} />{data.aiFeedback.nextPractice && <article className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">BÃ i luyá»‡n tiáº¿p theo</h2><p className="mt-4 font-black text-violet-700">{data.aiFeedback.nextPractice.title}</p><p className="mt-2 text-sm text-slate-500">Táº­p trung vÃ o {data.aiFeedback.nextPractice.focusSkill}</p><p className="mt-4 leading-7 text-slate-600">{data.aiFeedback.nextPractice.reason}</p></article>}</section>;
}

function Score({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-3 text-3xl font-black">{value}</p><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-600" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} /></div></article>;
}

function Panel({ title, text, icon }: { title: string; text: string; icon: React.ReactNode }) {
  return <article className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3 text-violet-700">{icon}<h2 className="text-lg font-black">{title}</h2></div><p className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 leading-8 text-slate-700">{text || 'KhÃ´ng cÃ³ dá»¯ liá»‡u.'}</p></article>;
}

function State({ text }: { text: string }) { return <div className="grid min-h-screen place-items-center bg-[#fbfbff]"><p className="rounded-2xl bg-white px-8 py-6 font-black shadow-sm">{text}</p></div>; }
function getScoreLabel(score: number) { return score >= 90 ? 'Excellent' : score >= 80 ? 'Very Good' : score >= 70 ? 'Good' : score >= 50 ? 'Keep Practicing' : 'Needs More Practice'; }
function errorText(error: unknown, fallback: string) { const value = error as { response?: { data?: { message?: string | string[] } }; message?: string }; const message = value.response?.data?.message; return Array.isArray(message) ? message.join(', ') : message ?? value.message ?? fallback; }
