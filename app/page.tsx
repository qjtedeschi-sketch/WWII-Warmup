"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";

function ProximityBar({ score }: { score: number }) {
  return (
    <div className="mt-2">
      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            background:
              "linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)",
          }}
        />
      </div>
      <div className="text-[11px] text-slate-500 mt-1">
        {score >= 90
          ? "Extremely close"
          : score >= 75
          ? "Very close"
          : score >= 60
          ? "Close"
          : score >= 40
          ? "In the ballpark"
          : "Keep experimenting—this is about estimating!"}
      </div>
    </div>
  );
}

type Q = {
  id: string;
  prompt: string;
  units?: string;
  answer: string;
  useSlider?: boolean;
  min?: number;
  max?: number;
  step?: number;
  reveal?: string;
};

const DEFAULTS: Q[] = [
  { id: "q1", prompt: "How many people do you think died in World War II?", answer: "75-80 million", units: "people", useSlider: true, min: 50_000_000, max: 100_000_000, step: 500_000, reveal: "Most estimates: 70–85M. Accepting 75–80M here." },
  { id: "q2", prompt: "What % of the total deaths do you think occurred on the battlefield?", answer: "19-33%", units: "%", useSlider: true, min: 0, max: 100, step: 1, reveal: "15–25M military out of ~75–80M total ⇒ ~19–33%." },
  { id: "q3", prompt: "What % do you think were civilians?", answer: "50%+", units: "%", useSlider: true, min: 0, max: 100, step: 1, reveal: "≥40M civilians out of ~75–80M total ⇒ ≥50%." },
  { id: "q4", prompt: "What continents saw major conflicts? (3, comma‑separated)", answer: "Europe, Asia, Africa" },
  { id: "q5", prompt: "How many countries were involved?", answer: "80", units: "countries", useSlider: true, min: 20, max: 120, step: 1 },
  { id: "q6", prompt: "How many years did WWII last?", answer: "6", units: "years", useSlider: true, min: 1, max: 10, step: 0.1 },
  { id: "q7", prompt: "How many Americans were part of the war effort?", answer: "16000000", units: "people", useSlider: true, min: 5_000_000, max: 30_000_000, step: 100_000 },
  { id: "q8", prompt: "How many Americans died?", answer: "400000+", units: "people", useSlider: true, min: 100_000, max: 1_000_000, step: 10_000, reveal: "About 405,000 Americans died." },
  { id: "q9", prompt: "Which country had the most deaths/casualties?", answer: "Soviet Union", reveal: "≈24–27M deaths." }
];

const NUM_RE = /[-+]?\d{1,3}(?:,?\d{3})*(?:\.\d+)?/g;
const toNumber = (x: string) => Number(x.replace(/,/g, ""));

function multiplyByScale(n: number, scale?: string | null) {
  if (!scale) return n;
  const s = scale.toLowerCase();
  if (s.startsWith("million") || s === "m") return n * 1_000_000;
  if (s.startsWith("billion") || s === "b") return n * 1_000_000_000;
  if (s === "k") return n * 1_000;
  return n;
}

function parseAnswerSpec(ansRaw: string): any {
  const ans = (ansRaw || "").trim();
  const lower = ans.toLowerCase();

  if (lower.includes(",") && !/%|\d\s*-\s*\d/.test(lower)) {
    const values = ans.split(",").map((s) => s.trim()).filter(Boolean);
    return { kind: "set", values: values.map((v) => v.toLowerCase()) };
  }

  const rangeMatch = ans.match(/\b(\d[\d,]*(?:\.\d+)?)\s*-\s*(\d[\d,]*(?:\.\d+)?)(?:\s*(million|billion|k|m|b))?\s*(%?)/i);
  if (rangeMatch) {
    const a = toNumber(rangeMatch[1]);
    const b = toNumber(rangeMatch[2]);
    const scale = rangeMatch[3];
    const pct = rangeMatch[4] === "%";
    const min = multiplyByScale(Math.min(a, b), scale);
    const max = multiplyByScale(Math.max(a, b), scale);
    return { kind: "numeric_range", min, max, isPercent: pct };
  }

  const minMatch = ans.match(/\b(\d[\d,]*(?:\.\d+)?)(?:\s*(million|billion|k|m|b))?\s*(%?)\s*\+\s*$/i);
  if (minMatch) {
    const base = toNumber(minMatch[1]);
    const scale = minMatch[2];
    const pct = minMatch[3] === "%";
    return { kind: "numeric_min", min: multiplyByScale(base, scale), isPercent: pct };
  }

  const exactPct = ans.match(/^\s*(\d[\d,]*(?:\.\d+)?)\s*(%)\s*$/);
  if (exactPct) return { kind: "numeric_exact", value: toNumber(exactPct[1]), isPercent: true };
  const exactNum = ans.match(/^\s*(\d[\d,]*(?:\.\d+)?)\s*$/);
  if (exactNum) return { kind: "numeric_exact", value: toNumber(exactNum[1]), isPercent: false };

  return { kind: "text_exact", value: ans };
}

