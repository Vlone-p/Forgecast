"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, FileDown } from "lucide-react";
import { usePipelineResult, useForge, useCurrentTemplate } from "./store";
import { toast } from "sonner";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
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
    </Button>
  );
}

export function PayloadPreview() {
  const { source, output, stepOutputs } = usePipelineResult();
  const tpl = useCurrentTemplate();
  const { ip, port } = useForge();
  const [activeTab, setActiveTab] = useState("final");

  const ext = useMemo(() => {
    if (!tpl) return "txt";
    switch (tpl.language) {
      case "powershell": return "ps1";
      case "python": return "py";
      case "ruby": return "rb";
      case "perl": return "pl";
      case "php": return "php";
      case "node": return "js";
      case "java": return "java";
      case "bash":
      case "sh": return "sh";
      default: return "txt";
    }
  }, [tpl]);

  function download(text: string, filename: string) {
    try {
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("download failed");
    }
  }

  if (!tpl) {
    return (
      <section className="fc-card rounded-xl h-full">
        <div className="p-12 text-center">
          <p className="text-xs text-muted-foreground fc-mono">no template selected</p>
        </div>
      </section>
    );
  }

  const filename = `forgecast-${tpl.id}-${ip.replace(/\./g, "-")}-${port}.${ext}`;

  return (
    <section className="fc-card-hero rounded-xl h-full flex flex-col">
      <header className="fc-strip px-3 py-2 border-b border-border/60 rounded-t-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground fc-mono">payload</span>
            <span className="text-[10px] text-muted-foreground/40 fc-mono">·</span>
            <span className="text-[11px] fc-mono font-medium text-primary truncate">{tpl.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <CopyButton text={output} />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => download(output, filename)}
              title={`save as ${filename}`}
            >
              <FileDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      <div className="px-3 pt-2 pb-3 flex-1 flex flex-col min-h-0">
        <div className="mb-2 flex items-center gap-2 text-[10px] fc-mono">
          <span className="px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 uppercase">{tpl.language}</span>
          <span className="text-muted-foreground">{tpl.os}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground uppercase">{tpl.transport}</span>
          <span className="ml-auto text-muted-foreground/70">{output.length}b</span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-transparent h-7 p-0.5 gap-0.5 self-start">
            <TabsTrigger value="final" className="text-[10px] h-6 px-2 fc-mono data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
              final
            </TabsTrigger>
            <TabsTrigger value="source" className="text-[10px] h-6 px-2 fc-mono data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
              raw
            </TabsTrigger>
            {stepOutputs.length > 0 && (
              <TabsTrigger value="steps" className="text-[10px] h-6 px-2 fc-mono data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
                steps ({stepOutputs.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="final" className="mt-1.5 flex-1 min-h-0">
            <CodeBlock text={output} />
          </TabsContent>

          <TabsContent value="source" className="mt-1.5 flex-1 min-h-0">
            <CodeBlock text={source} />
          </TabsContent>

          <TabsContent value="steps" className="mt-1.5 flex-1 min-h-0 space-y-1.5 overflow-y-auto fc-scroll">
            <div className="rounded-lg border border-border/60 bg-background/40">
              <div className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/70 fc-mono border-b border-border/40">
                source
              </div>
              <CodeBlock text={source} compact />
            </div>
            {stepOutputs.map((s, i) => (
              <div key={`${s.id}-${i}`} className="rounded-lg border border-border/60 bg-background/40">
                <div className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary/80 fc-mono border-b border-border/40 flex items-center gap-1.5">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span>{s.id}</span>
                </div>
                <CodeBlock text={s.output} compact />
              </div>
            ))}
            <div className="rounded-lg border border-primary/40 bg-primary/5">
              <div className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary fc-mono border-b border-primary/30">
                output
              </div>
              <CodeBlock text={output} compact />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function CodeBlock({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <pre
      className={`fc-scroll overflow-auto fc-mono text-[11px] leading-relaxed text-foreground/90 px-3 py-2 rounded-lg border border-border/50 bg-background/70 ${compact ? "max-h-32" : "h-full max-h-[60vh]"}`}
    >
      {text || <span className="text-muted-foreground italic">empty</span>}
    </pre>
  );
}
