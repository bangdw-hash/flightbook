import type { Example, ParseWarning, Pattern, Term, WordEntry } from "./types";

/* ---------- decoding ---------- */

export interface DecodeResult {
  text: string;
  encoding: "utf-8" | "utf-8-bom" | "euc-kr";
  note: string;
}

export function decodeTxt(buf: ArrayBuffer | Uint8Array): DecodeResult {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(hasBom ? bytes.subarray(3) : bytes);
    return {
      text: text.replace(/^\uFEFF/, ""),
      encoding: hasBom ? "utf-8-bom" : "utf-8",
      note: hasBom ? "UTF-8 (BOM 포함)으로 읽었습니다." : "UTF-8로 읽었습니다.",
    };
  } catch {
    const text = new TextDecoder("euc-kr").decode(bytes);
    return {
      text,
      encoding: "euc-kr",
      note: "UTF-8로 읽을 수 없어 EUC-KR(CP949)로 다시 읽었습니다. 글자가 깨졌다면 파일을 UTF-8로 저장해 다시 불러오세요.",
    };
  }
}

/* ---------- helpers ---------- */

const PAGE_MARKER = /^\s*-\s*\d+\s*-\s*$/;
const HANGUL = /[\uAC00-\uD7A3\u3131-\u318E]/;
const ARTIFACT = /[\u{1F100}-\u{1F1FF}\uFFFD\u25A1]/u;
const NUMBERED = /^(\d{3})\s+(.*)$/;

