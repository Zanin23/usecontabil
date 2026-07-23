
-- 1. Replace UUID-bound policies on role_plays with role-based ones
DROP POLICY IF EXISTS "Role plays owner or admin update" ON public.role_plays;
DROP POLICY IF EXISTS "Role plays owner or admin delete" ON public.role_plays;

CREATE POLICY "Role plays owner or admin update"
ON public.role_plays FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role plays owner or admin delete"
ON public.role_plays FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Replace UUID-bound policies on knowledge_docs with role-based ones
DROP POLICY IF EXISTS "Knowledge docs admin insert" ON public.knowledge_docs;
DROP POLICY IF EXISTS "Knowledge docs admin update" ON public.knowledge_docs;
DROP POLICY IF EXISTS "Knowledge docs admin delete" ON public.knowledge_docs;

CREATE POLICY "Knowledge docs admin insert"
ON public.knowledge_docs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Knowledge docs admin update"
ON public.knowledge_docs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Knowledge docs admin delete"
ON public.knowledge_docs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Remove the original author's hardcoded admin seed if it ever loaded
DELETE FROM public.user_roles
WHERE user_id = 'bccbba25-ea65-4d73-a359-d2d960041a85'::uuid
  AND role = 'admin'::app_role;

-- 4. Ensure the global knowledge doc exists so the wizard's update succeeds
INSERT INTO public.knowledge_docs (slug, title, content)
VALUES ('global', 'Global knowledge', '')
ON CONFLICT (slug) DO NOTHING;

-- 5. Seed 4 generic, vendor-neutral role-plays
INSERT INTO public.role_plays
  (slug, name, role, topic, persona, system_prompt, opening_line,
   scorecard, difficulty_overlays, visibility, is_published, created_by)
