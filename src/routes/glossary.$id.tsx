import { SpeakingPractice } from "@/components/speaking-practice";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { shortMeaning } from "@/lib/parser";
import { NoDataState, PageTitle, Segmented, SourceBadge } from "@/components/fb";
import type { Term } from "@/lib/types";

export const Route = createFileRoute("/glossary/$id")({
  head: () => ({ meta: [{ title: "용어 상세 · 항공기술영어 가이드북" }, { name: "description", content: "용어 뜻·설명·출처 패턴" }, { property: "og:title", content: "용어 상세" }, { property: "og:description", content: "용어 상세" }] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { user, dataset, glossaryMode, setGlossaryMode, updateTerm, deleteTerm } = useStore();
  const nav = useNavigate();
  const [reveal, setReveal] = useState(false);
  const [edit, setEdit] = useState<Term | null>(null);
  const t = dataset?.terms.find((x) => x.id === id);
  if (!t) return <NoDataState />;
  if (edit)
    return (
      <div className="card-paper space-y-3 p-4">
        <h1 className="font-serif text-xl font-bold">용어 편집</h1>
        <label className="block text-sm">영어 용어<input className="field" value={edit.term} onChange={(e) => setEdit({ ...edit, term: e.target.value })} /></label>
        <label className="block text-sm">한국어 표제<input className="field" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} /></label>
        <label className="block text-sm">뜻 (한 줄에 하나)<textarea className="field" value={edit.meanings.join("\n")} onChange={(e) => setEdit({ ...edit, meanings: e.target.value.split("\n") })} /></label>
        <label className="block text-sm">설명<textarea rows={6} className="field" value={edit.definition} onChange={(e) => setEdit({ ...edit, definition: e.target.value })} /></label>
        <div className="flex gap-2"><button className="btn btn-primary" onClick={() => { updateTerm({ ...edit, meanings: edit.meanings.map((m) => m.trim()).filter(Boolean) }); setEdit(null); }}>저장</button><button className="btn btn-outline" onClick={() => setEdit(null)}>취소</button></div>
      </div>
    );
  return (
    <>
      <Link to="/glossary" className="text-sm text-teal">← 용어집</Link>
      <PageTitle title={t.term} sub={<span className="inline-flex gap-1">{t.sources.map((s) => <SourceBadge key={s} s={s} />)}</span>}
        right={<Segmented label="보기 방식" value={glossaryMode} onChange={(m) => { setGlossaryMode(m); setReveal(false); }} options={[{ value: "full", label: "전체 설명" }, { value: "short", label: "짧은 뜻" }]} />} />
      <div className="mb-4"><SpeakingPractice key={t.term} text={t.term} /></div>
      <div className="card-paper p-4">
        {glossaryMode === "short" && !reveal ? <button className="btn btn-outline" onClick={() => setReveal(true)}>뜻 보기</button> : (
          <>
            <p className="text-lg font-semibold">{shortMeaning(t) || "(뜻 없음)"}</p>
            {glossaryMode === "full" && t.definition && <p className="mt-3 whitespace-pre-line text-sm leading-7">{t.definition}</p>}
          </>
        )}
      </div>
      {t.aliases.length > 0 && <p className="mt-3 text-sm text-muted-foreground">검색 별칭: {t.aliases.join(", ")}</p>}
      {t.patternIds.length > 0 && (
        <div className="mt-4"><h2 className="text-sm font-semibold">나오는 패턴</h2>
          <div className="mt-2 flex flex-wrap gap-2">{t.patternIds.map((pid) => <Link key={pid} to="/patterns/$id" params={{ id: pid }} className="btn btn-outline !min-h-[40px] font-mono text-sm">Pattern {pid}</Link>)}</div>
        </div>
      )}
      {t.raws.length > 0 && <details className="mt-4 text-sm"><summary className="cursor-pointer">원문 어휘 줄 확인</summary><ul className="mt-2 list-disc pl-5">{t.raws.map((r) => <li key={r}>{r}</li>)}</ul></details>}
      {user && <div className="mt-6 flex gap-2">
        <button className="btn btn-outline" onClick={() => setEdit(t)}>편집</button>
        <button className="btn btn-danger" onClick={() => { if (confirm("이 용어를 삭제할까요?")) { deleteTerm(t.id); nav({ to: "/glossary" }); } }}>삭제</button>
      </div>}
    </>
  );
}
