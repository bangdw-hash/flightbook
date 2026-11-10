import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { download, examplesCsv, notesCsv, parseExportJson, patternsCsv, termsCsv, toJson, type ExportFile } from "@/lib/export";
import { LocalOnly, PageTitle } from "@/components/fb";

export const Route = createFileRoute("/data")({
  head: () => ({ meta: [{ title: "자료 관리 · 항공기술영어 가이드북" }, { name: "description", content: "기본 교재와 JSON/CSV 내보내기" }, { property: "og:title", content: "불러오기·내보내기" }, { property: "og:description", content: "기본 교재, JSON·CSV 내보내기" }] }),
  component: Data,
});

function Data() {
  const { dataset, notes, setDataset, setNotes, user, textbookAvailable, hasCustomDataset } = useStore();
  const [json, setJson] = useState<ExportFile | null>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const loadJson = async (f: File | null) => {
    setErr(""); setJson(null);
    if (!f) return;
    const r = parseExportJson(await f.text());
    if (r.error) setErr(r.error); else setJson(r.data!);
  };
  const applyJson = () => {
    if (!user) { setErr("내 계정에 저장하려면 먼저 로그인하세요."); return; }
    if (!json || !confirm("현재 내 계정의 자료와 나만의 용어집을 JSON 내용으로 교체합니다. 계속할까요?")) return;
    setDataset(json.patterns.length || json.terms.length ? { origin: json.origin === "demo" ? "demo" : "import", label: json.label || "가져온 JSON", patterns: json.patterns, terms: json.terms } : null);
    setNotes(json.notes.map((note) => ({ ...note, shared: false }))); setJson(null); setOk("JSON을 가져왔습니다.");
  };
  const d = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageTitle title="자료 관리" />
      <LocalOnly>기본 교재는 로그인하면 자동으로 표시됩니다. 교재를 편집하면 내 계정에 편집본을 저장합니다.</LocalOnly>
      {err && <p role="alert" className="mt-3 text-destructive">{err}</p>}
      {ok && <p role="status" className="mt-3 rounded-lg bg-teal-soft px-3 py-2 text-sm">{ok}</p>}

      {textbookAvailable && hasCustomDataset && (
        <section className="card-paper mt-5 space-y-3 p-4">
          <h2 className="font-serif text-lg font-bold">기본 교재로 돌아가기</h2>
          <p className="text-sm">편집한 교재 자료는 아래에서 백업할 수 있습니다. 나만의 용어집은 유지됩니다.</p>
          <button className="btn btn-outline" onClick={() => {
            if (confirm("내 교재 편집본을 기본 교재로 바꿀까요?")) setDataset(null);
          }}>기본 교재 사용</button>
        </section>
      )}

      <section className="card-paper mt-5 space-y-3 p-4">
        <h2 className="font-serif text-lg font-bold">내보내기</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => download(`flightbook-${d}.json`, toJson(dataset, notes), "application/json")}>JSON 전체</button>
          <button className="btn btn-outline" disabled={!dataset} onClick={() => download(`patterns-${d}.csv`, patternsCsv(dataset!.patterns), "text/csv;charset=utf-8")}>패턴 CSV</button>
          <button className="btn btn-outline" disabled={!dataset} onClick={() => download(`examples-${d}.csv`, examplesCsv(dataset!.patterns), "text/csv;charset=utf-8")}>예문 CSV</button>
          <button className="btn btn-outline" disabled={!dataset} onClick={() => download(`terms-${d}.csv`, termsCsv(dataset!.terms), "text/csv;charset=utf-8")}>통합 용어 CSV</button>
          <button className="btn btn-outline" onClick={() => download(`my-notes-${d}.csv`, notesCsv(notes), "text/csv;charset=utf-8")}>나만의 용어 CSV</button>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>JSON은 전체 구조(패턴·예문·통합 용어·출처 패턴 번호·메모)를 담아 내 프로젝트에서 그대로 읽기 좋습니다.</li>
          <li>CSV는 UTF-8(BOM)이라 엑셀·구글 시트에서 한글이 깨지지 않습니다. 줄바꿈·쉼표·따옴표는 표준 방식으로 감싸 저장됩니다.</li>
          <li>같은 계정으로 로그인하면 다른 기기에서도 저장한 자료를 볼 수 있습니다. JSON은 별도 백업으로 보관할 수 있습니다.</li>
        </ol>
      </section>

      <section className="card-paper mt-5 space-y-3 p-4">
        <h2 className="font-serif text-lg font-bold">JSON 다시 가져오기</h2>
        <input type="file" accept=".json,application/json" aria-label="JSON 파일" className="field" onChange={(e) => loadJson(e.target.files?.[0] ?? null)} />
        {json && <div className="text-sm"><p>패턴 {json.patterns.length} · 용어 {json.terms.length} · 나만의 {json.notes.length} ({json.exportedAt?.slice(0, 10)})</p><button className="btn btn-teal mt-2" onClick={applyJson}>확인하고 교체</button></div>}
      </section>
    </>
  );
}