export function canonicalTerm(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

export function aliasesFor(term: string): string[] {
  const out = new Set<string>();
  const t = term.trim();
  if (t.includes("/")) t.split("/").forEach((p) => p.trim() && out.add(p.trim()));
  const paren = t.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (paren && !HANGUL.test(paren[2])) {
    out.add(paren[1].trim());
    out.add(paren[2].trim());
  }
  out.delete(t);
  return [...out].filter(Boolean);
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function splitMeanings(ko: string): string[] {
  return uniq(
    ko
      .split(/\s*[;,]\s*/)
      .map((m) => m.trim())
      .filter(Boolean),
  );
}

export function splitWord(raw: string): WordEntry {
  const text = raw.replace(/^⬩\s*/, "").trim();
  const idx = text.search(HANGUL);
  if (idx < 0) return { raw: text, en: text, ko: "" };
  const en = text.slice(0, idx).replace(/[\s:：\-–—=]+$/, "").trim();
  return { raw: text, en, ko: text.slice(idx).trim() };
}

/* ---------- patterns ---------- */

export interface PatternParseResult {
  patterns: Pattern[];
  warnings: ParseWarning[];
  pageMarkers: number;
}

export function parsePatterns(input: string): PatternParseResult {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const re = /^Pattern\s+(\d{3})\s*$/gm;
  const heads: { id: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) heads.push({ id: m[1], start: m.index, end: m.index + m[0].length });

  const warnings: ParseWarning[] = [];
  const patterns: Pattern[] = [];
  let pageMarkers = 0;
  const seen = new Set<string>();

  heads.forEach((h, i) => {
    const where = `Pattern ${h.id}`;
    if (seen.has(h.id)) warnings.push({ where, message: "같은 패턴 번호가 두 번 이상 나옵니다." });
    seen.add(h.id);
    const body = text.slice(h.end, i + 1 < heads.length ? heads[i + 1].start : text.length);
    const lines: string[] = [];
    for (const l of body.split("\n")) {
      if (PAGE_MARKER.test(l)) {
        pageMarkers++;
        continue;
      }
      lines.push(l.trimEnd());
    }
    lines.forEach((l) => {
      if (ARTIFACT.test(l))
        warnings.push({ where, message: `추출 잔여 문자로 보이는 기호가 있습니다(원문 유지): “${l.trim().slice(0, 60)}”` });
    });

    const wIdx = lines.findIndex((l) => /^\s*\[Words\s*&\s*Phrases?\]\s*$/i.test(l));
    const tIdx = lines.findIndex((l) => /^\s*\[Translation\]\s*$/i.test(l));
    const preEnd = [wIdx, tIdx].filter((x) => x >= 0).sort((a, b) => a - b)[0] ?? lines.length;
    const pre = lines.slice(0, preEnd).filter((l) => l.trim());
    if (wIdx < 0) warnings.push({ where, message: "[Words & Phrase] 구역을 찾지 못했습니다." });
    if (tIdx < 0) warnings.push({ where, message: "[Translation] 구역을 찾지 못했습니다." });

    const title = (pre[0] ?? "").trim();
    const meaning = (pre[1] ?? "").trim();
    if (!title) warnings.push({ where, message: "영어 제목 줄이 비어 있습니다." });
    const usage: string[] = [];
    const examples: { num: string; en: string }[] = [];
    let last: "usage" | "example" | null = null;
    for (const raw of pre.slice(2)) {
      const l = raw.trim();
      const num = l.match(NUMBERED);
      if (num) {
        examples.push({ num: num[1], en: num[2].trim() });
        last = "example";
      } else if (/^[∙·•]/.test(l)) {
        usage.push(l);
        last = "usage";
      } else if (last === "example") {
        examples[examples.length - 1].en += " " + l;
      } else if (last === "usage") {
        usage[usage.length - 1] += " " + l;
      } else {
        usage.push(l);
        last = "usage";
      }
    }

    const words: WordEntry[] = [];
    if (wIdx >= 0) {
      const end = tIdx > wIdx ? tIdx : lines.length;
      let cur: string | null = null;
      for (const raw of lines.slice(wIdx + 1, end)) {
        const l = raw.trim();
        if (!l) continue;
        if (l.startsWith("⬩")) {
          if (cur !== null) words.push(splitWord(cur));
          cur = l;
        } else if (cur !== null) cur += " " + l;
        else warnings.push({ where, message: `⬩ 없이 시작하는 어휘 줄을 건너뛰지 않고 확인이 필요합니다: “${l.slice(0, 40)}”` });
      }
      if (cur !== null) words.push(splitWord(cur));
      words.forEach((w) => {
        if (!w.ko) warnings.push({ where, message: `어휘 “${w.raw}”에서 한국어 뜻을 찾지 못했습니다.` });
      });
    }

    const ko = new Map<string, string>();
    if (tIdx >= 0) {
      const end = wIdx > tIdx ? wIdx : lines.length;
      let curNum: string | null = null;
      for (const raw of lines.slice(tIdx + 1, end)) {
        const l = raw.trim();
        if (!l) continue;
        const num = l.match(NUMBERED);
        if (num) {
          curNum = num[1];
          ko.set(curNum, num[2].trim());
        } else if (curNum) ko.set(curNum, ko.get(curNum) + " " + l);
        else warnings.push({ where, message: `번호 없는 번역 줄: “${l.slice(0, 40)}”` });
      }
    }

    const exOut: Example[] = examples.map((e) => {
      if (!ko.has(e.num)) warnings.push({ where, message: `예문 ${e.num}에 짝이 되는 번역이 없습니다.` });
      return { num: e.num, en: e.en, ko: ko.get(e.num) ?? "" };
    });
    for (const k of ko.keys())
      if (!examples.some((e) => e.num === k))
        warnings.push({ where, message: `번역 ${k}에 짝이 되는 영어 예문이 없습니다.` });

    patterns.push({ id: h.id, title, meaning, usage, examples: exOut, words });
  });

  return { patterns, warnings, pageMarkers };
}

/* ---------- glossary ---------- */

export interface GlossaryEntry {
  term: string;
  label: string;
  definition: string;
}

export interface GlossaryParseResult {
  entries: GlossaryEntry[];
  warnings: ParseWarning[];
  pageMarkers: number;
}

export function parseGlossary(input: string): GlossaryParseResult {
  const lines = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const entries: GlossaryEntry[] = [];
  const warnings: ParseWarning[] = [];
  let pageMarkers = 0;
  let cur: { term: string; label: string; def: string[] } | null = null;
  let skipped = 0;
  const flush = () => {
    if (!cur) return;
    while (cur.def.length && !cur.def[cur.def.length - 1].trim()) cur.def.pop();
    while (cur.def.length && !cur.def[0].trim()) cur.def.shift();
    entries.push({ term: cur.term, label: cur.label, definition: cur.def.join("\n") });
  };
  for (const rawLine of lines) {
    const l = rawLine.trimEnd();
    if (PAGE_MARKER.test(l)) {
      pageMarkers++;
      continue;
    }
    if (l.trim().startsWith("⬩")) {
      flush();
      const head = l.trim().replace(/^⬩\s*/, "");
      let term = head;
      let label = "";
      const pm = head.match(/^(.*?)\s*\(([^()]*[\uAC00-\uD7A3][^()]*)\)\s*$/);
      if (pm) {
        term = pm[1].trim();
        label = pm[2].trim();
      } else {
        const idx = head.search(HANGUL);
        if (idx > 0) {
          term = head.slice(0, idx).trim();
          label = head.slice(idx).trim();
        }
      }
      if (ARTIFACT.test(head)) warnings.push({ where: term, message: "추출 잔여 문자로 보이는 기호가 있습니다(원문 유지)." });
      if (!term) warnings.push({ where: head, message: "영어 표제어를 찾지 못했습니다." });
      cur = { term, label, def: [] };
    } else if (cur) {
      if (ARTIFACT.test(l)) warnings.push({ where: cur.term, message: `설명에 추출 잔여 문자로 보이는 기호가 있습니다: “${l.trim().slice(0, 50)}”` });
      cur.def.push(l.trim() ? l.replace(/^\s+/, (s) => (s.length >= 2 ? "  " : "")) : "");
    } else if (l.trim()) skipped++;
  }
  flush();
  if (skipped) warnings.push({ where: "파일 앞부분", message: `첫 ⬩ 항목 이전의 ${skipped}줄은 용어로 읽지 않았습니다.` });
  return { entries, warnings, pageMarkers };
}

/* ---------- merge ---------- */

export function mergeTerms(glossary: GlossaryEntry[], patterns: Pattern[]): Term[] {
  const map = new Map<string, Term>();
  let n = 0;
  const get = (term: string): Term => {
    const key = canonicalTerm(term);
    let t = map.get(key);
    if (!t) {
      t = {
        id: `t${++n}`,
        key,
        term: term.trim().replace(/\s+/g, " "),
        aliases: aliasesFor(term),
        label: "",
        meanings: [],
        definition: "",
        sources: [],
        patternIds: [],
        raws: [],
      };
      map.set(key, t);
    }
    return t;
  };
  for (const g of glossary) {
    if (!g.term) continue;
    const t = get(g.term);
    if (!t.sources.includes("glossary")) t.sources.push("glossary");
    if (g.label) {
      if (!t.label) t.label = g.label;
      else if (t.label !== g.label && !t.meanings.includes(g.label)) t.meanings.push(g.label);
    }
    if (g.definition && !t.definition.split("\n\n").includes(g.definition))
      t.definition = t.definition ? `${t.definition}\n\n${g.definition}` : g.definition;
  }
  for (const p of patterns) {
    for (const w of p.words) {
      if (!w.en) continue;
      const t = get(w.en);
      if (!t.sources.includes("pattern")) t.sources.push("pattern");
      if (!t.patternIds.includes(p.id)) t.patternIds.push(p.id);
      if (!t.raws.includes(w.raw)) t.raws.push(w.raw);
      for (const mm of splitMeanings(w.ko)) if (!t.meanings.includes(mm) && mm !== t.label) t.meanings.push(mm);
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function shortMeaning(t: Term): string {
  return uniq([t.label, ...t.meanings].filter(Boolean)).join(", ");
}

/* ---------- combined ---------- */

export interface ImportPreview {
  patterns: Pattern[];
  terms: Term[];
  glossaryCount: number;
  wordCount: number;
  exampleCount: number;
  pageMarkers: number;
  warnings: ParseWarning[];
  errors: string[];
}

export function buildImport(patternText: string | null, glossaryText: string | null): ImportPreview {
  const errors: string[] = [];
  const pr = patternText != null ? parsePatterns(patternText) : { patterns: [], warnings: [], pageMarkers: 0 };
  const gr = glossaryText != null ? parseGlossary(glossaryText) : { entries: [], warnings: [], pageMarkers: 0 };
  if (patternText != null && pr.patterns.length === 0)
    errors.push(
      "패턴영어 TXT에서 패턴을 찾지 못했습니다. 각 패턴은 한 줄에 ‘Pattern 001’처럼 Pattern + 공백 + 세 자리 숫자만 있어야 합니다.",
    );
  if (glossaryText != null && gr.entries.length === 0)
    errors.push("용어 파트 TXT에서 용어를 찾지 못했습니다. 각 용어 줄은 ‘⬩ Torque Wrench (토크 렌치)’처럼 ⬩ 기호로 시작해야 합니다.");
  if (patternText == null && glossaryText == null) errors.push("파일을 하나 이상 선택하세요.");
  const terms = mergeTerms(gr.entries, pr.patterns);
  return {
    patterns: pr.patterns,
    terms,
    glossaryCount: gr.entries.length,
    wordCount: pr.patterns.reduce((s, p) => s + p.words.length, 0),
    exampleCount: pr.patterns.reduce((s, p) => s + p.examples.length, 0),
    pageMarkers: pr.pageMarkers + gr.pageMarkers,
    warnings: [...pr.warnings, ...gr.warnings],
    errors,
  };
}
