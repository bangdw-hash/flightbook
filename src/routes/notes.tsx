import { SpeakingPractice } from "@/components/speaking-practice";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { EmptyState, LocalOnly, PageTitle } from "@/components/fb";
import type { Note } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/notes")({
  head: () => ({ meta: [{ title: "나만의 용어집 · 항공기술영어 가이드북" }, { name: "description", content: "이 브라우저에만 저장되는 개인 용어 노트" }, { property: "og:title", content: "나만의 용어집" }, { property: "og:description", content: "개인 용어 노트" }] }),
  component: Notes,
});

const blank = (): Note => ({ id: "", term: "", meaning: "", example: "", memo: "", updatedAt: "" });

function Notes() {
  const { notes, setNotes, user } = useStore();
  const [draft, setDraft] = useState<Note>(blank());
  const [invite, setInvite] = useState("");
  const [message, setMessage] = useState("");
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  async function changeInvite(remove = false) {
    if (!supabase || !user) return;
    const email = invite.trim().toLowerCase();
    const result = remove
      ? await supabase.from("flightbook_invites").delete().eq("owner_id", user.id).eq("invitee_email", email)
      : await supabase.from("flightbook_invites").insert({ owner_id: user.id, invitee_email: email });
    setMessage(result.error?.message ?? (remove ? "공유 대상에서 제외했습니다." : "공유 대상에 추가했습니다. 상대가 같은 이메일로 가입하면 공유 기록을 읽을 수 있습니다."));
  }
  async function refreshShared() {
    if (!supabase || !user) return;
    const result = await supabase.rpc("flightbook_shared_notes");
    if (result.error) { setMessage(result.error.message); return; }
    setSharedNotes((result.data ?? []).map((row: { note: Note }) => row.note));
    setMessage("받은 공유 기록을 확인했습니다.");
  }
  const save = () => {
    if (!draft.term.trim() || !draft.meaning.trim()) return;
    const n = { ...draft, id: draft.id || crypto.randomUUID(), updatedAt: new Date().toISOString() };
    setNotes(draft.id ? notes.map((x) => (x.id === n.id ? n : x)) : [n, ...notes]);
    setDraft(blank());
  };
  return (
    <>
      <PageTitle title="나만의 용어집" sub="직접 정리한 단어와 메모" />
      <LocalOnly />
      {user && <section className="card-paper mt-4 space-y-3 p-4">
        <h2 className="font-semibold">수강생에게 공유</h2>
        <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void changeInvite(); }}>
          <input type="email" required aria-label="공유 대상 이메일" placeholder="공유 대상 이메일" className="field" value={invite} onChange={(event) => setInvite(event.target.value)} />
          <button className="btn btn-primary">공유 대상 추가</button>
          <button type="button" className="btn btn-outline" disabled={!invite.trim()} onClick={() => void changeInvite(true)}>공유 대상 제외</button>
        </form>
        <button className="btn btn-outline" onClick={() => void refreshShared()}>받은 공유 기록 확인</button>
        {message && <p role="status" className="text-sm">{message}</p>}
        {sharedNotes.map((note, index) => <p key={`${note.id}-${index}`}><strong>{note.term}</strong> — {note.meaning}{note.example && <span className="block text-sm">{note.example}</span>}</p>)}
      </section>}
      <form className="card-paper mt-4 grid gap-2 p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="text-sm">영어 용어 *<input className="field" value={draft.term} onChange={(e) => setDraft({ ...draft, term: e.target.value })} required /></label>
        <label className="text-sm">뜻 *<input className="field" value={draft.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })} required /></label>
        <label className="text-sm sm:col-span-2">예문 (빈칸 문제에 사용)<input className="field" value={draft.example} onChange={(e) => setDraft({ ...draft, example: e.target.value })} /></label>
        <label className="text-sm sm:col-span-2">메모<textarea className="field" value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} /></label>
        <div className="flex gap-2 sm:col-span-2"><button className="btn btn-primary">{draft.id ? "수정 저장" : "추가"}</button>{draft.id && <button type="button" className="btn btn-outline" onClick={() => setDraft(blank())}>취소</button>}</div>
      </form>
      {notes.length === 0 ? <div className="mt-4"><EmptyState title="아직 메모가 없습니다" body="위 양식으로 첫 용어를 추가하세요." /></div> : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {notes.map((n) => (
            <li key={n.id} className="card-paper p-4">
              <p className="font-semibold">{n.term} <span className="font-normal text-muted-foreground">— {n.meaning}</span></p>
              <SpeakingPractice key={`term:${n.term}`} text={n.term} />
              {n.example && <div className="mt-3"><p className="text-sm italic" lang="en">{n.example}</p><SpeakingPractice key={n.example} text={n.example} /></div>}
              {n.memo && <p className="mt-1 text-sm text-muted-foreground">{n.memo}</p>}
              <div className="mt-2 flex flex-wrap gap-2"><button className="btn btn-outline !min-h-[40px] text-sm" onClick={() => setDraft(n)}>편집</button><button className="btn btn-danger !min-h-[40px] text-sm" onClick={() => confirm("삭제할까요?") && setNotes(notes.filter((x) => x.id !== n.id))}>삭제</button>{user && <button className="btn btn-outline !min-h-[40px] text-sm" aria-pressed={Boolean(n.shared)} onClick={() => { if (draft.id === n.id) setDraft({ ...draft, shared: !n.shared }); setNotes(notes.map((x) => x.id === n.id ? { ...x, shared: !x.shared } : x)); }}>{n.shared ? "공유 해제" : "초대한 수강생에게 공유"}</button>}</div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
