import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt, useServiceWorker } from "@/hooks/use-pwa";
import { toast } from "sonner";
import { useEffect } from "react";

export function InstallButton({ variant = "outline" }: { variant?: "outline" | "default" | "ghost" }) {
  const { canInstall, install, installed } = useInstallPrompt();
  const { updateAvailable, applyUpdate } = useServiceWorker();

  useEffect(() => {
    if (updateAvailable) {
      toast("A new version of Together+ is available", {
        action: { label: "Refresh", onClick: () => applyUpdate() },
        duration: 8000,
      });
    }
  }, [updateAvailable, applyUpdate]);

  if (installed || !canInstall) return null;

  return (
    <Button
      variant={variant}
      size="sm"
      className="gap-2"
      onClick={async () => {
        const ok = await install();
        if (ok) toast.success("Installing Together+");
      }}
    >
      <Download className="size-4" /> Install app
    </Button>
  );
}