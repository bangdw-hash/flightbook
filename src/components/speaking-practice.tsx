import { useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { pronunciationWords } from "@/lib/pronunciation";

type Phase = "idle" | "listening" | "repeat" | "done";
let stopActive: (() => void) | null = null;

export function SpeakingPractice({ text }: { text: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState("");
  const [ipa, setIpa] = useState<ReturnType<typeof pronunciationWords> | null>(null);
  const [showIpa, setShowIpa] = useState(false);
  const timer = useRef<number | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const ownStop = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
      window.speechSynthesis.cancel();
    }
    if (stopActive === ownStop.current) stopActive = null;
  }, []);

  async function toggleIpa() {
    setShowIpa(!showIpa);
    if (showIpa || ipa) return;
    try {
      const { dictionary } = await import("cmu-pronouncing-dictionary");
      setIpa(pronunciationWords(text, dictionary));
    } catch {
      setShowIpa(false);
      setMessage("발음기호를 불러오지 못했습니다. 다시 시도해 주세요.");
    }
  }

  function stop() {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
      utterance.current = null;
      window.speechSynthesis.cancel();
    }
    if (stopActive === stop) stopActive = null;
    setPhase("idle");
    setRemaining(0);
  }

  function play(rate: number) {
    setMessage("");
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setMessage("이 브라우저에서는 영어 음성을 재생할 수 없습니다.");
      return;
    }
    stopActive?.();
    const synth = window.speechSynthesis;
    const speech = new SpeechSynthesisUtterance(text.replace(/~/g, " ").trim());
    speech.lang = "en-US";
    speech.rate = rate;
    const voices = synth.getVoices();
    const voice = voices.find((entry) => entry.lang === "en-US" && entry.localService)
      ?? voices.find((entry) => entry.lang === "en-US");
    if (voice) speech.voice = voice;
    let started = performance.now();
    speech.onstart = () => { started = performance.now(); };
    speech.onend = () => {
      if (utterance.current !== speech) return;
      utterance.current = null;
      const length = Math.max(0.5, (performance.now() - started) / 1000);
      const deadline = performance.now() + length * 1000;
      setDuration(length);
      setRemaining(length);
      setPhase("repeat");
      timer.current = window.setInterval(() => {
        const next = Math.max(0, (deadline - performance.now()) / 1000);
        setRemaining(next);
        if (next === 0) {
          if (timer.current !== null) window.clearInterval(timer.current);
          timer.current = null;
          if (stopActive === stop) stopActive = null;
          setPhase("done");
        }
      }, 80);
    };
    speech.onerror = () => {
      if (utterance.current !== speech) return;
      utterance.current = null;
      stop();
      setMessage("영어 음성을 재생하지 못했습니다. 기기의 영어 음성 설정을 확인해 주세요.");
    };
    ownStop.current = stop;
    stopActive = stop;
    utterance.current = speech;
    setPhase("listening");
    synth.speak(speech);
  }

  return <div className="mt-2 space-y-2">
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-outline !min-h-[40px] text-xs" onClick={() => play(1)}>
        <Volume2 className="h-4 w-4" aria-hidden /> 듣고 따라 말하기
      </button>
      <button type="button" className="btn btn-outline !min-h-[40px] text-xs" onClick={() => play(0.75)}>천천히 듣기</button>
      <button type="button" className="btn btn-outline !min-h-[40px] text-xs" aria-expanded={showIpa} onClick={() => void toggleIpa()}>발음기호</button>
      {(phase === "listening" || phase === "repeat") && <button type="button" className="btn btn-outline !min-h-[40px] text-xs" onClick={() => stopActive?.()}><Square className="h-3 w-3" aria-hidden /> 중지</button>}
    </div>
    {showIpa && <div className="rounded border border-border p-2 text-sm">
      <p className="text-xs text-muted-foreground">미국 영어 기준 단어별 IPA · 약어 등 사전에 없는 항목은 미확인으로 표시</p>
      {ipa ? <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{ipa.map(({ word, ipa: value }, index) =>
        <span key={index}><span lang="en">{word}</span> {value ? <span className="font-mono">/{value}/</span> : <span className="text-muted-foreground">미확인</span>}</span>)}</p>
        : <p role="status">발음기호를 불러오는 중…</p>}
    </div>}
    {phase !== "idle" && <p role="status" className="text-sm font-semibold">
      {phase === "listening" ? "영어 음성을 듣고 준비하세요." : phase === "repeat" ? "지금 소리 내어 따라 말해 보세요." : "따라 말하기가 끝났어요. 다시 연습할 수 있습니다."}
    </p>}
    {phase === "repeat" && <div className="flex items-center gap-2 text-sm">
      <progress className="w-36" aria-label="따라 말하기 남은 시간" max={duration} value={remaining} />
      <span>{remaining.toFixed(1)}초 남음</span>
    </div>}
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
  </div>;
}