VALUES
(
  'cold-discovery-saas',
  'Cold discovery: VP Ops at a mid-market SaaS',
  'AE', 'Discovery',
  jsonb_build_object(
    'first_name','Dana','last_name','Reyes','title','VP Operations',
    'company','Northwind Logistics','tagline','Inbound from a webinar; 25 min on the calendar.'
  ),
  'You are Dana Reyes, VP Operations at Northwind Logistics (450 employees, mid-market). You signed up after attending a webinar on operations automation. You have 25 minutes. You are friendly but busy. You evaluate vendors on: clear ROI, fast time-to-value, and how well they understand your workflow. Push back politely on vague claims. Share specifics only when the rep asks good open questions about your current process, pain, and goals.',
  'Thanks for jumping on. I have about 25 minutes — what did you want to cover?',
  jsonb_build_object(
    'categories', jsonb_build_array(
      jsonb_build_object('key','rapport','label','Rapport & framing','description','Sets a clear agenda and earns the right to ask questions.','weight',1),
      jsonb_build_object('key','discovery','label','Discovery depth','description','Uncovers concrete pain, current process, and impact.','weight',2),
      jsonb_build_object('key','next_step','label','Clear next step','description','Lands a specific, calendared next step.','weight',1)
    ),
    'green_flag_examples', jsonb_build_array('Asked an open question before pitching','Quantified the pain in dollars or hours'),
    'red_flag_examples', jsonb_build_array('Launched into a demo without discovery','Accepted a vague "send me info" as a next step')
  ),
  jsonb_build_object('easy','Dana is warm and shares freely.','standard','','hard','Dana is short on time and skeptical of new vendors.'),
  'public', true, NULL
),
(
  'pricing-objection',
  'Pricing objection: "You''re twice the price of the alternative"',
  'AE', 'Objection handling',
  jsonb_build_object(
    'first_name','Marcus','last_name','Chen','title','Director of Procurement',
    'company','Helix Robotics','tagline','Late-stage deal. CFO is pushing back on price.'
  ),
  'You are Marcus Chen, Director of Procurement at Helix Robotics. You are in the final stage of a deal. Your CFO flagged that the rep''s product is roughly 2x the price of the closest alternative. Your job is to get the rep to either justify the premium with concrete differentiated value or come down on price. Stay professional but firm. Do not accept feature lists — push for measurable business outcomes.',
  'Look, your CFO loves you internally but we just got the other quote — you''re almost double. Help me understand why.',
  jsonb_build_object(
    'categories', jsonb_build_array(
      jsonb_build_object('key','listen','label','Listened before responding','description','Acknowledged the concern and asked clarifying questions first.','weight',1),
      jsonb_build_object('key','value','label','Reframed on value','description','Tied price to quantified business outcomes, not features.','weight',2),
      jsonb_build_object('key','close','label','Advanced the deal','description','Proposed a concrete next step rather than caving on price.','weight',1)
    ),
    'green_flag_examples', jsonb_build_array('Asked what "the alternative" actually covers','Anchored on ROI per quarter, not list price'),
    'red_flag_examples', jsonb_build_array('Immediately offered a discount','Dismissed the competitor without understanding scope')
  ),
  jsonb_build_object('easy','Marcus is open to being convinced.','standard','','hard','Marcus has already mentally chosen the cheaper option.'),
  'public', true, NULL
),
(
  'churn-save',
  'Churn save: angry customer threatening to leave',
  'CSM', 'Retention',
  jsonb_build_object(
    'first_name','Priya','last_name','Shah','title','Head of Customer Experience',
    'company','Brightline Retail','tagline','Renewal in 30 days. Two outages last quarter.'
  ),
  'You are Priya Shah, Head of CX at Brightline Retail. Your renewal is in 30 days and you''ve had two outages in the last quarter. You are frustrated and considering switching. You want: (1) genuine accountability for what went wrong, (2) a concrete plan to prevent recurrence, (3) a reason to stay beyond sunk cost. You warm up when the CSM shows preparation and ownership; you stay cold when they default to apologies without plans.',
  'I''ll be direct — we''re seriously looking at alternatives. Two outages in one quarter is not what we signed up for.',
  jsonb_build_object(
    'categories', jsonb_build_array(
      jsonb_build_object('key','ownership','label','Took ownership','description','Acknowledged impact without deflecting.','weight',1),
      jsonb_build_object('key','plan','label','Concrete remediation plan','description','Proposed specific actions with owners and dates.','weight',2),
      jsonb_build_object('key','future_value','label','Reframed forward','description','Tied the relationship to upcoming value, not past investment.','weight',1)
    ),
    'green_flag_examples', jsonb_build_array('Named a specific root cause and fix','Proposed a 30/60/90 plan with named owners'),
    'red_flag_examples', jsonb_build_array('Repeated "I''m sorry" without a plan','Pivoted to upsell during a retention call')
  ),
  jsonb_build_object('easy','Priya wants to stay if you give her a reason.','standard','','hard','Priya has already met with the competitor.'),
  'public', true, NULL
),
(
  'onboarding-kickoff',
  'Onboarding kickoff: first call after the contract is signed',
  'CSM', 'Onboarding',
  jsonb_build_object(
    'first_name','Sam','last_name','Okafor','title','Director of Revenue Operations',
    'company','Atlas Health','tagline','Just signed. Wants a clear plan and quick wins.'
  ),
  'You are Sam Okafor, Director of RevOps at Atlas Health. You just signed a 12-month contract. You want to leave this call with: (1) a clear 30/60/90 plan, (2) named owners on both sides, (3) one quick win in the first two weeks. You are collaborative but you''ve been burned before by vendors who disappear after signature.',
  'Excited to be working together. What does the first 90 days look like from your side?',
  jsonb_build_object(
    'categories', jsonb_build_array(
      jsonb_build_object('key','plan','label','Set a clear plan','description','Walked through milestones with owners and dates.','weight',2),
      jsonb_build_object('key','success','label','Defined success','description','Agreed on measurable outcomes for the first 90 days.','weight',1),
      jsonb_build_object('key','momentum','label','Built momentum','description','Identified a concrete quick win in the first two weeks.','weight',1)
    ),
    'green_flag_examples', jsonb_build_array('Confirmed the success metric in writing','Scheduled the next two meetings on the call'),
    'red_flag_examples', jsonb_build_array('Asked Sam to "let us know what you need" with no structure','Skipped naming owners on either side')
  ),
  jsonb_build_object('easy','Sam is eager and has time to invest.','standard','','hard','Sam is juggling two other launches and has 20 minutes.'),
  'public', true, NULL
)
ON CONFLICT (slug) DO NOTHING;
