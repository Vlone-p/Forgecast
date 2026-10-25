"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useForge } from "./store";
import { toast } from "sonner";

type FetchStatus = "free" | "in-use" | "error";

interface PortCheck {
  last: FetchStatus | null;
  allowed?: boolean;
  port: number | null;
}

export function PortField() {
  const { port, setPort } = useForge();
  const [check, setCheck] = useState<PortCheck>({ last: null, port: null });

  const invalid = !Number.isFinite(port) || port < 1 || port > 65535;

  useEffect(() => {
    if (invalid) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ports?port=${port}`);
        if (!res.ok) {
          setCheck({ last: "error", port });
          return;
        }
        const data = await res.json();
        if (!data.ok) {
          setCheck({ last: "error", port });
          return;
        }
        setCheck({
          last: data.inUse ? "in-use" : "free",
          allowed: data.allowed,
          port,
        });
      } catch {
        setCheck({ last: "error", port });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [port, invalid]);

  async function nextPort() {
    try {
      const res = await fetch(`/api/ports?next=${port + 1}`);
      if (!res.ok) {
        toast.error("could not find a free port");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setPort(data.port);
        toast.success(`jumped to ${data.port}`);
      } else {
        toast.error(data.error || "could not find a free port");
      }
    } catch {
      toast.error("network error");
    }
  }

  const isChecking = !invalid && check.port !== port;
  const last = check.last;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground fc-mono">port</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 px-1 text-[9px] text-primary hover:text-primary fc-mono"
          onClick={nextPort}
          title="skip to next free port"
        >
          <ChevronUp className="h-2.5 w-2.5" />
          next free
        </Button>
      </div>
      <div className="relative">
        <Input
          type="number"
          value={port}
          min={1}
          max={65535}
          onChange={(e) => setPort(Number(e.target.value))}
          className="fc-input fc-mono text-xs h-8 pr-7 border-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {invalid && <AlertCircle className="h-3 w-3 text-destructive" />}
          {!invalid && isChecking && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {!invalid && !isChecking && last === "free" && <CheckCircle2 className="h-3 w-3 text-primary" />}
          {!invalid && !isChecking && last === "in-use" && <AlertCircle className="h-3 w-3 text-destructive" />}
          {!invalid && !isChecking && last === "error" && <AlertCircle className="h-3 w-3 text-muted-foreground" />}
        </div>
      </div>
      <div className="h-3 text-[9px] fc-mono">
        {invalid && <span className="text-destructive">invalid</span>}
        {!invalid && isChecking && <span className="text-muted-foreground">checking</span>}
        {!invalid && !isChecking && last === "free" && check.allowed === false && (
          <span className="text-amber-500">privileged</span>
        )}
        {!invalid && !isChecking && last === "free" && check.allowed !== false && (
          <span className="text-primary">free</span>
        )}
        {!invalid && !isChecking && last === "in-use" && (
          <span className="text-destructive">in use</span>
        )}
        {!invalid && !isChecking && last === "error" && <span className="text-muted-foreground">err</span>}
      </div>
    </div>
  );
}
