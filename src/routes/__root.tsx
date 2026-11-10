import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { ArrowUpDown, Plane } from "lucide-react";

import appCss from "../styles.css?url";
import { StoreProvider, useStore } from "../lib/store";
import { Account } from "../components/account";
import { InstallApp } from "../components/install-app";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-6xl font-bold">404</h1>
        <p className="mt-3 text-muted-foreground">찾는 페이지가 없습니다.</p>
        <Link to="/" className="btn btn-primary mt-6">
          처음으로
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">페이지를 불러오지 못했습니다</h1>
        <p className="mt-2 text-sm text-muted-foreground">저장 상태를 확인한 뒤 다시 시도해 주세요.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn btn-primary"
          >
            다시 시도
          </button>
          <Link to="/" className="btn btn-outline">
            처음으로
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "항공기술영어 가이드북" },
      { name: "description", content: "KAI 기체제작 실무과정 항공정비 현장 패턴영어·용어 학습 쇼케이스" },
      { property: "og:title", content: "항공기술영어 가이드북" },
      { property: "og:description", content: "KAI 기체제작 실무과정 항공정비 현장 패턴영어·용어 학습 쇼케이스" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#1b2340" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;700&family=IBM+Plex+Mono:wght@500&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const NAV = [
  { to: "/", label: "전체 목록" },
  { to: "/patterns", label: "현장 패턴영어" },
  { to: "/glossary", label: "현장 용어집" },
  { to: "/notes", label: "나만의 용어집" },
  { to: "/quiz", label: "학습 테스트" },
] as const;

function Shell() {
  const { ready, saveError, saving, dataset } = useStore();
  return (
    <div className="min-h-screen">
      <a href="#main" onClick={(event) => { event.preventDefault(); document.getElementById("main")?.focus(); }} className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 btn btn-primary">
        본문으로 건너뛰기
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex min-h-[44px] items-center gap-2 font-serif text-base font-bold sm:text-lg">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-ink-foreground">
              <Plane className="h-4 w-4 -rotate-45" aria-hidden />
            </span>
            <span>
              항공기술영어 가이드북
              {dataset?.origin === "demo" && <span className="ml-2 align-middle chip bg-warn-soft text-warn">시연</span>}
            </span>
          </Link>
          <Link to="/data" className="btn btn-outline shrink-0 text-sm" activeProps={{ className: "btn btn-teal shrink-0 text-sm" }}>
            <ArrowUpDown className="h-4 w-4" aria-hidden />
            <span>자료 관리</span>
          </Link>
        </div>
        <nav aria-label="주요 메뉴" className="mx-auto max-w-5xl overflow-x-auto px-2">
          <ul className="flex min-w-max gap-1 pb-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  className="flex min-h-[44px] items-center border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
                  activeProps={{
                    className: "flex min-h-[44px] items-center border-b-2 !border-teal px-3 text-sm font-semibold !text-foreground",
                    "aria-current": "page",
                  }}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-4 pt-3"><Account />{saving && <p role="status" className="text-sm">Supabase에 저장하는 중…</p>}</div>
      <InstallApp />
      {saveError && (
        <p role="alert" className="mx-auto mt-3 max-w-5xl rounded-lg bg-warn-soft px-4 py-2 text-sm text-warn">
          {saveError}
        </p>
      )}
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        {ready ? <Outlet /> : <div className="h-64 animate-pulse rounded-xl bg-muted" aria-label="불러오는 중" />}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>제작자 방시원</p>
        <p className="mt-1">자료 출처 김형래 박사 『항공기술영어 회화 편』</p>
      </footer>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <HeadContent />
        <Shell />
      </StoreProvider>
    </QueryClientProvider>
  );
}
