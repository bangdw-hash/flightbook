import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPrompt = Event & {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>;
};

let pendingPrompt: InstallPrompt | null = null;
const standalone = window.matchMedia("(display-mode: standalone)");
const device = navigator as Navigator & { standalone?: boolean };
const isInstalled = () => standalone.matches || device.standalone === true;
const isAppleMobile = /iPhone|iPad|iPod/i.test(device.userAgent)
  || (/Mac/i.test(device.platform) && device.maxTouchPoints > 1);
const isAndroid = /Android/i.test(device.userAgent);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  pendingPrompt = event as InstallPrompt;
});
window.addEventListener("appinstalled", () => { pendingPrompt = null; });

export function InstallApp() {
  const [installed, setInstalled] = useState(isInstalled);
  const [canPrompt, setCanPrompt] = useState(Boolean(pendingPrompt));
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const update = () => setCanPrompt(Boolean(pendingPrompt));
    const markInstalled = () => setInstalled(true);
    const updateMode = () => setInstalled(isInstalled());
    window.addEventListener("beforeinstallprompt", update);
    window.addEventListener("appinstalled", markInstalled);
    standalone.addEventListener("change", updateMode);
    update();
    return () => {
      window.removeEventListener("beforeinstallprompt", update);
      window.removeEventListener("appinstalled", markInstalled);
      standalone.removeEventListener("change", updateMode);
    };
  }, []);

  async function install() {
    const prompt = pendingPrompt;
    if (!prompt) {
      setShowHelp((visible) => !visible);
      return;
    }
    pendingPrompt = null;
    setCanPrompt(false);
    try {
      if ((await prompt.prompt()).outcome === "accepted") setInstalled(true);
    } catch {
      setShowHelp(true);
    }
  }

  if (installed || !(isAppleMobile || isAndroid || canPrompt || showHelp)) return null;
  return (
    <aside className="mx-auto max-w-5xl px-4 pt-3" aria-label="웹앱 설치">
      <button type="button" className="btn btn-outline text-sm" onClick={() => void install()}
        aria-expanded={canPrompt ? undefined : showHelp} aria-controls={canPrompt ? undefined : "install-help"}>
        <Download className="h-4 w-4" aria-hidden /> 홈 화면에 추가
      </button>
      <p id="install-help" hidden={!showHelp} className="mt-2 text-sm text-muted-foreground">
        {isAppleMobile
          ? "Safari에서 이 페이지를 연 뒤 공유 → 홈 화면에 추가 → 웹 앱으로 열기(표시되는 경우) → 추가를 선택하세요."
          : isAndroid
            ? "Chrome에서 이 페이지를 연 뒤 ⋮ 메뉴 → 앱 설치 또는 홈 화면에 추가를 선택하세요."
            : "브라우저 메뉴에서 앱 설치를 선택하세요."}
      </p>
    </aside>
  );
}
