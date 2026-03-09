import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session, name, answers, perQuestion, totalScore } = body || {};
    if (!session || !name) {
      return NextResponse.json(
        { ok: false, error: "missing session or name" },
        { status: 400 }
      );
    }
    const rec = {
      id: crypto.randomUUID(),
      name,
      answers,
      perQuestion,
      totalScore,
      ts: Date.now(),
    };
    await redis.lpush(`session:${session}:submissions`, JSON.stringify(rec));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
