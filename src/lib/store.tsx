import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Dataset, Note, Pattern, Term } from "./types";

type PatternMode = "book" | "review";
type GlossaryMode = "full" | "short";
interface Persisted {
  dataset: Dataset | null;
  notes: Note[];
  patternMode: PatternMode;
  glossaryMode: GlossaryMode;
}
const EMPTY: Persisted = { dataset: null, notes: [], patternMode: "book", glossaryMode: "full" };

interface Store extends Persisted {
  user: User | null;
  textbookAvailable: boolean;
  hasCustomDataset: boolean;
  ready: boolean;
  saveError: string | null;
  saving: boolean;
  setDataset: (dataset: Dataset | null) => void;
  setNotes: (notes: Note[]) => void;
  setPatternMode: (mode: PatternMode) => void;
  setGlossaryMode: (mode: GlossaryMode) => void;
  updatePattern: (pattern: Pattern) => void;
  deletePattern: (id: string) => void;
  updateTerm: (term: Term) => void;
  deleteTerm: (id: string) => void;
}
const Context = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ user: User | null; loaded: boolean }>({ user: null, loaded: !supabase });
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth({ user: session?.user ?? null, loaded: true });
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <AccountStore key={auth.user?.id ?? "guest"} user={auth.user} authReady={auth.loaded}>{children}</AccountStore>;
}

function AccountStore({ user, authReady, children }: { user: User | null; authReady: boolean; children: ReactNode }) {
  const id = user?.id;
  const [state, setState] = useState<Persisted>(EMPTY);
  const [textbook, setTextbook] = useState<Dataset | null>(null);
  const [loaded, setLoaded] = useState(!id);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const revision = useRef<number | null>(null);
  const saved = useRef<Persisted>(EMPTY);

  useEffect(() => {
    const db = supabase;
    if (!db || !id) return;
    let active = true;
    void (async () => {
      const [result, book] = await Promise.all([
        db.from("flightbook_accounts").select("payload,revision").eq("owner_id", id).maybeSingle(),
        db.from("flightbook_textbooks").select("dataset").eq("id", "kai-aircraft-english").maybeSingle(),
      ]);
      if (!active) return;
      if (result.error) {
        setSaveError("Supabase에서 내 기록을 불러오지 못했습니다. 새로고침해서 다시 시도해 주세요.");
        return;
      }
      revision.current = result.data?.revision ?? null;
      const initial = result.data ? { ...EMPTY, ...(result.data.payload as Partial<Persisted>) } : EMPTY;
      if (initial.dataset?.origin === "demo") initial.dataset = null;
      saved.current = initial;
      setState(initial);
      setTextbook((book.data?.dataset as Dataset | undefined) ?? null);
      if (book.error || !book.data) setSaveError("기본 교재를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    const db = supabase;
    if (!db || !id || !loaded || state === saved.current || saving || saveError) return;
    setSaving(true);
    void (async () => {
      const version = revision.current;
      const result = version === null
        ? await db.from("flightbook_accounts").insert({ owner_id: id, payload: state }).select("revision").single()
        : await db.from("flightbook_accounts").update({ payload: state, revision: version + 1 })
          .eq("owner_id", id).eq("revision", version).select("revision").maybeSingle();
      if (result.error || !result.data) {
        setSaveError("Supabase 저장에 실패했습니다. 다른 기기에서 변경했다면 먼저 JSON으로 내보내고, 새로고침해 최신 기록을 확인하세요.");
      } else {
        revision.current = result.data.revision;
        saved.current = state;
      }
      setSaving(false);
    })();
  }, [id, loaded, state, saving, saveError]);

  const patch = (change: Partial<Persisted>) => setState((current) => ({ ...current, ...change }));
  const patchDataset = (update: (dataset: Dataset) => Dataset) =>
    setState((current) => {
      const dataset = current.dataset ?? textbook;
      return dataset ? { ...current, dataset: update(dataset) } : current;
    });

  return <Context.Provider value={{
    ...state, user, ready: authReady && loaded, saveError, saving,
    dataset: state.dataset ?? textbook,
    textbookAvailable: Boolean(textbook),
    hasCustomDataset: Boolean(state.dataset),
    setDataset: (dataset) => patch({ dataset }),
    setNotes: (notes) => patch({ notes }),
    setPatternMode: (patternMode) => patch({ patternMode }),
    setGlossaryMode: (glossaryMode) => patch({ glossaryMode }),
    updatePattern: (p) => patchDataset((d) => ({ ...d, patterns: d.patterns.map((x) => x.id === p.id ? p : x) })),
    deletePattern: (id) => patchDataset((d) => ({ ...d, patterns: d.patterns.filter((x) => x.id !== id) })),
    updateTerm: (t) => patchDataset((d) => ({ ...d, terms: d.terms.map((x) => x.id === t.id ? t : x) })),
    deleteTerm: (id) => patchDataset((d) => ({ ...d, terms: d.terms.filter((x) => x.id !== id) })),
  }}>{children}</Context.Provider>;
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider missing");
  return store;
}
