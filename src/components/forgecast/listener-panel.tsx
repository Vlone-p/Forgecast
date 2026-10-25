"use client";

import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useListenerCommands } from "./store";

function CopyRow({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="opacity-40 hover:opacity-100 transition-opacity"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(cmd);
          setCopied(true);
          toast.success("copied");
          setTimeout(() => setCopied(false), 1200);
        } catch {
          toast.error("clipboard failed");
        }
      }}
      title="copy"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function ListenerPanel() {
  const cmds = useListenerCommands();

  return (
    <section className="fc-card rounded-xl">
      <header className="fc-strip px-3 py-2 border-b border-border/60 rounded-t-md">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground fc-mono">listener</span>
          <span className="text-[10px] text-muted-foreground/50 fc-mono">·</span>
          <span className="text-[10px] text-muted-foreground/70 fc-mono">matched to transport</span>
        </div>
      </header>

      <div className="p-3 space-y-2">
        {cmds.length === 0 ? (
          <div className="fc-card-inset rounded-lg px-2.5 py-3">
            <p className="text-[10px] text-muted-foreground/70 fc-mono">no template selected</p>
          </div>
        ) : (
          cmds.map((c, i) => (
            <div
              key={`${c.tool}-${i}`}
              className={`relative rounded-lg p-2 pr-7 ${
                c.recommended
                  ? "border border-primary/40 bg-primary/5"
                  : "fc-card-inset"
              }`}
            >
              <CopyRow cmd={c.command} />
              <div className="flex items-center gap-1.5 mb-1">
                <Badge
                  variant="outline"
                  className={`text-[9px] py-0 px-1.5 h-4 rounded-lg fc-mono ${
                    c.recommended
                      ? "border-primary/60 text-primary bg-primary/10"
                      : "text-muted-foreground"
                  }`}
                >
                  {c.tool}
                </Badge>
                {c.recommended && (
                  <span className="text-[9px] text-primary fc-mono">recommended</span>
                )}
              </div>
              <pre className="fc-scroll overflow-auto fc-mono text-[10px] leading-relaxed text-foreground/90">
                {c.command}
              </pre>
              <p className="text-[9px] text-muted-foreground/70 mt-1 leading-snug">{c.notes}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
