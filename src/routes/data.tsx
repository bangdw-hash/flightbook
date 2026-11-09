import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { buildImport, decodeTxt, type ImportPreview } from "@/lib/parser";
import { download, examplesCsv, notesCsv, parseExportJson, patternsCsv, termsCsv, toJson, type ExportFile } from "@/lib/export";
import { LocalOnly, PageTitle } from "@/components/fb";

export const Route = createFileRoute("/data")({
  head: () => ({ meta: [{ title: "불러오기·내보내기 · 플라이트북" }, { name: "description", content: "교재 TXT 불러오기와 JSON/CSV 내보내기" }, { property: "og:title", content: "불러오기·내보내기" }, { property: "og:description", content: "TXT 불러오기, JSON·CSV 내보내기" }] }),
  component: Data,
});

async function readFile(f: File | null) {
  if (!f) return null;
  return decodeTxt(await f.arrayBuffer());
}

function Data() {
  const { dataset, notes, setDataset, setNotes, user } = useStore();
  const [pf, setPf] = useState<File | null>(null);
  const [gf, setGf] = useState<File | null>(null);
  const [notesMsg, setNotesMsg] = useState<string[]>([]);
  const [prev, setPrev] = useState<ImportPreview | null>(null);
  const [json, setJson] = useState<ExportFile | null>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const preview = async () => {
    setOk(""); setErr("");
    const [p, g] = await Promise.all([readFile(pf), readFile(gf)]);
    setNotesMsg([p && `패턴영어: ${p.note}`, g && `용어 파트: ${g.note}`].filter(Boolean) as string[]);
    setPrev(buildImport(p?.text ?? null, g?.text ?? null));
  };
  const apply = () => {
    if (!user) { setErr("내 계정에 저장하려면 먼저 로그인하세요."); return; }
    if (!prev) return;
    if (dataset && !confirm(`현재 자료(${dataset.label})를 새로 불러온 자료로 교체합니다. 나만의 용어집은 유지됩니다. 계속할까요?`)) return;
    setDataset({ origin: "import", label: "불러온 교재 자료", patterns: prev.patterns, terms: prev.terms });
    setPrev(null); setOk("적용했습니다.");
  };
  const loadJson = async (f: File | null) => {
    setErr(""); setJson(null);
    if (!f) return;
    const r = parseExportJson(await f.text());
    if (r.error) setErr(r.error); else setJson(r.data!);
  };
  const applyJson = () => {
    if (!user) { setErr("내 계정에 저장하려면 먼저 로그인하세요."); return; }
    if (!json || !confirm("현재 내 계정의 자료와 나만의 용어집을 JSON 내용으로 교체합니다. 계속할까요?")) return;
    setDataset(json.patterns.length || json.terms.length ? { origin: json.origin ?? "import", label: json.label || "가져온 JSON", patterns: json.patterns, terms: json.terms } : null);
    setNotes(json.notes.map((note) => ({ ...note, shared: false }))); setJson(null); setOk("JSON을 가져왔습니다.");
  };
  const d = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageTitle title="불러오기·내보내기" />
      <LocalOnly>TXT 원본은 브라우저에서 읽습니다. 로그인 후 적용하면 정리한 항목이 내 Supabase 계정에 저장됩니다.</LocalOnly>
      {err && <p role="alert" className="mt-3 text-destructive">{err}</p>}
      {ok && <p role="status" className="mt-3 rounded-lg bg-teal-soft px-3 py-2 text-sm">{ok}</p>}

      <section className="card-paper mt-5 space-y-3 p-4">
        <h2 className="font-serif text-lg font-bold">교재 TXT 불러오기</h2>
        <label className="block text-sm font-semibold">패턴영어 TXT<input type="file" accept=".txt,text/plain" className="field mt-1" onChange={(e) => setPf(e.target.files?.[0] ?? null)} /></label>
        <label className="block text-sm font-semibold">용어 파트 TXT<input type="file" accept=".txt,text/plain" className="field mt-1" onChange={(e) => setGf(e.target.files?.[0] ?? null)} /></label>
        <button className="btn btn-primary" disabled={!pf && !gf} onClick={preview}>미리보기</button>
        {notesMsg.map((m) => <p key={m} className="text-sm text-muted-foreground">{m}</p>)}
        {prev && (
          <div className="rounded-lg border border-border p-3 text-sm">
            {prev.errors.length > 0 ? (
              <div role="alert" className="text-destructive">{prev.errors.map((e) => <p key={e}>{e}</p>)}
                <p className="mt-2 text-muted-foreground">형식 예: 패턴 줄 다음에 영어 제목, 한국어 뜻, ∙ 사용법, ‘001 예문’, [Words &amp; Phrase] 아래 ⬩ 어휘, [Translation] 아래 ‘001 번역’. 기존 자료는 그대로입니다.</p></div>
            ) : null}
            <p>패턴 {prev.patterns.length} · 예문 {prev.exampleCount} · 패턴 어휘 {prev.wordCount} · 교재 용어 {prev.glossaryCount} → 통합 용어 {prev.terms.length} · 제거한 쪽 번호 {prev.pageMarkers}</p>
            {prev.warnings.length > 0 && <details className="mt-2" open={prev.warnings.length < 8}><summary className="cursor-pointer text-warn">확인할 경고 {prev.warnings.length}건 (원문은 바꾸지 않았습니다)</summary>
              <ul className="mt-1 list-disc pl-5">{prev.warnings.map((w, k) => <li key={k}><b>{w.where}</b>: {w.message}</li>)}</ul></details>}
            {prev.errors.length === 0 && <button className="btn btn-teal mt-3" onClick={apply}>확인하고 적용</button>}
          </div>
        )}
      </section>

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
          <li>다른 기기로 옮길 때는 JSON 파일을 아래 ‘JSON 다시 가져오기’로 불러오세요.</li>
        </ol>
      </section>

      <section className="card-paper mt-5 space-y-3 p-4">
        <h2 className="font-serif text-lg font-bold">JSON 다시 가져오기</h2>
        <input type="file" accept=".json,application/json" aria-label="JSON 파일" className="field" onChange={(e) => loadJson(e.target.files?.[0] ?? null)} />
        {err && <p role="alert" className="text-sm text-destructive">{err} 기존 자료는 그대로입니다.</p>}
        {json && <div className="text-sm"><p>패턴 {json.patterns.length} · 용어 {json.terms.length} · 나만의 {json.notes.length} ({json.exportedAt?.slice(0, 10)})</p><button className="btn btn-teal mt-2" onClick={applyJson}>확인하고 교체</button></div>}
      </section>
    </>
  );
}
