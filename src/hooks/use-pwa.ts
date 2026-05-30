import { useEffect, useState } from "react";

function isPreviewOrIframe() {
  try {
    if (typeof window === "undefined") return true;
    if (window.self !== window.top) return true;
    const host = window.location.hostname;
    return host.includes("id-preview--") || host.includes("lovableproject.com") || host.includes("lovable.app") && host.startsWith("id-preview");
  } catch {
    return true;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Never register inside the Lovable preview iframe — caches stale builds.
    if (isPreviewOrIframe()) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      return;
    }
    let cancelled = false;
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      if (cancelled) return;
      if (reg.waiting) { setWaitingWorker(reg.waiting); setUpdateAvailable(true); }
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(nw);
            setUpdateAvailable(true);
          }
        });
      });
    }).catch(() => { /* offline / blocked */ });

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    waitingWorker?.postMessage("SKIP_WAITING");
  };

  return { updateAvailable, applyUpdate };
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canInstall = !!deferred && !installed;
  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome === "accepted";
  };

  return { canInstall, install, installed };
}