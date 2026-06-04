import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function extractPath(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("storage://memories/")) return url.slice("storage://memories/".length);
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/memories\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function useSignedMemoryUrl(url: string | null | undefined) {
  const [resolved, setResolved] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const path = extractPath(url);
    if (!path) { setResolved(url ?? null); return; }
    supabase.storage.from("memories").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (active) setResolved(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [url]);
  return resolved;
}

type Props = {
  url: string | null | undefined;
  type: "image" | "video";
  alt?: string;
  className?: string;
};

export function MemoryMedia({ url, type, alt, className }: Props) {
  const signed = useSignedMemoryUrl(url);
  if (!signed) return <div className={(className ?? "") + " bg-muted animate-pulse"} />;
  return type === "video"
    ? <video src={signed} className={className} muted playsInline preload="metadata" controls />
    : <img src={signed} alt={alt ?? ""} className={className} loading="lazy" />;
}