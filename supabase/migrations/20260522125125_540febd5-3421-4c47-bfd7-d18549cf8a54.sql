
-- 1. Roles
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles select own" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "user_roles admin insert" on public.user_roles
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "user_roles admin update" on public.user_roles
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "user_roles admin delete" on public.user_roles
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Seed initial admin (existing hard-coded admin UID from prior RLS)
insert into public.user_roles (user_id, role)
values ('bccbba25-ea65-4d73-a359-d2d960041a85', 'admin')
on conflict do nothing;

-- 2. Learn schema
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  badge_label text,
  order_index int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  icon text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (track_id, slug)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  slug text not null,
  title text not null,
  blurb text not null default '',
  embed_url text not null default '',
  thumbnail_url text,
  tags text[] not null default '{}',
  est_minutes int not null default 5,
  order_index int not null default 0,
  is_published boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (path_id, slug)
);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.tracks enable row level security;
alter table public.learning_paths enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_completions enable row level security;

-- Public read of published content
create policy "tracks public read" on public.tracks
  for select using (is_published or public.has_role(auth.uid(), 'admin'));
create policy "tracks admin write" on public.tracks
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "paths public read" on public.learning_paths
  for select using (true);
create policy "paths admin write" on public.learning_paths
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "lessons public read" on public.lessons
  for select using (is_published or public.has_role(auth.uid(), 'admin'));
create policy "lessons admin write" on public.lessons
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "completions select own" on public.lesson_completions
  for select to authenticated using (user_id = auth.uid());
create policy "completions insert own" on public.lesson_completions
  for insert to authenticated with check (user_id = auth.uid());
create policy "completions delete own" on public.lesson_completions
  for delete to authenticated using (user_id = auth.uid());

-- 3. Reseat existing admin RLS to use has_role
drop policy if exists "Knowledge docs admin delete" on public.knowledge_docs;
drop policy if exists "Knowledge docs admin insert" on public.knowledge_docs;
drop policy if exists "Knowledge docs admin update" on public.knowledge_docs;
create policy "Knowledge docs admin delete" on public.knowledge_docs
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Knowledge docs admin insert" on public.knowledge_docs
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Knowledge docs admin update" on public.knowledge_docs
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Role plays owner or admin delete" on public.role_plays;
drop policy if exists "Role plays owner or admin update" on public.role_plays;
create policy "Role plays owner or admin delete" on public.role_plays
  for delete to authenticated
  using (created_by = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Role plays owner or admin update" on public.role_plays
  for update to authenticated
  using (created_by = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (created_by = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- 4. Seed Onboarding track + six paths
insert into public.tracks (slug, title, description, badge_label, order_index)
values ('onboarding', 'Onboarding', 'Everything a new hire needs to sell Lovable in the enterprise.', 'Best for new hires', 0);

insert into public.learning_paths (track_id, slug, title, description, icon, order_index)
select id, p.slug, p.title, p.description, p.icon, p.order_index
from public.tracks t,
  (values
    ('know-the-market', 'Know the Market', 'What Lovable actually is, the two enterprise use cases (prototyping + internal apps), how to demo it credibly, and how to build live in a call. Prerequisite for everything else.', 'Compass', 0),
    ('find-the-fire', 'Find the Fire', 'The core discovery skill. The first question, the two branches (fan vs. light), the three buyer archetypes, Three Whys.', 'Flame', 1),
    ('know-the-buyer', 'Know the Buyer', 'Enterprise persona profiles, product/innovation-oriented leader vs. IT buyer, AI mandate vs. shadow IT expansion deals — what motivates each archetype and what stalls them.', 'Users', 2),
    ('run-the-deal', 'Run the Deal', 'Buying-aligned stages, champion development, mutual action plans, a business case that survives a room you''re not in. The Klaviyo lesson lives here.', 'Briefcase', 3),
    ('navigate-the-machine', 'Navigate the Machine', 'Procurement, legal, security review, vendor risk assessment, IT stakeholders. What to expect, when, and how to get ahead of it.', 'Settings', 4),
    ('work-ai-native', 'Work AI-Native', 'Tools and workflows, AI in the actual sales motion. WhisperFlow, the roleplay app, prep and follow-up. The meta-skill of selling an AI product using AI.', 'Sparkles', 5)
  ) as p(slug, title, description, icon, order_index)
where t.slug = 'onboarding';
