import { ExamplePractice } from "@/components/example-practice";
import { SpeakingPractice } from "@/components/speaking-practice";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { canonicalTerm } from "@/lib/parser";
import { NoDataState, PageTitle, Segmented, SourceBadge } from "@/components/fb";
import type { Pattern } from "@/lib/types";

export const Route = createFileRoute("/patterns/$id")({
  head: ({ params }) => ({ meta: [{ title: `Pattern ${params.id} · 항공기술영어 가이드북` }, { name: "description", content: "패턴 상세: 예문과 번역" }, { property: "og:title", content: `Pattern ${params.id}` }, { property: "og:description", content: "패턴 상세" }] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { dataset, patternMode, setPatternMode, updatePattern, deletePattern } = useStore();
  const nav = useNavigate();
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<Pattern | null>(null);
  const p = dataset?.patterns.find((x) => x.id === id);
  if (!p) return <NoDataState />;
  if (edit)
    return (
      <div className="card-paper space-y-3 p-4">
        <h1 className="font-serif text-xl font-bold">Pattern {p.id} 편집</h1>
        <label className="block text-sm">영어 제목<input className="field" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
        <label className="block text-sm">한국어 뜻<input className="field" value={edit.meaning} onChange={(e) => setEdit({ ...edit, meaning: e.target.value })} /></label>
        {edit.examples.map((ex, i) => (
          <fieldset key={ex.num} className="space-y-1"><legend className="font-mono text-xs">{ex.num}</legend>
            {(["en", "ko"] as const).map((k) => (
              <textarea key={k} aria-label={`${ex.num} ${k}`} className="field" value={ex[k]} onChange={(e) => setEdit({ ...edit, examples: edit.examples.map((y, j) => (j === i ? { ...y, [k]: e.target.value } : y)) })} />
            ))}
          </fieldset>
        ))}
        <div className="flex gap-2"><button className="btn btn-primary" onClick={() => { updatePattern(edit); setEdit(null); }}>저장</button><button className="btn btn-outline" onClick={() => setEdit(null)}>취소</button></div>
      </div>
    );
  return (
    <>
      <Link to="/patterns" className="text-sm text-teal">← 패턴 목록</Link>
      <PageTitle title={p.title} sub={<><span className="font-mono">Pattern {p.id}</span> · {p.meaning}</>}
        right={<Segmented label="보기 방식" value={patternMode} onChange={setPatternMode} options={[{ value: "book", label: "교재형" }, { value: "review", label: "복습형" }]} />} />
      {p.usage.map((u, i) => <p key={i} className="text-sm text-muted-foreground">{u}</p>)}
      <ExamplePractice key={p.id} examples={p.examples} showTranslation={patternMode === "book"} />
      <ol className="mt-4 space-y-3">
        {p.examples.map((e) => (
          <li key={e.num} className="card-paper px-4 py-3">
            <p><span className="mr-2 font-mono text-xs text-teal">{e.num}</span>{e.en}</p>
            <SpeakingPractice key={e.en} text={e.en} />
            {patternMode === "book" || shown[e.num] ? <p className="mt-1 text-muted-foreground">{e.ko || "(번역 없음)"}</p>
              : <button className="btn btn-outline mt-2 !min-h-[40px] text-sm" onClick={() => setShown({ ...shown, [e.num]: true })}>번역 보기</button>}
          </li>
        ))}
      </ol>
      <h2 className="mt-6 font-serif text-lg font-bold">Words & Phrase</h2>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {p.words.map((w) => {
          const t = dataset?.terms.find((x) => x.key === canonicalTerm(w.en));
          return (
            <li key={w.raw} className="card-paper px-3 py-2 text-sm">
              {t ? <Link to="/glossary/$id" params={{ id: t.id }} className="font-semibold text-teal underline">{w.en}</Link> : <b>{w.en}</b>} — {w.ko}
              {t?.sources.includes("glossary") && <span className="ml-2"><SourceBadge s="glossary" /></span>}
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex gap-2">
        <button className="btn btn-outline" onClick={() => setEdit(p)}>편집</button>
        <button className="btn btn-danger" onClick={() => { if (confirm("이 패턴을 삭제할까요?")) { deletePattern(p.id); nav({ to: "/patterns" }); } }}>삭제</button>
      </div>
    </>
  );
}
