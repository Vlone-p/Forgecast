"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Github } from "lucide-react";
import { AuthBanner } from "@/components/forgecast/auth-banner";
import { Configurator, PipelineBuilder } from "@/components/forgecast/configurator";
import { PayloadPreview } from "@/components/forgecast/payload-preview";
import { ListenerPanel } from "@/components/forgecast/listener-panel";
import { VaultPanel } from "@/components/forgecast/vault-panel";
import { ThemeSwitcher } from "@/components/forgecast/theme-switcher";
import { StatusBar } from "@/components/forgecast/status-bar";
import { useForge } from "@/components/forgecast/store";

export default function Home() {
  const [vaultOpen, setVaultOpen] = useState(false);
  const { vaultEnabled } = useForge();

  return (
    <div className="min-h-screen flex flex-col fc-bg">
      <AuthBanner />

      <header className="fc-bar">
        <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-primary blur-[3px] opacity-60" />
            </div>
            <span className="text-[13px] font-medium tracking-tight fc-mono">forgecast</span>
            <span className="text-[10px] text-muted-foreground/60 fc-mono">beta</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant={vaultEnabled ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setVaultOpen(true)}
            >
              <Database className="h-3 w-3" />
              vault
              {vaultEnabled && (
                <span className="ml-0.5 inline-flex items-center">
                  <span className="w-1 h-1 rounded-full bg-primary-foreground/80" />
                </span>
              )}
            </Button>
            <ThemeSwitcher />
            <a
              href="https://github.com/Vlone-p"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-border/60 h-7 w-7 hover:bg-accent transition-colors"
              title="github.com/Vlone-p"
            >
              <Github className="h-3 w-3" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4 space-y-3">
          <Configurator />
          <PipelineBuilder />
        </div>
        <div className="lg:col-span-5">
          <PayloadPreview />
        </div>
        <div className="lg:col-span-3 space-y-3">
          <ListenerPanel />
        </div>
      </main>

      <StatusBar />
      <VaultPanel open={vaultOpen} onOpenChange={setVaultOpen} />
    </div>
  );
}
