# Sales Role-Play Trainer

A remixable template for practicing live sales calls against an AI buyer. Reps pick a role-play, speak through their browser mic, and get scored on discovery, objection handling, and closing.

## What's inside

- **Live voice role-plays** — either via the browser's built-in voice (free, no setup) or ElevenLabs (lifelike, requires a $5/mo Starter plan).
- **AI scoring** — every session gets a scorecard with green/red flags and coaching notes, powered by Lovable AI.
- **Custom role-plays** — describe a scenario in plain English and the app generates the persona, opening line, and scorecard for you.
- **Leaderboards** per role-play.
- **Admin panel** for managing voices, role-plays, knowledge, and teammates.

## First run after remixing

1. Sign in with Google. The first user to sign in is auto-promoted to admin.
2. (Optional) If you want lifelike voices, open the workspace **Connectors** screen and connect **ElevenLabs** — a paid Starter plan ($5/mo) is required, since ElevenLabs blocks API access on the free tier. Once connected, the key is available to the app automatically — no pasting.
3. You'll be sent to `/setup` — a short wizard:
   - Pick **Browser voice** (free) or **ElevenLabs** (uses the connector above).
   - Pick a default voice.
   - Optionally paste company knowledge (pitch docs, battlecards) so the AI buyer knows your product.
4. You land on the home page with 4 seed role-plays ready to try.
5. Build your own from the **Build your own role-play** card.

No backend setup needed — Lovable Cloud handles the database, auth, edge functions, and AI.

## Tech

Vite + React + TypeScript, Tailwind, shadcn-style components, Lovable Cloud (Supabase under the hood), Lovable AI Gateway for LLM calls, ElevenLabs for TTS.

## License

MIT — fork it, brand it, ship it.
