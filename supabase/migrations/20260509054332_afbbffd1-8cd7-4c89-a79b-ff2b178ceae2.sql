
create extension if not exists vector with schema extensions;

create table public.agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New task',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.agent_threads enable row level security;
create policy "own threads select" on public.agent_threads for select using (auth.uid() = user_id);
create policy "own threads insert" on public.agent_threads for insert with check (auth.uid() = user_id);
create policy "own threads update" on public.agent_threads for update using (auth.uid() = user_id);
create policy "own threads delete" on public.agent_threads for delete using (auth.uid() = user_id);

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.agent_messages enable row level security;
create policy "own msgs select" on public.agent_messages for select using (auth.uid() = user_id);
create policy "own msgs insert" on public.agent_messages for insert with check (auth.uid() = user_id);
create policy "own msgs delete" on public.agent_messages for delete using (auth.uid() = user_id);
create index agent_messages_thread_idx on public.agent_messages(thread_id, created_at);

create table public.agent_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id uuid references public.agent_threads(id) on delete cascade,
  path text not null,
  content text not null default '',
  mime text not null default 'text/plain',
  size_bytes int not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.agent_files enable row level security;
create policy "own files select" on public.agent_files for select using (auth.uid() = user_id);
create policy "own files insert" on public.agent_files for insert with check (auth.uid() = user_id);
create policy "own files update" on public.agent_files for update using (auth.uid() = user_id);
create policy "own files delete" on public.agent_files for delete using (auth.uid() = user_id);
create index agent_files_user_idx on public.agent_files(user_id, updated_at desc);

create table public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  content text not null,
  embedding extensions.vector(768),
  created_at timestamptz not null default now()
);
alter table public.agent_memory enable row level security;
create policy "own mem select" on public.agent_memory for select using (auth.uid() = user_id);
create policy "own mem insert" on public.agent_memory for insert with check (auth.uid() = user_id);
create policy "own mem delete" on public.agent_memory for delete using (auth.uid() = user_id);
create index agent_memory_user_idx on public.agent_memory(user_id, created_at desc);
