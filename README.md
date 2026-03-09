# WWII Warm‑Up: Guess the Numbers (Vercel)

A colorful, slider‑based warm‑up quiz for estimating WWII big‑picture facts, with proximity‑based feedback and anonymous class comparison. Students enter a session code; teacher can privately view names/scores.

## Deploy (Vercel)
1. Connect this repo to Vercel → New Project → select repo  
2. In Vercel, **Storage** → **Create a Database** → choose **Upstash for Redis** → Add to this project (Production)  
3. Wait for Vercel to auto‑deploy. Click **Visit**.

## Create a class session
Open your deployed site, then run in the browser console:
```js
fetch('/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session: 'TEDS-1', adminKey: 'SECRET123' })
}).then(r => r.json()).then(console.log);
