"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Flame } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRef, useState, useLayoutEffect } from "react";

const THEMES = [
  { id: "amber", label: "Amber", icon: Flame },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 2, width: 0 });

  useLayoutEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const current = (theme as string) || "amber";
      const idx = THEMES.findIndex((t) => t.id === current);
      if (idx === -1) return;
      const btns = containerRef.current.querySelectorAll<HTMLButtonElement>("[data-segment-btn]");
      const target = btns[idx];
      if (!target) return;
      const parentRect = containerRef.current.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      setIndicator({ left: rect.left - parentRect.left, width: rect.width });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [theme]);

  const current = (theme as string) || "amber";

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={containerRef} className="fc-segment h-7" suppressHydrationWarning>
        <span
          className="fc-segment-indicator"
          style={{ transform: `translateX(${indicator.left - 2}px)`, width: indicator.width }}
          aria-hidden
        />
        {THEMES.map((t) => {
          const Icon = t.icon;
          const active = current === t.id;
          return (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-segment-btn
                  data-active={active ? "true" : "false"}
                  className="fc-segment-btn h-5 w-6"
                  onClick={() => setTheme(t.id)}
                  aria-label={`${t.label} theme`}
                  aria-pressed={active}
                  suppressHydrationWarning
                >
                  <Icon className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {t.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