function parseGuess(str: string) {
  const m = (str || "").trim().match(NUM_RE);
  if (!m) return null;
  return Number(toNumber(m[0]));
}

function percentError(trueVal: number, guess: number) {
  if (trueVal === 0) return Math.abs(guess) === 0 ? 0 : Infinity;
  return Math.abs((guess - trueVal) / trueVal) * 100;
}

export default function Page() {
  const [studentName, setStudentName] = useState("");
  const [sessionCode, setSessionCode] = useState("TEDS-1");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [ranks, setRanks] = useState<number[]>([]);
  const [yourRank, setYourRank] = useState<number | undefined>();
  const [yourPercentile, setYourPercentile] = useState<number | undefined>();

  const results = useMemo(
    () =>
      DEFAULTS.map((q) => {
        const spec = parseAnswerSpec(q.answer);
        const raw = answers[q.id] ?? "";

        if (spec.kind === "numeric_exact") {
          const guess = parseGuess(raw);
          if (guess == null) return { id: q.id, score: 0 };
          const absDiff = Math.abs(guess - spec.value);
          const pctErr = percentError(spec.value, guess);
          const score = Math.max(0, 100 - Math.min(100, pctErr));
          return { id: q.id, score };
        }
        if (spec.kind === "numeric_range") {
          const guess = parseGuess(raw);
          if (guess == null) return { id: q.id, score: 0 };
          const within = guess >= spec.min && guess <= spec.max;
          if (within) return { id: q.id, score: 100 };
          const edge = Math.abs(guess - (guess < spec.min ? spec.min : spec.max));
          const denom = guess < spec.min ? spec.min : spec.max;
          const pctToEdge = denom === 0 ? Infinity : (edge / denom) * 100;
          const score = Math.max(0, 100 - Math.min(100, pctToEdge));
          return { id: q.id, score };
        }
        if (spec.kind === "numeric_min") {
          const guess = parseGuess(raw);
          if (guess == null) return { id: q.id, score: 0 };
          const meets = guess >= spec.min;
          if (meets) return { id: q.id, score: 100 };
          const diff = spec.min - guess;
          const pctFromMin = (diff / spec.min) * 100;
          const score = Math.max(0, 100 - Math.min(100, pctFromMin));
          return { id: q.id, score };
        }
        if (spec.kind === "set") {
          const expected = spec.values;
          const parts = raw.split(/[,|\n]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
          const seen = new Set<string>();
          const guesses = parts.filter((p) => {
            if (seen.has(p)) return false;
            seen.add(p);
            return true;
          });
          const correct = guesses.filter((g) => expected.includes(g));
          const score = Math.round((correct.length / 3) * 100);
          return { id: q.id, score };
        }
        const match = raw.trim().toLowerCase() === spec.value.trim().toLowerCase();
        return { id: q.id, score: match ? 100 : 0 };
      }),
    [answers]
  );

  const total = useMemo(() => (results.length ? Math.round(results.reduce((a, r) => a + (r as any).score, 0) / results.length) : 0), [results]);

  async function handleSubmit() {
    if (!studentName.trim() || !sessionCode.trim()) {
      alert("Enter name and session code.");
      return;
    }
    setSubmitted(true);
    const perQ = results.map((r, i) => ({ q: i + 1, score: (r as any).score }));
    const payload = { session: sessionCode.trim(), name: studentName.trim(), answers, perQuestion: perQ, totalScore: total };
    try {
      await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const res = await fetch(`/api/scores?session=${encodeURIComponent(sessionCode)}&name=${encodeURIComponent(studentName)}`);
      const data = await res.json();
      if (data.ok) {
        setRanks(data.ranks || []);
        setYourRank(data.yourRank);
        setYourPercentile(data.yourPercentile);
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-sky-50 to-emerald-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">WWII Warm‑Up: Guess the Numbers</h1>
            <p className="text-slate-600">Make your best estimate, then see how close you were.</p>
          </div>
        </motion.div>

        <div className="rounded-2xl border p-4 bg-white/90 backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <div className="text-sm font-medium">Your name</div>
              <input className="mt-1 w-full border rounded px-3 py-2" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g., Jordan" />
            </div>
            <div>
              <div className="text-sm font-medium">Session code</div>
              <input className="mt-1 w-full border rounded px-3 py-2" value={sessionCode} onChange={(e) => setSessionCode(e.target.value.toUpperCase())} placeholder="e.g., TEDS-1" />
            </div>
            <button onClick={handleSubmit} className="h-10 rounded bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white font-semibold">Submit</button>
            <div className="md:col-span-3 text-xs text-slate-500">Your class results are compared anonymously. Only your teacher can see names.</div>
          </div>
        </div>

        <div className="space-y-4">
          {DEFAULTS.map((q, i) => (
            <div key={q.id} className="rounded-2xl border p-4 bg-white/90 backdrop-blur shadow-[0_6px_30px_rgba(80,80,120,0.08)]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-200 to-fuchsia-200 text-indigo-900 flex items-center justify-center font-semibold">{i + 1}</div>
                <div className="flex-1">
                  <p className="font-medium mb-2 text-slate-800">{q.prompt}</p>
                  {q.useSlider ? (
                    <div className="max-w-xl">
                      <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                        <span>
                          {q.units === "%"
                            ? `${Number(answers[q.id] ?? q.min).toLocaleString()}%`
                            : `${Number(answers[q.id] ?? q.min).toLocaleString()}${q.units ? ` ${q.units}` : ""}`}
                        </span>
                        <span className="text-slate-400">Move the slider to set your estimate</span>
                      </div>
                      <input
                        type="range"
                        min={q.min}
                        max={q.max}
                        step={q.step}
                        value={Number(answers[q.id] ?? q.min)}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: String(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <input
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      placeholder={q.units ? `Type your guess (${q.units})` : "Type your guess"}
                      className="max-w-md w-full border rounded px-3 py-2"
                    />
                  )}

                  {submitted && (
                    <div className="mt-3 text-sm">
                      <ProximityBar score={(results[i] as any).score} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {submitted && (
          <div className="rounded-xl border p-4 bg-white">
            <div className="font-semibold mb-1">Your overall estimate accuracy</div>
            <ProximityBar score={total} />
            {ranks.length > 0 && (
              <div className="mt-3 text-sm">
                <div className="mb-1">Class comparison (anonymous):</div>
                <div className="flex items-end gap-1 h-16">
                  {ranks.map((s, i) => {
                    const isYou = yourRank === i + 1;
                    const barH = Math.max(8, Math.round((s / 100) * 56));
                    return (
                      <div
                        key={i}
                        title={isYou ? `You: ${s}%` : `${s}%`}
                        className={`w-3 rounded-t ${isYou ? "bg-gradient-to-t from-fuchsia-500 to-indigo-500" : "bg-slate-300"}`}
                        style={{ height: `${barH}px` }}
                      />
                    );
                  })}
                </div>
                {typeof yourPercentile === "number" && (
                  <div className="text-slate-600 mt-1">
                    You are around the <strong>{yourPercentile.toFixed(0)}th percentile</strong> of this class.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
