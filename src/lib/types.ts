export interface Example {
  num: string;
  en: string;
  ko: string;
}

export interface WordEntry {
  raw: string;
  en: string;
  ko: string;
}

export interface Pattern {
  id: string;
  title: string;
  meaning: string;
  usage: string[];
  examples: Example[];
  words: WordEntry[];
}

export type TermSource = "glossary" | "pattern";

export interface Term {
  id: string;
  key: string;
  term: string;
  aliases: string[];
  label: string;
  meanings: string[];
  definition: string;
  sources: TermSource[];
  patternIds: string[];
  raws: string[];
}

export interface Note {
  shared?: boolean;
  id: string;
  term: string;
  meaning: string;
  example: string;
  memo: string;
  updatedAt: string;
}

export type DatasetOrigin = "demo" | "import";

export interface Dataset {
  origin: DatasetOrigin;
  label: string;
  patterns: Pattern[];
  terms: Term[];
}

export interface ParseWarning {
  where: string;
  message: string;
}
