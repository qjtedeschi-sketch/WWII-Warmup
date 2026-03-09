
'use client'
import React, { useState } from 'react'

export default function Teacher() {
  const [session, setSession] = useState('TEDS-1')
  const [adminKey, setAdminKey] = useState('SECRET123')
  const [msg, setMsg] = useState('')
  const [scoresJson, setScoresJson] = useState<string>('')

  async function createSession() {
    setMsg('Creating...')
    try {
      const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session, adminKey }) })
      const d = await r.json()
      setMsg(d.ok ? (d.created ? 'Session created.' : 'Session already exists.') : 'Failed to create session')
    } catch {
      setMsg('Failed to create session')
    }
  }

  async function loadScores() {
    setMsg('Loading scores...')
    try {
      const r = await fetch(`/api/scores?session=${encodeURIComponent(session)}&adminKey=${encodeURIComponent(adminKey)}`)
      const d = await r.json()
      if (!d.ok) { setMsg('Could not load scores'); return }
      setScoresJson(JSON.stringify(d, null, 2))
      setMsg(`Loaded ${d.n ?? 0} submissions`)
    } catch {
      setMsg('Could not load scores')
    }
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-emerald-50">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">Teacher • Session & Results</h1>
        <div className="rounded-xl border bg-white/90 backdrop-blur p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-medium">Session code</div>
              <input className="mt-1 w-full border rounded px-3 py-2" value={session} onChange={(e) => setSession(e.target.value.toUpperCase())} placeholder="e.g., TEDS-1" />
            </div>
            <div>
              <div className="text-sm font-medium">Admin key (keep private)</div>
              <input className="mt-1 w-full border rounded px-3 py-2" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="e.g., SECRET123" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createSession} className="h-10 rounded bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white font-semibold px-3">Create/Use Session</button>
            <button onClick={loadScores} className="h-10 rounded bg-slate-800 text-white font-semibold px-3">Load Scores</button>
          </div>
          <div className="text-sm text-slate-600">{msg}</div>
          {scoresJson && (
            <div className="mt-2">
              <div className="text-sm font-semibold mb-1">Results (JSON)</div>
              <textarea className="w-full h-72 border rounded p-2 font-mono text-xs" value={scoresJson} readOnly />
            </div>
          )}
        </div>
        <div className="text-xs text-slate-600">
          Tip: Share the student link to your class: <code>/</code>. Students will enter name + session code and get anonymous comparison after they submit.
        </div>
      </div>
    </div>
  )
}
