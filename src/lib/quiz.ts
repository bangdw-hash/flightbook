import { canonicalTerm, shortMeaning } from "./parser";
import type { Dataset, Note } from "./types";

export type QuizType = "meaning" | "blank" | "short";
export type QuizScope = "pattern" | "glossary" | "personal";

export interface QuizItem {
  term: string;
  aliases: string[];
  meaning: string;
  sentences: string[];
  ref: string;
}

export interface Question {
  type: QuizType;
  prompt: string;
  hint?: string;
  choices?: string[];
  answer: string;
  accepted: string[];
  ref: string;
}

export function normalizeAnswer(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function quizItems(ds: Dataset | null, notes: Note[], scope: QuizScope): QuizItem[] {
  if (scope === "personal")
    return notes
      .filter((n) => n.term.trim() && n.meaning.trim())
      .map((n) => ({ term: n.term.trim(), aliases: [], meaning: n.meaning.trim(), sentences: n.example ? [n.example] : [], ref: "나만의 용어집" }));
  if (!ds) return [];
  if (scope === "pattern") {
    const out: QuizItem[] = [];
    const seen = new Set<string>();
    for (const p of ds.patterns)
      for (const w of p.words) {
        const k = canonicalTerm(w.en);
        if (!w.en || !w.ko || seen.has(k)) continue;
        seen.add(k);
        const t = ds.terms.find((x) => x.key === k);
        out.push({
          term: w.en,
          aliases: t?.aliases ?? [],
          meaning: w.ko,
          sentences: ds.patterns.filter((pp) => t?.patternIds.includes(pp.id) || pp.id === p.id).flatMap((pp) => pp.examples.map((e) => e.en)),
          ref: `Pattern ${p.id}`,
        });
      }
    return out;
  }
  return ds.terms
    .filter((t) => t.sources.includes("glossary") && shortMeaning(t))
    .map((t) => ({
      term: t.term,
      aliases: t.aliases,
      meaning: shortMeaning(t),
      sentences: t.definition.split("\n").map((l) => l.replace(/^[∙·•\s]*(예문\(시연\):)?\s*/, "")),
      ref: "교재 용어집",
    }));
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Returns the sentence with the term blanked, or null if not a meaningful blank. */
export function makeBlank(sentence: string, term: string): string | null {
  if (term.length < 3 || !/[A-Za-z]/.test(sentence)) return null;
  const re = new RegExp(`(^|[^A-Za-z])(${escapeRe(term)})(?![A-Za-z])`, "i");
  const m = sentence.match(re);
  if (!m) return null;
  const blanked = sentence.replace(re, (_a, pre) => `${pre}_____`);
  if (blanked.replace(/_____/, "").replace(/[^A-Za-z]/g, "").length < 6) return null;
  return blanked;
}

function shuffle<T>(a: T[], rnd: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function pickDistractors(pool: string[], correct: string, n: number, rnd: () => number): string[] {
  const c = normalizeAnswer(correct);
  const seen = new Set([c]);
  const out: string[] = [];
  for (const p of shuffle(pool, rnd)) {
    const k = normalizeAnswer(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length === n) break;
  }
  return out;
}

export function buildQuiz(items: QuizItem[], type: QuizType, max = 5, rnd: () => number = Math.random): Question[] {
  const qs: Question[] = [];
  for (const it of shuffle(items, rnd)) {
    if (qs.length >= max) break;
    if (type === "meaning") {
      const d = pickDistractors(items.map((x) => x.meaning), it.meaning, 3, rnd);
      if (d.length < 2) continue;
      qs.push({ type, prompt: it.term, choices: shuffle([it.meaning, ...d], rnd), answer: it.meaning, accepted: [it.meaning], ref: it.ref });
    } else if (type === "blank") {
      let blank: string | null = null;
      for (const s of it.sentences) if ((blank = makeBlank(s, it.term))) break;
      if (!blank) continue;
      const d = pickDistractors(items.map((x) => x.term), it.term, 3, rnd);
      if (d.length < 2) continue;
      qs.push({ type, prompt: blank, hint: it.meaning, choices: shuffle([it.term, ...d], rnd), answer: it.term, accepted: [it.term], ref: it.ref });
    } else {
      qs.push({ type, prompt: it.meaning, answer: it.term, accepted: [it.term, ...it.aliases], ref: it.ref });
    }
  }
  return qs;
}

export function isCorrect(q: Question, given: string): boolean {
  const g = normalizeAnswer(given);
  return g.length > 0 && q.accepted.some((a) => normalizeAnswer(a) === g);
}
