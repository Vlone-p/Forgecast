"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2, Lock, History } from "lucide-react";
import { useForge, usePipelineResult, useCurrentTemplate } from "./store";
import { toast } from "sonner";

interface VaultEntry {
  id: string;
  label: string;
  target: string | null;
  output: string;
  source: string;
  config: string;
  status: string;
  createdAt: string;
}

export function VaultPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { vaultEnabled, setVaultEnabled, setAuthAck } = useForge();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/payloads");
      const data = await res.json();
      if (data.ok) setEntries(data.payloads);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (vaultEnabled && open) refresh();
  }, [vaultEnabled, open]);

  async function toggleVault(b: boolean) {
    setVaultEnabled(b);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultEnabled: b }),
      });
      toast.success(b ? "vault enabled" : "vault disabled");
      if (b) {
        await refresh();
      } else {
        setEntries([]);
      }
    } catch {
      toast.error("could not persist setting");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto fc-scroll">
        <SheetHeader>
          <SheetTitle className="text-sm fc-mono">vault</SheetTitle>
          <SheetDescription className="text-[11px]">
            opt-in local storage. disabled by default.
            when off, no payloads are written to disk.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-2 py-1.5">
            <div>
              <p className="text-[11px] font-medium fc-mono">enable vault</p>
              <p className="text-[9px] text-muted-foreground">sqlite · local file only</p>
            </div>
            <Switch checked={vaultEnabled} onCheckedChange={toggleVault} />
          </div>

          {!vaultEnabled ? (
            <div className="rounded-lg border border-dashed border-border/40 p-4 text-center">
              <Lock className="h-3.5 w-3.5 mx-auto text-muted-foreground/60" />
              <p className="text-[10px] text-muted-foreground/70 mt-1.5 fc-mono">disabled · payloads stay in memory</p>
            </div>
          ) : (
            <>
              <SaveCurrent />

              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground fc-mono">
                  history ({entries.length})
                </p>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] fc-mono" onClick={refresh} disabled={loading}>
                  refresh
                </Button>
              </div>

              <div className="space-y-1.5 max-h-[400px] overflow-y-auto fc-scroll">
                {entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/40 p-4 text-center">
                    <History className="h-3.5 w-3.5 mx-auto text-muted-foreground/60" />
                    <p className="text-[10px] text-muted-foreground/70 mt-1.5 fc-mono">empty</p>
                  </div>
                ) : (
                  entries.map((e) => (
                    <VaultRow key={e.id} entry={e} onChanged={refresh} />
                  ))
                )}
              </div>
            </>
          )}

          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-2 py-1.5">
            <p className="text-[10px] text-destructive fc-mono font-medium">authorization</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              saving a payload confirms you have written permission for the named target.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-5 mt-1.5 text-[9px] text-destructive border-destructive/40 hover:bg-destructive/10 fc-mono"
              onClick={async () => {
                setAuthAck(false);
                await fetch("/api/settings", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ authAck: false }),
                });
                toast.success("auth flag reset");
                onOpenChange(false);
              }}
            >
              reset
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SaveCurrent() {
  const { output, source } = usePipelineResult();
  const tpl = useCurrentTemplate();
  const { ip, port } = useForge();
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!tpl) {
      toast.error("select a template first");
      return;
    }
    setSaving(true);
    try {
      const finalLabel = label || `${tpl.name} ${ip}:${port}`;
      const res = await fetch("/api/payloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: finalLabel,
          target: target || null,
          source,
          output,
          config: { template: tpl.id, language: tpl.language, transport: tpl.transport, os: tpl.os, ip, port },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`saved "${finalLabel}"`);
        setLabel("");
        setTarget("");
      } else {
        toast.error(data.error || "save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border/60 px-2 py-1.5 space-y-1.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground fc-mono">save current</p>
      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 fc-mono">label</Label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={`${tpl?.name ?? "payload"} ${ip}:${port}`}
          className="h-6 text-[10px] fc-mono mt-0.5"
        />
      </div>
      <div>
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground/70 fc-mono">target</Label>
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="engagement / scope id"
          className="h-6 text-[10px] fc-mono mt-0.5"
        />
      </div>
      <Button size="sm" className="h-6 w-full text-[10px] gap-1 fc-mono" onClick={save} disabled={saving || !tpl}>
        <Save className="h-2.5 w-2.5" />
        {saving ? "saving" : "save"}
      </Button>
    </div>
  );
}

function VaultRow({ entry, onChanged }: { entry: VaultEntry; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);

  async function setStatus(status: string) {
    try {
      await fetch("/api/payloads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, status }),
      });
      toast.success(`marked ${status}`);
      onChanged();
    } catch {
      toast.error("update failed");
    }
  }

  async function del() {
    if (!confirm(`delete "${entry.label}"?`)) return;
    try {
      await fetch(`/api/payloads?id=${entry.id}`, { method: "DELETE" });
      toast.success("deleted");
      onChanged();
    } catch {
      toast.error("delete failed");
    }
  }

  const statusColor =
    entry.status === "caught" ? "text-primary border-primary/60"
    : entry.status === "fired" ? "text-amber-500 border-amber-500/40"
    : entry.status === "failed" ? "text-destructive border-destructive/40"
    : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border/60 bg-card/20">
      <div className="p-1.5">
        <div className="flex items-start justify-between gap-1.5">
          <button
            className="flex-1 min-w-0 text-left"
            onClick={() => setExpanded((e) => !e)}
          >
            <p className="text-[11px] font-medium truncate fc-mono">{entry.label}</p>
            {entry.target && (
              <p className="text-[9px] text-muted-foreground/70 truncate fc-mono">→ {entry.target}</p>
            )}
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <Badge variant="outline" className={`text-[9px] font-mono py-0 px-1 h-3.5 rounded-lg ${statusColor}`}>
              {entry.status}
            </Badge>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={del}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground/70 mt-0.5 fc-mono">
          {new Date(entry.createdAt).toLocaleString()}
        </p>
        {expanded && (
          <div className="mt-1.5 space-y-1.5">
            <pre className="fc-scroll overflow-auto bg-background/60 border border-border/40 px-1.5 py-1 fc-mono text-[10px] max-h-32 overflow-y-auto">
              {entry.output}
            </pre>
            <div className="flex items-center gap-1">
              <Select value={entry.status} onValueChange={setStatus}>
                <SelectTrigger className="h-5 text-[9px] w-24 fc-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unused">unused</SelectItem>
                  <SelectItem value="fired">fired</SelectItem>
                  <SelectItem value="caught">caught</SelectItem>
                  <SelectItem value="failed">failed</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline" size="sm" className="h-5 text-[9px] ml-auto fc-mono"
                onClick={async () => {
                  await navigator.clipboard.writeText(entry.output);
                  toast.success("copied");
                }}
              >
                copy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
