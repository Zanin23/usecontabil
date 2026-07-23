
create table public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.knowledge_docs enable row level security;

create policy "Knowledge docs public read"
  on public.knowledge_docs for select
  using (true);

create policy "Knowledge docs admin insert"
  on public.knowledge_docs for insert
  to authenticated
  with check (auth.uid() = 'bccbba25-ea65-4d73-a359-d2d960041a85'::uuid);

create policy "Knowledge docs admin update"
  on public.knowledge_docs for update
  to authenticated
  using (auth.uid() = 'bccbba25-ea65-4d73-a359-d2d960041a85'::uuid)
  with check (auth.uid() = 'bccbba25-ea65-4d73-a359-d2d960041a85'::uuid);

create policy "Knowledge docs admin delete"
  on public.knowledge_docs for delete
  to authenticated
  using (auth.uid() = 'bccbba25-ea65-4d73-a359-d2d960041a85'::uuid);

create trigger knowledge_docs_set_updated_at
  before update on public.knowledge_docs
  for each row execute function public.set_updated_at();

insert into public.knowledge_docs (slug, title, content)
values ('global', 'Global knowledge', '')
on conflict (slug) do nothing;
