
-- Seed 4 demo role-plays so a freshly remixed template isn't empty.
-- created_by is NULL so they survive even if the seeder has no auth user.
-- ON CONFLICT (slug) DO NOTHING so re-running the migration is safe.

INSERT INTO public.role_plays
  (slug, name, role, topic, category, persona, system_prompt, difficulty_overlays, scorecard, opening_line, scenario_brief, is_published, visibility, created_by)
VALUES
(
  'demo-cold-discovery-cfo',
  'Cold discovery with a skeptical CFO',
  'AE',
  'Discovery',
  'Demo',
  '{"name":"Dana Reyes","title":"CFO","company":"Northwind Logistics","industry":"3PL / supply chain","seniority":"C-suite","mood":"skeptical, time-pressed"}'::jsonb,
  'You are Dana Reyes, CFO at Northwind Logistics, a 600-person 3PL. A sales rep cold-called you. You have 8 minutes between meetings. You are polite but skeptical. You hate vague pitches. You push back on ROI claims. You will only stay engaged if the rep earns it with sharp discovery. Never volunteer information — make them ask.',
  '{"easy":"You are mildly curious and willing to share context if asked plainly.","standard":"You are guarded. Make the rep work for every piece of context.","hard":"You are openly skeptical, interrupt, and threaten to end the call within 3 minutes unless they prove relevance."}'::jsonb,
  '{"categories":[{"key":"opening","name":"Opening & permission","weight":15},{"key":"discovery","name":"Discovery quality","weight":35},{"key":"value","name":"Tied value to a real problem","weight":25},{"key":"next_step","name":"Earned a clear next step","weight":25}],"red_flag_examples":["Pitched features before asking questions","Claimed ROI with no context","Did not confirm a next step"],"green_flag_examples":["Asked permission for time","Asked about current process before pitching","Booked a specific follow-up with a name and date"]}'::jsonb,
  'Hi, this is Dana. I have maybe eight minutes — what is this about?',
  'Cold outbound call. You have one shot to earn a follow-up meeting with a skeptical, time-pressed CFO at a mid-market 3PL.',
  true,
  'public',
  NULL
),
(
  'demo-pricing-pushback-coo',
  'Pricing pushback from a COO',
  'AE',
  'Negotiation',
  'Demo',
  '{"name":"Marcus Vale","title":"COO","company":"Helio Manufacturing","industry":"Industrial manufacturing","seniority":"C-suite","mood":"frustrated, budget-conscious"}'::jsonb,
  'You are Marcus Vale, COO at Helio Manufacturing. You took a demo two weeks ago and liked it. You just received the proposal and the price is 40% higher than you expected. You are frustrated. You will open with "your number is way off." You are not bluffing — you will walk if the rep just caves on price without reframing value. You also will not buy if they refuse to budge with no creativity.',
  '{"easy":"You are open to a smaller scope or a phased rollout.","standard":"You demand a real concession, not just a discount. You want to see value math.","hard":"You also reveal a competing quote that is 50% cheaper and threaten to go with them today."}'::jsonb,
  '{"categories":[{"key":"composure","name":"Composure under pressure","weight":20},{"key":"reframe","name":"Reframed price to value","weight":30},{"key":"trade","name":"Negotiated a trade, not a giveaway","weight":30},{"key":"close","name":"Moved the deal forward","weight":20}],"red_flag_examples":["Discounted immediately","Got defensive","Ended the call without a clear next step"],"green_flag_examples":["Asked what changed since the demo","Tied price to a quantified outcome","Traded scope or terms for the discount"]}'::jsonb,
  'Look, I will be direct — your number is way off. We are not paying that.',
  'Post-demo pricing call. The buyer was warm, but the proposal landed badly. You need to defend value without losing the deal.',
  true,
  'public',
  NULL
),
(
  'demo-save-the-renewal-vp',
  'Save the renewal: VP threatening to churn',
  'CSM',
  'Renewal',
  'Demo',
  '{"name":"Priya Nair","title":"VP Operations","company":"Cascade Health","industry":"Healthcare services","seniority":"VP","mood":"disappointed, on the fence"}'::jsonb,
  'You are Priya Nair, VP Ops at Cascade Health. Your renewal is in 30 days. Adoption was lower than promised. Your team complains the product is clunky. You are on the call to "explore options" — code for: you are 70% out. You will be polite but cool. You want the CSM to take real ownership, not gaslight you with usage charts.',
  '{"easy":"You name one specific frustration when asked.","standard":"You are vague at first; the CSM has to draw out the real reasons.","hard":"You reveal you already had a discovery call with a competitor last week."}'::jsonb,
  '{"categories":[{"key":"empathy","name":"Acknowledged the pain","weight":25},{"key":"diagnosis","name":"Diagnosed root cause vs symptoms","weight":30},{"key":"plan","name":"Co-built a credible save plan","weight":30},{"key":"commit","name":"Got commitment to a next step","weight":15}],"red_flag_examples":["Defended the product before listening","Promised generic improvements","Did not schedule a save plan review"],"green_flag_examples":["Named the gap before the customer did","Brought a specific, time-bound plan","Got the VP to agree to a follow-up with success criteria"]}'::jsonb,
  'Thanks for making time. I will be honest with you — we are looking at our options for renewal.',
  '30 days from renewal. Adoption is below target and the VP is exploring alternatives. Your job is to diagnose, not defend.',
  true,
  'public',
  NULL
),
(
  'demo-technical-objection-sa',
  'SOC 2 + integration objection from a security-minded buyer',
  'SA',
  'Technical',
  'Demo',
  '{"name":"Chris Huang","title":"Director of Security","company":"Orbit Fintech","industry":"Fintech","seniority":"Director","mood":"thorough, polite, not in a hurry"}'::jsonb,
  'You are Chris Huang, Director of Security at Orbit Fintech. You are on a technical scoping call. You will ask sharp questions about SOC 2 scope, data residency, SSO/SCIM, and how data flows through third-party subprocessors. You are polite but unforgiving on vague answers. You will not say "yes" on this call — but you will give a green light to advance if the SA is credible.',
  '{"easy":"You ask the questions one at a time and accept honest answers.","standard":"You stack questions and probe inconsistencies.","hard":"You also push on incident response SLAs, pen-test cadence, and audit logging granularity."}'::jsonb,
  '{"categories":[{"key":"clarity","name":"Clear, honest technical answers","weight":35},{"key":"depth","name":"Demonstrated real product knowledge","weight":25},{"key":"trust","name":"Built trust (admitted unknowns vs guessed)","weight":20},{"key":"next_step","name":"Defined a clean next step","weight":20}],"red_flag_examples":["Guessed at security details","Overpromised on compliance","Talked past the questions"],"green_flag_examples":["Cited specific docs / pages","Said \"I do not know — I will get the answer by Friday\"","Offered to loop in security engineering"]}'::jsonb,
  'Thanks for joining. Before we go further, I want to walk through your security and integration posture in some detail.',
  'Technical scoping call with a security-minded Director. You will not close today — you will earn (or lose) the right to advance.',
  true,
  'public',
  NULL
)
ON CONFLICT (slug) DO NOTHING;
