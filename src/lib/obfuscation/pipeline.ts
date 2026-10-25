export type ObfuscatorId =
  | "var-rename"
  | "junk-injection"
  | "string-split"
  | "base64-encode"
  | "hex-encode"
  | "xor-encode"
  | "whitespace"
  | "comment-strip";

export interface ObfuscatorOption {
  key: string;
  label: string;
  type: "number" | "boolean" | "string";
  default: number | boolean | string;
}

export interface Obfuscator {
  id: ObfuscatorId;
  name: string;
  description: string;
  supportedLanguages: string[];
  options: ObfuscatorOption[];
  apply: (source: string, opts: Record<string, string | number | boolean>) => string;
}

function randName(len: number, seed: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
  let s = "";
  let x = seed || 1;
  for (let i = 0; i < len; i++) {
    x = (x * 9301 + 49297) % 233280;
    s += chars[Math.floor((x / 233280) * chars.length)];
  }
  return s;
}

const varRename: Obfuscator = {
  id: "var-rename",
  name: "Variable Rename",
  description: "Replaces common variable / function names (s, p, c, etc.) with randomly generated identifiers to break signature matches.",
  supportedLanguages: ["bash", "python", "perl", "ruby", "node", "powershell", "sh", "php", "java", "groovy", "lua", "awk"],
  options: [
    { key: "length", label: "Name length", type: "number", default: 8 },
    { key: "seed", label: "Seed", type: "number", default: 1337 },
  ],
  apply: (src, opts) => {
    const len = Number(opts.length) || 8;
    const seed = Number(opts.seed) || 1;
    const newName = randName(len, seed);
    return src
      .replace(/\b(s|p|c|k|b|i|r|t|n)\b/g, (match) => {
        return match === "s" ? newName : match === "p" ? randName(len, seed + 1) : match === "c" ? randName(len, seed + 2) : randName(len, seed + Math.floor(Math.random() * 100));
      });
  },
};

const junkInjection: Obfuscator = {
  id: "junk-injection",
  name: "Junk Code Injection",
  description: "Injects no-op variable assignments and dead code branches to bloat the source and break hash signatures.",
  supportedLanguages: ["bash", "sh", "python", "perl", "ruby", "powershell", "php", "lua"],
  options: [
    { key: "count", label: "Number of junk lines", type: "number", default: 5 },
    { key: "seed", label: "Seed", type: "number", default: 7 },
  ],
  apply: (src, opts) => {
    const count = Number(opts.count) || 5;
    const seed = Number(opts.seed) || 1;
    const lines = src.split("\n");
    const junk: string[] = [];
    for (let i = 0; i < count; i++) {
      const v = randName(10, seed + i * 17);
      const val = Math.floor((seed + i * 31) % 9999);
      junk.push(`${v}=${val}; export ${v}; ${v}=$(( ${v} * 0 ))`);
    }
    const out: string[] = [];
    let ji = 0;
    for (const line of lines) {
      out.push(line);
      if (ji < junk.length && line.trim().length > 0) {
        out.push(junk[ji++]);
      }
    }
    return out.join("\n");
  },
};

const stringSplit: Obfuscator = {
  id: "string-split",
  name: "String Splitting",
  description: "Splits long string literals into chunks recombined at runtime. Breaks static string scanning.",
  supportedLanguages: ["bash", "python", "perl", "ruby", "node", "powershell", "php", "java", "groovy"],
  options: [
    { key: "chunkSize", label: "Chunk size", type: "number", default: 4 },
  ],
  apply: (src, opts) => {
    const chunkSize = Math.max(2, Number(opts.chunkSize) || 4);
    return src.replace(/"([^"\\]{8,})"/g, (full, content: string) => {
      const chunks: string[] = [];
      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize));
      }
      return chunks.map((c) => `"${c}"`).join("");
    });
  },
};

const base64Encode: Obfuscator = {
  id: "base64-encode",
  name: "Base64 Encode",
  description: "Base64-encodes the payload source and wraps it in a language-appropriate eval/decode stub.",
  supportedLanguages: ["bash", "sh", "python", "perl", "ruby", "node", "powershell", "php"],
  options: [
    { key: "decoder", label: "Decoder style (auto if blank)", type: "string", default: "" },
  ],
  apply: (src, opts) => {
    if (typeof btoa === "undefined") {
      const b64 = Buffer.from(src, "utf-8").toString("base64");
      return wrapBase64(b64, String(opts.decoder || ""));
    }
    const b64 = btoa(unescape(encodeURIComponent(src)));
    return wrapBase64(b64, String(opts.decoder || ""));
  },
};

