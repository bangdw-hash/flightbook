import { Link } from "@tanstack/react-router";
import { BookOpen, HardDrive, Plane, Upload } from "lucide-react";
import type { ReactNode } from "react";
import type { TermSource } from "@/lib/types";

export function SourceBadge({ s }: { s: TermSource | "note" | "patternItem" }) {
  const map = {
    glossary: ["교재 용어집", "bg-ink text-ink-foreground"],
    pattern: ["패턴 어휘", "bg-teal-soft text-accent-foreground"],
    patternItem: ["패턴", "bg-secondary text-secondary-foreground border border-border"],
    note: ["나만의", "bg-warn-soft text-warn"],
  } as const;
  const [label, cls] = map[s];
  return <span className={`chip ${cls}`}>{label}</span>;
}

export function DemoBadge() {
  return <span className="chip bg-warn-soft text-warn">시연 데이터</span>;
}

export function PageTitle({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-input bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[40px] rounded-md px-3 text-sm font-semibold transition-colors ${
            value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LocalOnly({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-teal-soft px-3 py-2 text-sm text-accent-foreground">
      <HardDrive className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        {children ??
          "로그인하면 내 기록을 Supabase에 저장합니다. 로그인 없이 보는 시연 자료는 화면을 새로 열면 초기화됩니다."}
      </span>
    </p>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card-paper paper-lines px-5 py-10 text-center">
      <Plane className="mx-auto h-8 w-8 text-teal" aria-hidden />
      <h2 className="mt-3 font-serif text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function NoDataState() {
  return (
    <EmptyState
      title="아직 불러온 자료가 없습니다"
      body="시연 데이터로 둘러보거나 교재 TXT 파일을 불러오세요."
      action={
        <>
          <Link to="/" className="btn btn-outline">
            <BookOpen className="h-4 w-4" aria-hidden /> 처음 화면
          </Link>
          <Link to="/data" className="btn btn-primary">
            <Upload className="h-4 w-4" aria-hidden /> 교재 TXT 불러오기
          </Link>
        </>
      }
    />
  );
}

export function FlightArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} aria-hidden fill="none">
      <path d="M10 140 C 90 130, 140 60, 300 30" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" className="flight-path" />
      <path d="M10 150 C 120 150, 200 110, 310 90" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 6" />
      <circle cx="10" cy="140" r="3" fill="currentColor" fillOpacity="0.6" />
      <g transform="translate(288 22) rotate(-18)">
        <path d="M0 8 L22 6 L30 0 L33 1 L28 7 L38 7 L41 4 L43 5 L41 9 L43 13 L41 14 L38 11 L28 11 L33 17 L30 18 L22 12 L0 10 Z" fill="currentColor" fillOpacity="0.9" />
      </g>
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={20 + i * 50} y1="0" x2={20 + i * 50} y2="160" stroke="currentColor" strokeOpacity="0.06" />
      ))}
    </svg>
  );
}
