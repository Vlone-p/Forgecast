import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.payload.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ ok: true, payloads: rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { label, target, source, output, config } = body as {
      label: string;
      target?: string;
      source: string;
      output: string;
      config: Record<string, unknown>;
    };

    if (!label || !source || !output) {
      return NextResponse.json({ ok: false, error: "missing required fields" }, { status: 400 });
    }

    const hash = createHash("sha256").update(output).digest("hex");

    const row = await db.payload.create({
      data: {
        label,
        target: target ?? null,
        source,
        output,
        config: JSON.stringify(config ?? {}),
        hash,
        status: "unused",
      },
    });

    return NextResponse.json({ ok: true, payload: row });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes } = body as { id: string; status?: string; notes?: string };
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    const row = await db.payload.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });
    return NextResponse.json({ ok: true, payload: row });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    await db.payload.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