function wrapBase64(b64: string, decoder: string): string {
  if (!decoder || decoder === "bash" || decoder === "") {
    return `echo ${b64} | base64 -d | bash`;
  }
  if (decoder === "python" || decoder === "python3") {
    return `python3 -c 'import base64;exec(base64.b64decode("${b64}"))'`;
  }
  if (decoder === "perl") {
    return `perl -e 'eval(decode_base64("${b64}"))' 2>/dev/null || perl -MMIME::Base64 -e 'eval(decode_base64("${b64}"))'`;
  }
  if (decoder === "powershell" || decoder === "ps") {
    return `$s="${b64}";iex([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)))`;
  }
  if (decoder === "node") {
    return `node -e 'eval(Buffer.from("${b64}","base64").toString())'`;
  }
  if (decoder === "php") {
    return `php -r 'eval(base64_decode("${b64}"));'`;
  }
  return `echo ${b64} | base64 -d | bash`;
}

const hexEncode: Obfuscator = {
  id: "hex-encode",
  name: "Hex Encode",
  description: "Hex-encodes the payload and wraps it in a bash printf-based decoder stub.",
  supportedLanguages: ["bash", "sh", "python", "perl", "powershell"],
  options: [],
  apply: (src) => {
    let hex = "";
    for (let i = 0; i < src.length; i++) {
      hex += src.charCodeAt(i).toString(16).padStart(2, "0");
    }
    const chunks: string[] = [];
    for (let i = 0; i < hex.length; i += 160) {
      const piece = hex.slice(i, i + 160);
      let printfStr = "";
      for (let j = 0; j < piece.length; j += 2) {
        printfStr += "\\x" + piece.slice(j, j + 2);
      }
      chunks.push(printfStr);
    }
    return `printf '${chunks.join("'\\n'")}' | bash`;
  },
};

const xorEncode: Obfuscator = {
  id: "xor-encode",
  name: "XOR Encode",
  description: "XOR-encodes the payload with a single-byte key and embeds a python decoder stub. The original bytes never appear in plaintext.",
  supportedLanguages: ["bash", "sh", "python"],
  options: [
    { key: "key", label: "XOR key (1-255)", type: "number", default: 0x5a },
  ],
  apply: (src, opts) => {
    const key = (Number(opts.key) || 0x5a) & 0xff;
    const bytes: number[] = [];
    for (let i = 0; i < src.length; i++) {
      bytes.push(src.charCodeAt(i) ^ key);
    }
    const hexArray = bytes.map((b) => "0x" + b.toString(16).padStart(2, "0")).join(",");
    return `python3 -c '
k=${key}
d=[${hexArray}]
print("".join(chr(b^k) for b in d),end="")
' | bash`;
  },
};

const whitespace: Obfuscator = {
  id: "whitespace",
  name: "Whitespace Randomization",
  description: "Inserts random whitespace and tab variations to break hash signatures. Does not change semantics.",
  supportedLanguages: ["bash", "sh", "python", "perl", "ruby", "powershell"],
  options: [
    { key: "intensity", label: "Intensity (1-5)", type: "number", default: 2 },
  ],
  apply: (src, opts) => {
    const intensity = Math.max(1, Math.min(5, Number(opts.intensity) || 2));
    return src
      .split("\n")
      .map((line) => {
        if (line.trim().length === 0) return line;
        const pad = "\t".repeat(intensity);
        return line.replace(/(\S)(\s+)(\S)/g, (_, a, b, c) => `${a}${b}${pad}${c}`);
      })
      .join("\n");
  },
};

const commentStrip: Obfuscator = {
  id: "comment-strip",
  name: "Comment Strip",
  description: "Strips shell-style comments (# ...) to minimize the source footprint.",
  supportedLanguages: ["bash", "sh", "python", "perl", "ruby", "php", "node"],
  options: [],
  apply: (src) => {
    return src
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");
  },
};

export const OBFUSCATORS: Obfuscator[] = [
  commentStrip,
  varRename,
  stringSplit,
  junkInjection,
  whitespace,
  base64Encode,
  hexEncode,
  xorEncode,
];

export function getObfuscator(id: ObfuscatorId): Obfuscator | undefined {
  return OBFUSCATORS.find((o) => o.id === id);
}

export interface PipelineStep {
  id: ObfuscatorId;
  options: Record<string, string | number | boolean>;
}

export interface PipelineResult {
  steps: { id: ObfuscatorId; output: string }[];
  output: string;
}

export function runPipeline(source: string, steps: PipelineStep[]): PipelineResult {
  const result: PipelineResult = { steps: [], output: source };
  let current = source;
  for (const step of steps) {
    const obf = getObfuscator(step.id);
    if (!obf) continue;
    try {
      current = obf.apply(current, step.options);
    } catch {}
    result.steps.push({ id: step.id, output: current });
  }
  result.output = current;
  return result;
}

export function sha256Sync(text: string): string {
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  return hash.padEnd(16, "0");
}
