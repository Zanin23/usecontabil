
-- assignments table
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  target_type text not null check (target_type in ('lesson','path','track')),
  target_id uuid not null,
  assigned_by uuid,
  due_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index assignments_user_idx on public.assignments(user_id);
create index assignments_target_idx on public.assignments(target_type, target_id);
create unique index assignments_unique on public.assignments(user_id, target_type, target_id);

alter table public.assignments enable row level security;

create policy "assignments select own or admin" on public.assignments
  for select to authenticated
  using (user_id = auth.uid() or has_role(auth.uid(),'admin'));

create policy "assignments admin insert" on public.assignments
  for insert to authenticated
  with check (has_role(auth.uid(),'admin'));

create policy "assignments admin update" on public.assignments
  for update to authenticated
  using (has_role(auth.uid(),'admin'))
  with check (has_role(auth.uid(),'admin'));

create policy "assignments admin delete" on public.assignments
  for delete to authenticated
  using (has_role(auth.uid(),'admin'));

-- Admin RPCs for reporting
create or replace function public.admin_list_users()
returns table(user_id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(p.display_name,'Anonymous') as display_name
  from public.profiles p
  where has_role(auth.uid(),'admin')
  order by display_name
$$;

create or replace function public.admin_lesson_completions()
returns table(user_id uuid, lesson_id uuid, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select user_id, lesson_id, completed_at from public.lesson_completions
  where has_role(auth.uid(),'admin')
$$;

-- Lock down sessions: preserve anonymous practice + owner access + admin
drop policy if exists "Sessions public select" on public.sessions;
drop policy if exists "Sessions public insert" on public.sessions;
drop policy if exists "Sessions public update" on public.sessions;
drop policy if exists "Sessions public delete" on public.sessions;

create policy "Sessions select own or anon or admin" on public.sessions
  for select to public
  using (user_id is null or user_id = auth.uid() or has_role(auth.uid(),'admin'));

create policy "Sessions insert anon or own" on public.sessions
  for insert to public
  with check (user_id is null or user_id = auth.uid());

create policy "Sessions update own or anon or admin" on public.sessions
  for update to public
  using (user_id is null or user_id = auth.uid() or has_role(auth.uid(),'admin'))
  with check (user_id is null or user_id = auth.uid() or has_role(auth.uid(),'admin'));

create policy "Sessions delete own or admin" on public.sessions
  for delete to public
  using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
