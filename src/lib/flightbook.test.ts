import { describe, expect, it } from "vitest";
import { buildImport, canonicalTerm, decodeTxt, parseGlossary, parsePatterns, splitWord } from "./parser";
import { csvCell, examplesCsv, parseExportJson, termsCsv, toJson } from "./export";
import { buildQuiz, isCorrect, makeBlank, quizItems } from "./quiz";
import { demoDataset, demoNotes } from "./demo";

const FIXTURE = `Pattern 012
Make sure the ~ is secured.
~이 고정되었는지 확인하세요.
∙ 시연용 사용법 설명이
이어지는 줄입니다.
101 Make sure the cover is secured before
you leave the bench.
102 Make sure the 🅓 tray is secured.
- 3 -
103 This line has no translation.
[Words & Phrase]
⬩ cover 덮개, 커버
⬩ Torque Wrench 토크 렌치
⬩ AOG (Aircraft On Ground) 지상 대기 항공기
[Translation]
101 자리를 뜨기 전에 덮개가 고정되었는지
확인하세요.
102 트레이가 고정되었는지 확인하세요.
104 짝이 없는 번역.

Pattern 013
Hand me the ~.
~ 건네주세요.
105 Hand me the torque  wrench.
[Words & Phrase]
⬩ torque wrench 토크 렌치, 조임 공구
[Translation]
105 토크 렌치 건네주세요.
`;

const GLOSS = `⬩ Torque Wrench (토크 렌치)
조이는 힘을 확인하는 공구.
  ∙ 하위 항목 하나
  ∙ 하위 항목 둘
- 9 -
⬩ Safety Wire/Lock Wire (안전선)
가는 철사.
`;

describe("pattern parser", () => {
  const r = parsePatterns(FIXTURE);
  const p = r.patterns[0];
  it("finds patterns, title, meaning, usage continuation", () => {
    expect(r.patterns.map((x) => x.id)).toEqual(["012", "013"]);
    expect(p.title).toBe("Make sure the ~ is secured.");
    expect(p.meaning).toBe("~이 고정되었는지 확인하세요.");
    expect(p.usage).toEqual(["∙ 시연용 사용법 설명이 이어지는 줄입니다."]);
  });
  it("joins wrapped example and translation lines and pairs by id", () => {
    expect(p.examples[0]).toEqual({
      num: "101",
      en: "Make sure the cover is secured before you leave the bench.",
      ko: "자리를 뜨기 전에 덮개가 고정되었는지 확인하세요.",
    });
  });
  it("strips page markers and keeps artifacts with a warning", () => {
    expect(r.pageMarkers).toBe(1);
    expect(p.examples.map((e) => e.en).join(" ")).not.toContain("- 3 -");
    expect(p.examples[1].en).toContain("🅓");
    expect(r.warnings.some((w) => w.message.includes("추출 잔여"))).toBe(true);
  });
  it("warns about unmatched ids both ways", () => {
    expect(r.warnings.some((w) => w.message.includes("103"))).toBe(true);
    expect(r.warnings.some((w) => w.message.includes("번역 104"))).toBe(true);
  });
  it("splits words at the first Korean character", () => {
    expect(splitWord("⬩ AOG (Aircraft On Ground) 지상 대기 항공기")).toEqual({
      raw: "AOG (Aircraft On Ground) 지상 대기 항공기",
      en: "AOG (Aircraft On Ground)",
      ko: "지상 대기 항공기",
    });
  });
});

describe("glossary parser and merge", () => {
  const g = parseGlossary(GLOSS);
  it("reads headword, label, multi-line definition with nested list", () => {
    expect(g.entries[0].term).toBe("Torque Wrench");
    expect(g.entries[0].label).toBe("토크 렌치");
    expect(g.entries[0].definition).toBe("조이는 힘을 확인하는 공구.\n  ∙ 하위 항목 하나\n  ∙ 하위 항목 둘");
    expect(g.pageMarkers).toBe(1);
  });
  it("merges the same term from glossary and two patterns once", () => {
    const r = buildImport(FIXTURE, GLOSS);
    const tw = r.terms.filter((t) => t.key === "torque wrench");
    expect(tw).toHaveLength(1);
    expect(tw[0].sources.sort()).toEqual(["glossary", "pattern"]);
    expect(tw[0].patternIds).toEqual(["012", "013"]);
    expect(tw[0].definition).toContain("하위 항목 둘");
    expect(tw[0].meanings).toContain("조임 공구");
    expect(tw[0].meanings).not.toContain("토크 렌치");
    const sw = r.terms.find((t) => t.term === "Safety Wire/Lock Wire")!;
    expect(sw.aliases).toEqual(["Safety Wire", "Lock Wire"]);
    expect(r.terms.some((t) => t.key === "cover")).toBe(true);
  });
  it("canonicalizes case, whitespace and paren spacing", () => {
    expect(canonicalTerm("  AOG ( Aircraft  On Ground )")).toBe("aog (aircraft on ground)");
  });
  it("reports concrete errors when format is wrong", () => {
    const r = buildImport("no headings here", "no bullets");
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toContain("Pattern 001");
  });
});

describe("decoding", () => {
  it("handles BOM and EUC-KR fallback", () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("Pattern 001")]);
    expect(decodeTxt(bom)).toMatchObject({ text: "Pattern 001", encoding: "utf-8-bom" });
    const euc = new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb]); // "한글" in EUC-KR
    expect(decodeTxt(euc)).toMatchObject({ text: "한글", encoding: "euc-kr" });
  });
});

describe("export", () => {
  it("quotes comma, quote and newline", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell("plain")).toBe("plain");
  });
  it("writes BOM CSV and round-trips JSON", () => {
    const ds = demoDataset();
    const csv = examplesCsv(ds.patterns);
    expect(csv.startsWith("\uFEFFpattern_id,example_no,english,korean\r\n")).toBe(true);
    expect(termsCsv(ds.terms)).toContain("교재 용어집 | 패턴 어휘");
    const back = parseExportJson(toJson(ds, demoNotes()));
    expect(back.error).toBeUndefined();
    expect(back.data!.patterns).toEqual(ds.patterns);
    expect(back.data!.notes).toHaveLength(5);
    expect(parseExportJson('{"app":"other"}').error).toBeTruthy();
  });
});

describe("quiz", () => {
  const ds = demoDataset();
  it("demo has >=5 usable questions per type and scope", () => {
    for (const scope of ["pattern", "glossary", "personal"] as const)
      for (const type of ["meaning", "blank", "short"] as const) {
        const qs = buildQuiz(quizItems(ds, demoNotes(), scope), type);
        expect(qs.length, `${scope}/${type}`).toBe(5);
        for (const q of qs) if (q.choices) expect(new Set(q.choices).size).toBe(q.choices.length);
      }
  });
  it("blank requires the term as a whole word", () => {
    expect(makeBlank("The hangar door is open.", "hangar")).toBe("The _____ door is open.");
    expect(makeBlank("Hangars are big buildings.", "hangar")).toBeNull();
  });
  it("short answer normalizes case and whitespace", () => {
    const q = { type: "short" as const, prompt: "", answer: "Torque Wrench", accepted: ["Torque Wrench"], ref: "" };
    expect(isCorrect(q, "  torque   WRENCH ")).toBe(true);
    expect(isCorrect(q, "torque")).toBe(false);
  });
});
