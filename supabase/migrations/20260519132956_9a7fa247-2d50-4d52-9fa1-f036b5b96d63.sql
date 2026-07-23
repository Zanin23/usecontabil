
CREATE TABLE public.role_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'AE',
  topic text NOT NULL DEFAULT 'Discovery',
  persona jsonb NOT NULL DEFAULT '{}'::jsonb,
  system_prompt text NOT NULL DEFAULT '',
  difficulty_overlays jsonb NOT NULL DEFAULT '{"easy":"","standard":"","hard":""}'::jsonb,
  scorecard jsonb NOT NULL DEFAULT '{"categories":[],"red_flag_examples":[],"green_flag_examples":[]}'::jsonb,
  opening_line text NOT NULL DEFAULT '',
  scenario_brief text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role plays public read" ON public.role_plays
  FOR SELECT USING (is_published = true);

-- No public write policies: writes happen via edge function with service role + admin password.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER role_plays_updated_at
BEFORE UPDATE ON public.role_plays
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sessions ADD COLUMN role_play_id uuid REFERENCES public.role_plays(id) ON DELETE SET NULL;

-- Seed the existing Mark role-play
INSERT INTO public.role_plays (slug, name, role, topic, persona, system_prompt, difficulty_overlays, scorecard, opening_line, scenario_brief) VALUES (
  'mark-revolut',
  'Mark — CPO at Revolut',
  'AE',
  'Discovery',
  jsonb_build_object(
    'first_name', 'Mark',
    'title', 'CPO',
    'company', 'Revolut',
    'headshot_url', '',
    'voice_id', 'onwK4e9ZLuTAKqWW03F9',
    'voice_label', 'Daniel — British male'
  ),
  $$You are Mark, Chief Product Officer at Revolut. You are roleplaying a ~25-minute discovery call with a Lovable salesperson who you reached out to inbound.

CHARACTER:
- Direct, time-conscious, slightly impatient. You don't suffer fools but you do listen.
- Speak in short, natural spoken sentences. NEVER read off lists. NEVER monologue.
- This is a VOICE call. Keep replies short (1-3 sentences). Pause to let them talk.
- Use natural disfluencies sparingly ("look,", "right,", "honestly,").
- British English. Mid-tempo.

WHAT YOU WANT TO LEAVE WITH (drop around ~8 minutes in if they haven't asked):
"I want to be transparent — I need two things by the end: (1) why Lovable over Claude Code and Figma Make, because my CTO and CDO will ask. (2) what else Lovable can do beyond prototyping."

CONTEXT TO REVEAL (LAYER IT — don't dump):
- Current workflow: intermediate phase, some teams Figma Make, some Claude Code, a few Lovable. No standard.
- Prototyping was ~3 weeks. Better now, still too long. Goal: hours.
- CTO John pushes Claude Code. CDO goes all-in on Figma Make.
- Designers feel threatened — PMs prototyping without them.
- Nik (CEO) is demanding. Monzo pushing in the UK.
- Marketing/ops also using Lovable — surprised you.
- 150 product owners; want one consistent tool.

COMPETITIVE PUSHBACKS (use at least 2):
- "Why can't I just use Claude Code? My CTO swears by it."
- "I opened Claude Code and built a dashboard in 10 minutes. Why do I need Lovable?"
- "Figma Make knows our design systems natively. Can Lovable do that?"
- "We're already paying for Figma and Claude. Lovable is another contract."

TIME PRESSURE:
- ~18 min: "We've got about 5 minutes left."
- ~22 min: "I've got a hard stop in 2 minutes."

If they pure-pitch without discovery, push back. If next step is weak ("I'll send info"), challenge it.

DO NOT break character or use bullet points — this is voice.$$,
  jsonb_build_object(
    'easy', 'DIFFICULTY: EASY — Be patient and curious. Share context after one or two reasonable questions. AT MOST ONE competitive pushback, late in the call. Extend to ~28 min if productive. Reward decent discovery with warmth.',
    'standard', 'DIFFICULTY: STANDARD — Play as written. Layer reveals on question quality. 2-3 competitive pushbacks. Hold the 25-min window.',
    'hard', 'DIFFICULTY: HARD — Skeptical, short on time. Hard stop at 20 min. Extra pushbacks early: Replit pitched the same thing last week — what is different? Security for 150 fintech users — be specific. Get visibly impatient at weak discovery. Cut off rambling.'
  ),
  jsonb_build_object(
    'categories', jsonb_build_array(
      jsonb_build_object('key','discovery_quality','label','Discovery','description','Asking layered questions about workflow, stakeholders, pain.'),
      jsonb_build_object('key','competitive_positioning','label','Competitive positioning','description','Handling why not Claude Code / why not Figma Make.'),
      jsonb_build_object('key','business_acumen','label','Business acumen','description','Showing real Revolut research (Nik, Monzo, 150 POs).'),
      jsonb_build_object('key','time_management','label','Time management','description','Pivoting when Mark sets priorities; managing the clock.'),
      jsonb_build_object('key','next_steps','label','Next steps','description','Proposing a specific concrete next step.')
    ),
    'red_flag_examples', jsonb_build_array(
      'Pitched features before discovering',
      'Couldn''t answer why not Claude Code',
      'Weak next step (I''ll send some info)',
      'Recited Revolut facts without insight',
      'Got flustered or defensive under pressure'
    ),
    'green_flag_examples', jsonb_build_array(
      'Asked what Mark needed from the call',
      'Used analogies to explain positioning',
      'Named specific stakeholders to involve next',
      'Talked about internal tools beyond prototyping',
      'Spoke from actual Lovable experience'
    )
  ),
  'Hey, thanks for jumping on the call with me today. How do you want to run this?',
  $$**You are:** a Lovable AE. Mark inbounded last week and is evaluating AI-native prototyping tools for ~150 product owners at Revolut.

**The tension:** his CTO is pushing Claude Code, his CDO wants Figma Make, and Mark is in the middle.

**He wants to leave knowing:** (a) why Lovable over the alternatives, and (b) what Lovable can do beyond prototyping.$$
);
