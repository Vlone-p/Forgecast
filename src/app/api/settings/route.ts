import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let s = await db.appSettings.findUnique({ where: { id: "singleton" } });
    if (!s) {
      s = await db.appSettings.create({ data: { id: "singleton" } });
    }
    return NextResponse.json({ ok: true, settings: s });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const allowed = ["vaultEnabled", "authAck", "defaultIP", "defaultPort", "defaultLang", "theme"];
    const data: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in body) data[k] = body[k];
    }
    const s = await db.appSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
    return NextResponse.json({ ok: true, settings: s });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
