# Forgecast 

Local reverse shell payload generator with an obfuscation pipeline, matched listener commands, and an optional payload vault. Built by [Vlone-p](https://github.com/Vlone-p) for authorized pentesting.

## What it is

Forgecast is a self-hosted tool for generating, obfuscating, and optionally tracking reverse shell payloads. Unlike static payload cheatsheets, it gives you a composable obfuscation pipeline. Chain transforms in any order, preview the output at every step, and auto-match a listener command to the payload's transport.

It runs on `localhost`. No telemetry, no callbacks home, no third-party APIs. Payloads never leave your machine unless you explicitly copy, save, or download them.

### Features

Curated payload library with 20+ templates across Bash, sh, Python, PowerShell, Netcat/Ncat, Perl, PHP, Ruby, Node.js, Java, Groovy, Lua, AWK, and Telnet. Each template is organized by language, OS, and transport (TCP, UDP, TLS, HTTP, DNS).

Obfuscation pipeline with 8 transforms you can chain in any order and preview at every step:
- Comment strip
- Variable rename (random identifiers, configurable seed and length)
- String splitting (chunk long literals for runtime recombination)
- Junk code injection (no-op dead branches, configurable count)
- Whitespace randomization (configurable intensity)
- Base64 encode with bash, python, perl, powershell, node, and php decoder stubs
- Hex encode with bash printf decoder
- XOR encode with single-byte key and python decoder stub (original bytes never appear in plaintext)

Smart port-in-use detection. Checks `/proc/net/tcp` on Linux with a TCP bind-probe fallback. The "next free" button auto-skips in-use ports.

Auto-matched listener commands. Given the payload's transport, the right `nc`, `socat`, `pwncat-cs`, `openssl s_server`, or `ncat --ssl` command is suggested with copy buttons.

Optional payload vault. Opt-in via the Vault drawer. When enabled, every generated payload can be saved to local SQLite with a label, target/engagement tag, and status lifecycle (unused, fired, caught, failed, archived). Default: off.

Authorization gate. First-launch banner requires explicit "I have authorization" attestation before the tool is usable. Persisted in local DB, resettable from the Vault drawer.

Three themes: Amber (default), Dark, Light. Toggle in the top-right.

### What it is not

Not a C2. Forgecast generates payloads and matches listener commands; it does not manage sessions, beaconing, or task queues. Not an exploitation framework. It does not fire exploits at CVEs. Not for unauthorized use; see the section below.

## Quick start

You need either Bun (faster, recommended) or Node.js + npm. Pick one.

### With Bun

Install Bun (not in apt, install via curl):

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

Then run Forgecast:

```bash
bun install
bun run db:push
bun run dev
```

### With npm (no Bun install needed)

Requires Node.js 18+:

```bash
npm install
npm run db:push
npm run dev
```

Then open `http://localhost:3000` in your browser. No external services, no API keys, no Docker required.

### Production build

With Bun:
```bash
bun run build
bun run start
```

With npm:
```bash
npm run build
npm run start
```

## How to use

Accept the authorization banner on first launch. The attestation is persisted in the local DB. You can reset it any time from the Vault drawer.

Configure the payload (left panel):
- Pick a language (Bash, Python, PowerShell, etc.)
- Pick target OS (Linux, Windows, macOS, any)
- Pick a transport (TCP, UDP, TLS, HTTP, DNS)
- Enter your callback IP and port
- The template dropdown filters to match your selection
- The port field shows live in-use status. Click "next free" to skip in-use ports.

Add obfuscation steps (left panel, below config):
- Click "+ add step" and pick a transform
- Reorder with the chevron buttons, remove with x
- Each step's options are editable inline
- The payload preview (middle column) updates live

Preview the output (middle panel):
- `final` is what you'll actually run
- `raw` is the unmodified template output after variable substitution
- `steps` is the step-by-step transformation chain, with the final output highlighted

Copy or save the payload. Copy button copies the final output to clipboard. Save button downloads it as a file with the right extension (`.sh`, `.ps1`, `.py`, etc.).

Run the matched listener (right panel). The recommended listener command for the payload's transport is shown with copy buttons. You start the listener yourself in a terminal. Forgecast does not manage listeners in-app.

Optional: save to vault. Open the Vault drawer (top-right), enable the vault, then save the current payload with a label and optional target/engagement tag. Status can be tracked through `unused → fired → caught → failed → archived`.

Switch themes with the icon group in the top-right. Amber is the default.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Prisma + SQLite (local file) |
| State | Zustand |
| Icons | lucide-react |
| Toasts | sonner |
| Themes | next-themes |

### Project layout

```
src/
├── app/
│   ├── page.tsx                    # single-page UI
│   ├── layout.tsx                  # root layout
│   ├── globals.css                 # amber / dark / light theme vars
│   └── api/
│       ├── payloads/route.ts       # vault CRUD
│       ├── ports/route.ts          # port-in-use check + next-free
│       └── settings/route.ts        # AppSettings singleton
├── components/
│   ├── forgecast/
│   │   ├── store.ts                # zustand store + derived hooks
│   │   ├── configurator.tsx        # config + pipeline builder
│   │   ├── port-field.tsx          # port input with in-use detection
│   │   ├── payload-preview.tsx     # final / raw / steps tabs
│   │   ├── listener-panel.tsx      # matched listener commands
│   │   ├── vault-panel.tsx         # vault drawer (opt-in)
│   │   ├── auth-banner.tsx         # first-launch authorization gate
│   │   └── theme-switcher.tsx      # amber / dark / light toggle
│   ├── theme-provider.tsx
│   └── ui/                          # shadcn/ui
└── lib/
    ├── payloads/templates.ts       # payload library
    ├── obfuscation/pipeline.ts     # 8 transforms + pipeline runner
    ├── listeners/
    │   ├── listeners.ts            # client-safe: command generator
    │   └── listeners-server.ts     # server-only: port-in-use check
    ├── db.ts
    └── utils.ts
prisma/
└── schema.prisma                   # Payload + AppSettings models
```

## Authorization and responsible use

Forgecast is for authorized penetration testing, CTF challenges, and security research only.

By using this tool you confirm that:

1. You own, or have explicit written authorization to test, every system you generate payloads against.
2. You understand the legal implications of unauthorized computer access in your jurisdiction.
3. You will not use Forgecast to facilitate unauthorized access, damage, theft, or disruption of systems you do not have permission to test.

The first-launch authorization banner is a one-time attestation. Reset it any time from the Vault drawer if you need to re-confirm on a new engagement or with a new operator.

The payload vault is disabled by default. When disabled, no payloads are written to disk. They exist only in browser memory for the duration of your session.

## License

MIT. Use responsibly.
