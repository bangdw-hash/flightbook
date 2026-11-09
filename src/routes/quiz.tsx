import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { buildQuiz, isCorrect, quizItems, type Question, type QuizScope, type QuizType } from "@/lib/quiz";
import { PageTitle, Segmented } from "@/components/fb";

export const Route = createFileRoute("/quiz")({
  head: () => ({ meta: [{ title: "학습 테스트 · 플라이트북" }, { name: "description", content: "뜻 고르기·빈칸·단답 테스트" }, { property: "og:title", content: "학습 테스트" }, { property: "og:description", content: "세 가지 학습 테스트" }] }),
  component: Quiz,
});

function Quiz() {
  const { dataset, notes } = useStore();
  const [type, setType] = useState<QuizType>("meaning");
  const [scope, setScope] = useState<QuizScope>("pattern");
  const [qs, setQs] = useState<Question[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const start = () => {
    const q = buildQuiz(quizItems(dataset, notes, scope), type, 5);
    if (!q.length) { setMsg("이 범위에서 만들 수 있는 문제가 없습니다. 로그인 상태를 확인하거나 다른 범위를 고르세요."); return; }
    setMsg(""); setQs(q); setI(0); setAnswers([]); setInput("");
  };
  const answer = (a: string) => { setAnswers([...answers, a]); setInput(""); setI(i + 1); };

  if (qs && i >= qs.length) {
    const score = qs.filter((q, k) => isCorrect(q, answers[k])).length;
    return (
      <>
        <PageTitle title={`결과 ${score} / ${qs.length}`} />
        <ul className="space-y-2">{qs.map((q, k) => { const ok = isCorrect(q, answers[k]); return (
          <li key={k} className="card-paper p-3 text-sm"><p className="font-semibold">{q.prompt}</p>
            <p className={ok ? "text-success" : "text-destructive"}>{ok ? "정답" : "오답"} · 내 답: {answers[k] || "(빈칸)"}</p>
            {!ok && <p>정답: <b>{q.answer}</b> <span className="text-muted-foreground">({q.ref})</span></p>}</li>); })}</ul>
        <button className="btn btn-primary mt-4" onClick={() => setQs(null)}>다시 설정</button>
      </>
    );
  }
  if (qs) {
    const q = qs[i];
    return (
      <>
        <div className="mb-3 h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={i} aria-valuemax={qs.length}><div className="h-2 rounded-full bg-teal" style={{ width: `${(i / qs.length) * 100}%` }} /></div>
        <p className="text-sm text-muted-foreground">문제 {i + 1} / {qs.length}</p>
        <div className="card-paper mt-2 p-5">
          <p className="text-lg font-semibold">{q.prompt}</p>
          {q.hint && <p className="mt-1 text-sm text-muted-foreground">뜻: {q.hint}</p>}
          {q.choices ? <div className="mt-4 grid gap-2">{q.choices.map((c) => <button key={c} className="btn btn-outline justify-start text-left" onClick={() => answer(c)}>{c}</button>)}</div> : (
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); answer(input); }}>
              <input autoFocus aria-label="영어 답" className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="영어 용어 입력" />
              <button className="btn btn-primary">제출</button>
            </form>
          )}
        </div>
      </>
    );
  }
  return (
    <>
      <PageTitle title="학습 테스트" sub="최대 5문제 · 유효한 자료로만 출제" />
      <div className="card-paper space-y-4 p-4">
        <div><p className="mb-1 text-sm font-semibold">유형</p><Segmented label="유형" value={type} onChange={setType} options={[{ value: "meaning", label: "뜻 고르기" }, { value: "blank", label: "빈칸 채우기" }, { value: "short", label: "단답 입력" }]} /></div>
        <div><p className="mb-1 text-sm font-semibold">범위</p><Segmented label="범위" value={scope} onChange={setScope} options={[{ value: "pattern", label: "패턴" }, { value: "glossary", label: "용어집" }, { value: "personal", label: "나만의" }]} /></div>
        <button className="btn btn-teal" onClick={start}>시작</button>
        {msg && <p role="alert" className="text-sm text-warn">{msg}</p>}
      </div>
    </>
  );
}
