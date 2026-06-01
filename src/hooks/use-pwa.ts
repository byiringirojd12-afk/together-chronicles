import { useEffect, useState } from "react";

function isPreviewOrIframe() {
  try {
    if (typeof window === "undefined") return true;
    if (window.self !== window.top) return true;
    const host = window.location.hostname;
    return (
      host.includes("id-preview--") ||
      host.includes("lovableproject.com") ||
      (host.includes("lovable.app") && host.startsWith("id-preview"))
    );
  } catch {
    return true;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Module-level singletons so multiple hook consumers don't double-register
// the service worker or double-bind controllerchange listeners.
let registerPromise: Promise<ServiceWorkerRegistration | null> | null = null;
const updateListeners = new Set<(w: ServiceWorker) => void>();
let controllerChangeBound = false;

function registerOnce(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (isPreviewOrIframe()) {
    navigator.serviceWorker
      .getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => {});
    return Promise.resolve(null);
  }
  if (!registerPromise) {
    registerPromise = navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.waiting) updateListeners.forEach((cb) => cb(reg.waiting!));
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              updateListeners.forEach((cb) => cb(nw));
            }
          });
        });
        return reg;
      })
      .catch(() => null);

    if (!controllerChangeBound) {
      controllerChangeBound = true;
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }
  }
  return registerPromise;
}

export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    registerOnce().then((reg) => {
      if (reg?.waiting) {
        setWaitingWorker(reg.waiting);
        setUpdateAvailable(true);
      }
    });
    const cb = (w: ServiceWorker) => {
      setWaitingWorker(w);
      setUpdateAvailable(true);
    };
    updateListeners.add(cb);
    return () => {
      updateListeners.delete(cb);
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
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
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