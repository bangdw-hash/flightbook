import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactElement } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { shortMeaning } from "@/lib/parser";
import { NoDataState, LocalOnly, PageTitle, SourceBadge } from "@/components/fb";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "항공기술영어 가이드북 · 전체 목록" },
      { name: "description", content: "항공정비 현장 패턴영어와 용어를 한곳에서 검색하는 학습 노트" },
      { property: "og:title", content: "항공기술영어 가이드북" },
      { property: "og:description", content: "항공정비 현장 패턴영어와 용어를 한곳에서 검색하는 학습 노트" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type F = "all" | "patternItem" | "glossary" | "pattern" | "note";

function Index() {
  const { dataset, notes } = useStore();
  const [q, setQ] = useState("");
  const [f, setF] = useState<F>("all");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const hit = (...t: string[]) => !s || t.join(" ").toLowerCase().includes(s);
    const out: { key: string; kind: F; title: string; sub: string; to: () => ReactElement }[] = [];
    dataset?.patterns.forEach((p) => {
      if ((f === "all" || f === "patternItem") && hit(p.id, p.title, p.meaning, ...p.examples.flatMap((e) => [e.en, e.ko])))
        out.push({ key: "p" + p.id, kind: "patternItem", title: `${p.id} · ${p.title}`, sub: p.meaning, to: () => <Link to="/patterns/$id" params={{ id: p.id }} className="absolute inset-0" aria-label={p.title} /> });
    });
    dataset?.terms.forEach((t) => {
      const ok = f === "all" || t.sources.includes(f as "glossary");
      if (ok && hit(t.term, ...t.aliases, shortMeaning(t), t.definition))
        out.push({ key: t.id, kind: t.sources.includes("glossary") ? "glossary" : "pattern", title: t.term, sub: shortMeaning(t), to: () => <Link to="/glossary/$id" params={{ id: t.id }} className="absolute inset-0" aria-label={t.term} /> });
    });
    notes.forEach((n) => {
      if ((f === "all" || f === "note") && hit(n.term, n.meaning, n.example, n.memo))
        out.push({ key: n.id, kind: "note", title: n.term, sub: n.meaning, to: () => <Link to="/notes" className="absolute inset-0" aria-label={n.term} /> });
    });
    return out;
  }, [dataset, notes, q, f]);

  if (!dataset && notes.length === 0) return <NoDataState />;

  const filters: { v: F; l: string }[] = [
    { v: "all", l: "전체" }, { v: "patternItem", l: "패턴" }, { v: "glossary", l: "교재 용어집" }, { v: "pattern", l: "패턴 어휘" }, { v: "note", l: "나만의" },
  ];
  return (
    <>
      <p className="mb-2 text-sm font-semibold text-teal">항공기술영어 <span className="mx-1" aria-hidden="true">·</span> <span lang="en">Aircraft Technical English</span></p>
      <PageTitle title="항공기술영어 가이드북" sub={`${dataset?.label ?? "자료 없음"} · 패턴 ${dataset?.patterns.length ?? 0} · 예문 ${dataset?.patterns.reduce((count, pattern) => count + pattern.examples.length, 0) ?? 0} · 용어 ${dataset?.terms.length ?? 0} · 나만의 ${notes.length}`} />
      <label className="relative block">
        <span className="sr-only">검색</span>
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden />
        <input className="field pl-9" placeholder="영어·한국어로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="출처 필터">
        {filters.map((x) => (
          <button key={x.v} aria-pressed={f === x.v} onClick={() => setF(x.v)} className={`btn !min-h-[40px] !px-3 text-sm ${f === x.v ? "btn-primary" : "btn-outline"}`}>{x.l}</button>
        ))}
      </div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.key} className="card-paper relative px-4 py-3 hover:border-teal">
            <div className="flex items-center gap-2"><SourceBadge s={r.kind as "note"} /><span className="font-semibold">{r.title}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{r.sub}</p>
            {r.to()}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-6 text-center text-muted-foreground">검색 결과가 없습니다.</p>}
      <div className="mt-8"><LocalOnly /></div>
    </>
  );
}
