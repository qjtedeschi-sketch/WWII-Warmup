import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = searchParams.get("session");
    const name = (searchParams.get("name") || "").toLowerCase();
    const adminKey = searchParams.get("adminKey");

    if (!session) {
      return NextResponse.json({ ok: false, error: "missing session" }, { status: 400 });
    }

    const raw = await redis.lrange<string>(`session:${session}:submissions`, 0, -1);
    const list = raw.map((s) => JSON.parse(s));
    const sorted = list.sort((a: any, b: any) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
    const ranks = sorted.map((r: any) => r.totalScore ?? 0);

    const idx = sorted.findIndex((r: any) => (r.name || "").toLowerCase() === name);
    const yourRank = idx >= 0 ? idx + 1 : undefined;
    const yourPercentile = idx >= 0 ? Math.round((100 * (sorted.length - idx)) / Math.max(1, sorted.length)) : undefined;

    const storedKey = await redis.get<string>(`session:${session}:adminKey`);
    const withNames = adminKey && storedKey && adminKey === storedKey;

    return NextResponse.json({
      ok: true,
      n: sorted.length,
      ranks,
      yourRank,
      yourPercentile,
      withNames,
      submissions: withNames ? sorted : undefined,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
