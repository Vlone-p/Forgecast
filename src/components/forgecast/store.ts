"use client";

import { useState } from "react";
import { create } from "zustand";
import {
  PAYLOAD_TEMPLATES,
  filterTemplates,
  type Language,
  type OS,
  type Transport,
  type PayloadTemplate,
  type PayloadVars,
} from "@/lib/payloads/templates";
import {
  OBFUSCATORS,
  runPipeline,
  type PipelineStep,
  type ObfuscatorId,
} from "@/lib/obfuscation/pipeline";
import {
  buildListenerCommands,
  type ListenerCommand,
} from "@/lib/listeners/listeners";
import {
  wrapOutput,
  extFor,
  type OutputFormat,
} from "@/lib/payloads/output-formats";

interface ForgeState {
  language: Language | "any";
  os: OS | "any";
  transport: Transport | "any";
  ip: string;
  port: number;
  selectedTemplateId: string;
  pipeline: PipelineStep[];
  outputFormat: OutputFormat;
  vaultEnabled: boolean;
  authAck: boolean;
  setLanguage: (l: Language | "any") => void;
  setOS: (o: OS | "any") => void;
  setTransport: (t: Transport | "any") => void;
  setIP: (ip: string) => void;
  setPort: (p: number) => void;
  setTemplate: (id: string) => void;
  setOutputFormat: (f: OutputFormat) => void;
  setVaultEnabled: (b: boolean) => void;
  setAuthAck: (b: boolean) => void;
  addStep: (id: ObfuscatorId) => void;
  removeStep: (idx: number) => void;
  moveStep: (idx: number, dir: -1 | 1) => void;
  updateStepOption: (idx: number, key: string, value: string | number | boolean) => void;
}

export const useForge = create<ForgeState>((set) => ({
  language: "any",
  os: "any",
  transport: "any",
  ip: "10.0.0.1",
  port: 4444,
  selectedTemplateId: "bash-tcp",
  pipeline: [],
  outputFormat: "raw",
  vaultEnabled: false,
  authAck: false,
  setLanguage: (language) => set({ language }),
  setOS: (os) => set({ os }),
  setTransport: (transport) => set({ transport }),
  setIP: (ip) => set({ ip }),
  setPort: (port) => set({ port }),
  setTemplate: (selectedTemplateId) => set({ selectedTemplateId }),
  setOutputFormat: (outputFormat) => set({ outputFormat }),
  setVaultEnabled: (vaultEnabled) => set({ vaultEnabled }),
  setAuthAck: (authAck) => set({ authAck }),
  addStep: (id) =>
    set((s) => {
      const ob = OBFUSCATORS.find((o) => o.id === id);
      if (!ob) return s;
      const defaults: Record<string, string | number | boolean> = {};
      for (const opt of ob.options) defaults[opt.key] = opt.default;
      return { pipeline: [...s.pipeline, { id, options: defaults }] };
    }),
  removeStep: (idx) => set((s) => ({ pipeline: s.pipeline.filter((_, i) => i !== idx) })),
  moveStep: (idx, dir) =>
    set((s) => {
      const next = [...s.pipeline];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return s;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { pipeline: next };
    }),
  updateStepOption: (idx, key, value) =>
    set((s) => {
      const next = [...s.pipeline];
      next[idx] = { ...next[idx], options: { ...next[idx].options, [key]: value } };
      return { pipeline: next };
    }),
}));

export function useFilteredTemplates(): PayloadTemplate[] {
  const { language, os, transport } = useForge();
  return filterTemplates({
    language: language === "any" ? undefined : (language as Language),
    os: os === "any" ? undefined : (os as OS),
    transport: transport === "any" ? undefined : (transport as Transport),
  });
}

export function useCurrentTemplate(): PayloadTemplate | undefined {
  const id = useForge((s) => s.selectedTemplateId);
  return PAYLOAD_TEMPLATES.find((t) => t.id === id);
}

export function usePayloadSource(): string {
  const tpl = useCurrentTemplate();
  const { ip, port } = useForge();
  if (!tpl) return "";
  const vars: PayloadVars = { ip, port };
  return tpl.build(vars);
}

export function usePipelineResult(): { source: string; output: string; stepOutputs: { id: ObfuscatorId; output: string }[] } {
  const source = usePayloadSource();
  const pipeline = useForge((s) => s.pipeline);
  const format = useForge((s) => s.outputFormat);
  const tpl = useCurrentTemplate();
  const result = runPipeline(source, pipeline);
  const lang = tpl?.language ?? "bash";
  const wrapped = wrapOutput(result.output, format, lang);
  return { source, output: wrapped, stepOutputs: result.steps };
}

export function useOutputExt(): string {
  const format = useForge((s) => s.outputFormat);
  const tpl = useCurrentTemplate();
  return extFor(format, tpl?.language ?? "bash");
}

export function useListenerCommands(): ListenerCommand[] {
  const tpl = useCurrentTemplate();
  const port = useForge((s) => s.port);
  if (!tpl) return [];
  return buildListenerCommands({ port, transport: tpl.transport, language: tpl.language });
}

export function useUIState() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  return { settingsOpen, setSettingsOpen, vaultOpen, setVaultOpen };
}
