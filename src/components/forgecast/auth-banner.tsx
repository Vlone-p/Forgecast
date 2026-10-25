"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X } from "lucide-react";
import { useForge } from "./store";
import { toast } from "sonner";

export function AuthBanner() {
  const { authAck, setAuthAck } = useForge();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.settings?.authAck) {
          setAuthAck(true);
          setDismissed(true);
        }
      })
      .finally(() => setLoading(false));
  }, [setAuthAck]);

  async function accept() {
    setAuthAck(true);
    setDismissed(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authAck: true }),
      });
    } catch {}
  }

  if (loading || dismissed || authAck) return null;

  return (
    <div className="border-b border-primary/40 bg-primary/5">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-start gap-2.5">
        <ShieldAlert className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 text-[11px] leading-relaxed">
          <span className="text-primary font-medium fc-mono">authorized use only.</span>{" "}
          <span className="text-muted-foreground">
            Forgecast is for pentesting, CTF, and security research you have written permission to conduct.
            Unauthorized use may be illegal in your jurisdiction.
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" className="h-6 text-[10px] fc-mono" onClick={accept}>
            i have authorization
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => {
              setDismissed(true);
              toast.info("banner dismissed");
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
