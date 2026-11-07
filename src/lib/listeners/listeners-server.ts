import "server-only";
import type { PortStatus } from "./listeners";

export async function checkPortInUse(port: number): Promise<PortStatus> {
  const tcp = await probeTcp(port);
  return {
    port,
    inUse: tcp.inUse,
    protocol: "tcp",
    process: tcp.process,
  };
}

async function probeTcp(port: number): Promise<{ inUse: boolean; process?: string }> {
  try {
    if (typeof process !== "undefined" && process.platform === "linux") {
      const inProc = await checkProcNet("tcp", port).catch(() => false);
      const inProc6 = await checkProcNet("tcp6", port).catch(() => false);
      if (inProc || inProc6) {
        return { inUse: true };
      }
    }
    const { createServer } = await import("net");
    return await new Promise((resolve) => {
      const srv = createServer();
      srv.once("error", () => resolve({ inUse: true }));
      srv.once("listening", () => {
        srv.close(() => resolve({ inUse: false }));
      });
      srv.listen(port, "0.0.0.0");
    });
  } catch {
    return { inUse: false };
  }
}

async function checkProcNet(file: "tcp" | "tcp6" | "udp" | "udp6", port: number): Promise<boolean> {
  const fs = await import("fs/promises");
  const path = `/proc/net/${file}`;
  let data: string;
  try {
    data = await fs.readFile(path, "utf-8");
  } catch {
    return false;
  }
  const lines = data.split("\n").slice(1);
  const hexPort = port.toString(16).padStart(4, "0").toUpperCase();
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const local = parts[1];
    const state = parts[3];
    if (local && local.endsWith(":" + hexPort)) {
      if (state === "0A" || state === "01") return true;
    }
  }
  return false;
}

export async function findFreePort(start: number, count = 50): Promise<number> {
  for (let p = start; p < start + count; p++) {
    if (p > 65535) break;
    const status = await checkPortInUse(p);
    if (!status.inUse) return p;
  }
  return start;
}
