"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Info } from "lucide-react";
import { useForge, useFilteredTemplates, useCurrentTemplate } from "./store";
import { OBFUSCATORS } from "@/lib/obfuscation/pipeline";
import type { ObfuscatorId } from "@/lib/obfuscation/pipeline";
import type { Language, OS, Transport } from "@/lib/payloads/templates";
import { PortField } from "./port-field";

const LANGUAGES: { value: Language | "any"; label: string }[] = [
  { value: "any", label: "any" },
  { value: "bash", label: "bash" },
  { value: "sh", label: "sh" },
  { value: "python", label: "python" },
  { value: "powershell", label: "powershell" },
  { value: "netcat", label: "netcat" },
  { value: "perl", label: "perl" },
  { value: "php", label: "php" },
  { value: "ruby", label: "ruby" },
  { value: "node", label: "node" },
  { value: "java", label: "java" },
  { value: "groovy", label: "groovy" },
  { value: "lua", label: "lua" },
  { value: "awk", label: "awk" },
  { value: "telnet", label: "telnet" },
];

const OSES: { value: OS | "any"; label: string }[] = [
  { value: "any", label: "any" },
  { value: "linux", label: "linux" },
  { value: "windows", label: "windows" },
  { value: "macos", label: "macos" },
];

const TRANSPORTS: { value: Transport | "any"; label: string }[] = [
  { value: "any", label: "any" },
  { value: "tcp", label: "tcp" },
  { value: "udp", label: "udp" },
  { value: "https", label: "tls" },
  { value: "http", label: "http" },
  { value: "dns", label: "dns" },
];

export function Configurator() {
  const forge = useForge();
  const templates = useFilteredTemplates();
  const tpl = useCurrentTemplate();

  const visibleTemplates = templates.length > 0 ? templates : [];
  const currentVisible = visibleTemplates.find((t) => t.id === forge.selectedTemplateId);

  return (
    <section className="fc-card rounded-xl">
      <header className="fc-strip px-3 py-2 border-b border-border/60 rounded-t-md">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground fc-mono">config</span>
          <span className="text-[10px] text-muted-foreground/50 fc-mono">·</span>
          <span className="text-[10px] text-muted-foreground/70 fc-mono">target parameters</span>
        </div>
      </header>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="lang">
            <Select value={forge.language} onValueChange={(v) => forge.setLanguage(v as Language | "any")}>
              <SelectTrigger className="h-8 text-xs fc-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="fc-mono text-xs">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="os">
            <Select value={forge.os} onValueChange={(v) => forge.setOS(v as OS | "any")}>
              <SelectTrigger className="h-8 text-xs fc-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OSES.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="fc-mono text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="transport">
            <Select value={forge.transport} onValueChange={(v) => forge.setTransport(v as Transport | "any")}>
              <SelectTrigger className="h-8 text-xs fc-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORTS.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="fc-mono text-xs">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <PortField />
          <Field label="callback ip" full>
            <Input
              value={forge.ip}
              onChange={(e) => forge.setIP(e.target.value)}
              placeholder="10.0.0.1"
              className="fc-input fc-mono text-xs h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
              spellCheck={false}
            />
          </Field>
        </div>

        <Field label={`template${visibleTemplates.length > 0 ? ` · ${visibleTemplates.length}` : ""}`}>
          <div className="flex items-center gap-1.5">
            <Select
              value={currentVisible ? forge.selectedTemplateId : undefined}
              onValueChange={(v) => forge.setTemplate(v)}
            >
              <SelectTrigger className="h-8 text-xs fc-mono">
                <SelectValue placeholder={visibleTemplates.length === 0 ? "no match" : "select"} />
              </SelectTrigger>
              <SelectContent>
                {visibleTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="fc-mono text-xs">
                    {t.name}
                    <span className="text-muted-foreground ml-2">{t.language}/{t.os}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tpl && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary">
                      <Info className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {tpl.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </Field>

        {tpl && tpl.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {tpl.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[9px] font-mono py-0 px-1.5 h-4 rounded-lg">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1 ${full ? "col-span-2" : ""}`}>
      <Label className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/80 fc-mono">{label}</Label>
      {children}
    </div>
  );
}

export function PipelineBuilder() {
  const forge = useForge();
  const { pipeline } = forge;

  return (
    <section className="fc-card rounded-xl">
      <header className="fc-strip px-3 py-2 border-b border-border/60 rounded-t-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground fc-mono">pipeline</span>
            <span className="text-[10px] text-muted-foreground/50 fc-mono">·</span>
            <span className="text-[10px] text-muted-foreground/70 fc-mono">obfuscation chain</span>
          </div>
          {pipeline.length > 0 && (
            <span className="text-[9px] text-primary/90 fc-mono">{pipeline.length} step{pipeline.length === 1 ? "" : "s"}</span>
          )}
        </div>
      </header>

      <div className="p-3 space-y-2">
        <Select
          value=""
          onValueChange={(v) => {
            if (v) forge.addStep(v as ObfuscatorId);
          }}
        >
          <SelectTrigger className="h-8 text-xs fc-mono">
            <SelectValue placeholder="+ add obfuscation step" />
          </SelectTrigger>
          <SelectContent>
            {OBFUSCATORS.map((o) => (
              <SelectItem key={o.id} value={o.id} className="fc-mono text-xs">
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {pipeline.length === 0 ? (
          <div className="fc-card-inset rounded-lg px-2.5 py-3">
            <p className="text-[10px] text-muted-foreground/70 fc-mono">
              raw payload passes through unchanged
            </p>
          </div>
        ) : (
          <ol className="space-y-1.5">
            {pipeline.map((step, idx) => {
              const obf = OBFUSCATORS.find((o) => o.id === step.id);
              if (!obf) return null;
              return (
                <li
                  key={`${step.id}-${idx}`}
                  className="fc-card-inset rounded-lg p-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="fc-mono text-[10px] text-primary/80 mt-0.5 font-medium">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs fc-mono font-medium">{obf.name}</span>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost" size="icon" className="h-5 w-5"
                            onClick={() => forge.moveStep(idx, -1)}
                            disabled={idx === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-5 w-5"
                            onClick={() => forge.moveStep(idx, 1)}
                            disabled={idx === pipeline.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive"
                            onClick={() => forge.removeStep(idx)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                      {obf.options.length > 0 && (
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          {obf.options.map((opt) => (
                            <div key={opt.key} className="space-y-0.5">
                              <Label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 fc-mono">
                                {opt.label}
                              </Label>
                              {opt.type === "boolean" ? (
                                <Select
                                  value={String(step.options[opt.key])}
                                  onValueChange={(v) =>
                                    forge.updateStepOption(idx, opt.key, v === "true")
                                  }
                                >
                                  <SelectTrigger className="h-6 text-[10px] fc-mono">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">true</SelectItem>
                                    <SelectItem value="false">false</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type={opt.type === "number" ? "number" : "text"}
                                  value={String(step.options[opt.key] ?? "")}
                                  onChange={(e) =>
                                    forge.updateStepOption(
                                      idx,
                                      opt.key,
                                      opt.type === "number" ? Number(e.target.value) : e.target.value,
                                    )
                                  }
                                  className="fc-input h-6 text-[10px] fc-mono border-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
