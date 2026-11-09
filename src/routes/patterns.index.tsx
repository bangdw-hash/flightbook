import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { NoDataState, PageTitle } from "@/components/fb";

export const Route = createFileRoute("/patterns/")({
  head: () => ({ meta: [{ title: "항공정비 현장 패턴영어 · 플라이트북" }, { name: "description", content: "번호별 현장 패턴영어 목록" }, { property: "og:title", content: "현장 패턴영어" }, { property: "og:description", content: "번호별 현장 패턴영어 목록" }] }),
  component: Patterns,
});

function Patterns() {
  const { dataset } = useStore();
  const [q, setQ] = useState("");
  if (!dataset?.patterns.length) return <NoDataState />;
  const s = q.toLowerCase();
  const list = dataset.patterns.filter((p) => !s || [p.id, p.title, p.meaning, ...p.examples.flatMap((e) => [e.en, e.ko])].join(" ").toLowerCase().includes(s));
  return (
    <>
      <PageTitle title="항공정비 현장 패턴영어" sub={`${dataset.patterns.length}개 패턴 · ${dataset.label}`} />
      <input className="field" aria-label="패턴 검색" placeholder="패턴·예문 검색 (영/한)" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-4 grid gap-2">
        {list.map((p) => (
          <li key={p.id}>
            <Link to="/patterns/$id" params={{ id: p.id }} className="card-paper flex gap-4 px-4 py-3 hover:border-teal">
              <span className="font-mono text-sm text-teal">{p.id}</span>
              <span><span className="block font-semibold">{p.title}</span><span className="text-sm text-muted-foreground">{p.meaning} · 예문 {p.examples.length}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
