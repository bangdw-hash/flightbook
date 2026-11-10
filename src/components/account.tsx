import { useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function Account() {
  const { user } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const result = signup
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
        : await supabase.auth.signInWithPassword({ email, password });
      setMessage(result.error?.message ?? (result.data.session ? "로그인했습니다." : "이메일에서 가입 확인 링크를 열어 주세요."));
      if (!result.error) setPassword("");
    } finally {
      setBusy(false);
    }
  }
  if (!supabase) return <p className="text-sm">계정 서비스에 연결하지 못했습니다.</p>;
  if (user) return <div className="flex flex-wrap items-center gap-2 text-sm"><span>{user.email}</span><button className="btn btn-outline" onClick={async () => { const result = await supabase?.auth.signOut(); setMessage(result?.error?.message ?? ""); }}>로그아웃</button>{message && <span role="status">{message}</span>}</div>;
  return <details className="text-sm">
    <summary className="cursor-pointer font-semibold">로그인 / 회원가입</summary>
    <form onSubmit={submit} className="mt-2 flex flex-wrap gap-2">
      <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="이메일" placeholder="이메일" autoComplete="email" />
      <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} aria-label="비밀번호" placeholder="비밀번호" autoComplete={signup ? "new-password" : "current-password"} />
      <button className="btn btn-primary" disabled={busy}>{signup ? "회원가입" : "로그인"}</button>
      <button type="button" className="btn btn-outline" onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "로그인으로 전환" : "회원가입으로 전환"}</button>
    </form>
    {message && <p role="status" className="mt-2">{message}</p>}
  </details>;
}
