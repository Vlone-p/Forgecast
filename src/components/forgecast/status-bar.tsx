"use client";

import { useForge, useCurrentTemplate } from "./store";

export function StatusBar() {
  const { language, os, transport, ip, port, pipeline, vaultEnabled } = useForge();
  const tpl = useCurrentTemplate();

  const fields = [
    { label: "lang", value: tpl?.language ?? language },
    { label: "os", value: tpl?.os ?? os },
    { label: "transport", value: (tpl?.transport ?? transport)?.toUpperCase() },
    { label: "lhost", value: `${ip}:${port}` },
    { label: "obf", value: pipeline.length === 0 ? "none" : `${pipeline.length}x` },
    { label: "vault", value: vaultEnabled ? "on" : "off" },
  ];

  return (
    <footer className="border-t border-border/60 bg-card/40 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto px-4 h-7 flex items-center gap-3 overflow-x-auto fc-scroll">
        {fields.map((f, i) => (
          <div key={f.label} className="flex items-center gap-1.5 shrink-0">
            {i > 0 && <span className="text-muted-foreground/30 text-[10px]">/</span>}
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 fc-mono">{f.label}</span>
            <span className="text-[10px] text-foreground/90 fc-mono">{f.value}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="fc-status-dot" />
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 fc-mono">authorized use only</span>
        </div>
      </div>
    </footer>
  );
}
