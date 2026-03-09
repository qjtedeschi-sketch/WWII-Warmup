import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function POST(req: Request) {
  try {
    const { session, adminKey } = await req.json();
    if (!session || !adminKey) {
      return NextResponse.json(
        { ok: false, error: "session and adminKey required" },
        { status: 400 }
      );
    }

    const exists = await redis.exists(`session:${session}:submissions`);
    if (!exists) {
      await redis.set(`session:${session}:adminKey`, adminKey);
      await redis.set(`session:${session}:createdAt`, Date.now());
      return NextResponse.json({ ok: true, created: true });
    }

    return NextResponse.json({ ok: true, created: false });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
