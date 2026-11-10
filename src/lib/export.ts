import type { Dataset, Note, Pattern, Term } from "./types";

export const EXPORT_APP = "aviation-english-flightbook";
export const EXPORT_VERSION = 1;

export interface ExportFile {
  app: typeof EXPORT_APP;
  version: number;
  exportedAt: string;
  origin: Dataset["origin"] | "textbook" | null;
  label: string;
  patterns: Pattern[];
  terms: Term[];
  notes: Note[];
}

export function toJson(ds: Dataset | null, notes: Note[]): string {
  const f: ExportFile = {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    origin: ds?.origin ?? null,
    label: ds?.label ?? "",
    patterns: ds?.patterns ?? [],
    terms: ds?.terms ?? [],
    notes,
  };
  return JSON.stringify(f, null, 2);
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

export function parseExportJson(text: string): { data?: ExportFile; error?: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return { error: "JSON 형식이 올바르지 않습니다." };
  }
  const o = raw as Partial<ExportFile>;
  if (!o || o.app !== EXPORT_APP) return { error: "이 앱에서 내보낸 JSON 파일이 아닙니다(app 값 불일치)." };
  if (!Array.isArray(o.patterns) || !Array.isArray(o.terms) || !Array.isArray(o.notes))
    return { error: "patterns / terms / notes 목록이 필요합니다." };
  for (const p of o.patterns)
    if (!isStr(p?.id) || !isStr(p?.title) || !Array.isArray(p?.examples) || !Array.isArray(p?.words) || !isStrArr(p?.usage))
      return { error: `패턴 항목 형식이 올바르지 않습니다: ${JSON.stringify(p).slice(0, 60)}` };
  for (const t of o.terms)
    if (!isStr(t?.id) || !isStr(t?.term) || !isStrArr(t?.meanings) || !isStrArr(t?.patternIds) || !isStrArr(t?.sources))
      return { error: `용어 항목 형식이 올바르지 않습니다: ${JSON.stringify(t).slice(0, 60)}` };
  for (const n of o.notes) if (!isStr(n?.id) || !isStr(n?.term)) return { error: "나만의 용어 항목 형식이 올바르지 않습니다." };
  return { data: o as ExportFile };
}

export function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: (string | number)[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function patternsCsv(ps: Pattern[]): string {
  return csv([["pattern_id", "title", "meaning", "usage"], ...ps.map((p) => [p.id, p.title, p.meaning, p.usage.join("\n")])]);
}

export function examplesCsv(ps: Pattern[]): string {
  return csv([
    ["pattern_id", "example_no", "english", "korean"],
    ...ps.flatMap((p) => p.examples.map((e) => [p.id, e.num, e.en, e.ko])),
  ]);
}

export function termsCsv(ts: Term[]): string {
  return csv([
    ["term", "aliases", "label", "meanings", "definition", "sources", "pattern_ids", "raw_words"],
    ...ts.map((t) => [
      t.term,
      t.aliases.join(" | "),
      t.label,
      t.meanings.join(" | "),
      t.definition,
      t.sources.map((s) => (s === "glossary" ? "교재 용어집" : "패턴 어휘")).join(" | "),
      t.patternIds.join(" | "),
      t.raws.join("\n"),
    ]),
  ]);
}

export function notesCsv(ns: Note[]): string {
  return csv([["term", "meaning", "example", "memo", "updated_at"], ...ns.map((n) => [n.term, n.meaning, n.example, n.memo, n.updatedAt])]);
}

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
