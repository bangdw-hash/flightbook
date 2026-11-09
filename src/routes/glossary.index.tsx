import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { shortMeaning } from "@/lib/parser";
import { NoDataState, PageTitle, SourceBadge } from "@/components/fb";

export const Route = createFileRoute("/glossary/")({
  head: () => ({ meta: [{ title: "항공정비 현장 용어집 · 플라이트북" }, { name: "description", content: "교재 용어집과 패턴 어휘 통합 목록" }, { property: "og:title", content: "현장 용어집" }, { property: "og:description", content: "통합 용어 목록" }] }),
  component: Glossary,
});

function Glossary() {
  const { dataset } = useStore();
  const [q, setQ] = useState("");
  if (!dataset?.terms.length) return <NoDataState />;
  const s = q.toLowerCase();
  const list = dataset.terms.filter((t) => !s || [t.term, ...t.aliases, shortMeaning(t), t.definition].join(" ").toLowerCase().includes(s));
  return (
    <>
      <PageTitle title="항공정비 현장 용어집" sub={`통합 용어 ${dataset.terms.length}개`} />
      <input className="field" aria-label="용어 검색" placeholder="용어 검색 (영/한, 별칭 포함)" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {list.map((t) => (
          <li key={t.id}>
            <Link to="/glossary/$id" params={{ id: t.id }} className="card-paper block px-4 py-3 hover:border-teal">
              <span className="font-semibold">{t.term}</span>
              <span className="ml-2 inline-flex gap-1">{t.sources.map((s) => <SourceBadge key={s} s={s} />)}</span>
              <span className="block text-sm text-muted-foreground">{shortMeaning(t)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
