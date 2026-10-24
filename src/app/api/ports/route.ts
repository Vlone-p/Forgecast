import { NextRequest, NextResponse } from "next/server";
import { checkPortInUse, findFreePort } from "@/lib/listeners/listeners-server";
import { isPortAllowed } from "@/lib/listeners/listeners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const portParam = sp.get("port");
  const nextParam = sp.get("next");

  try {
    if (nextParam !== null) {
      const start = parseInt(nextParam, 10);
      if (!Number.isFinite(start) || start < 1 || start > 65535) {
        return NextResponse.json({ ok: false, error: "invalid port range" }, { status: 400 });
      }
      const free = await findFreePort(start, 50);
      return NextResponse.json({ ok: true, port: free, allowed: isPortAllowed(free) });
    }

    const port = parseInt(portParam ?? "", 10);
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      return NextResponse.json({ ok: false, error: "invalid port" }, { status: 400 });
    }
    const status = await checkPortInUse(port);
    return NextResponse.json({ ok: true, ...status, allowed: isPortAllowed(port) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
