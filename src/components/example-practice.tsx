import { useState } from "react";
import { SpeakingPractice } from "./speaking-practice";
import type { Example } from "@/lib/types";

export function ExamplePractice({ examples, showTranslation }: { examples: Example[]; showTranslation: boolean }) {
  const [index, setIndex] = useState<number | null>(null);
  const [completed, setCompleted] = useState<number[]>([]);
  const example = index === null ? undefined : examples[index];
  if (examples.length === 0) return null;

  return (
    <section className="card-paper mt-4 space-y-3 p-4" aria-labelledby="example-practice-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="example-practice-title" className="font-serif text-lg font-bold">예문 순서대로 따라 말하기</h2>
        <button type="button" className="btn btn-outline text-sm" aria-expanded={Boolean(example)}
          onClick={() => { setIndex(example ? null : 0); setCompleted([]); }}>
          {example ? "연습 닫기" : "예문 연습 시작"}
        </button>
      </div>
      {index !== null && example && (
        <>
          <p className="text-sm text-muted-foreground" role="status">
            예문 {index + 1} / {examples.length} · 연습 완료 {completed.length} / {examples.length}
          </p>
          <p lang="en" className="font-semibold">{example.en}</p>
          {showTranslation && example.ko && <p className="text-sm text-muted-foreground">{example.ko}</p>}
          <SpeakingPractice key={index} text={example.en} onComplete={() => {
            setCompleted((done) => done.includes(index) ? done : [...done, index]);
          }} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline text-sm" disabled={index === 0}
              onClick={() => setIndex(index - 1)}>이전 예문</button>
            <button type="button" className="btn btn-outline text-sm" disabled={index === examples.length - 1}
              onClick={() => setIndex(index + 1)}>다음 예문</button>
          </div>
        </>
      )}
    </section>
  );
}
