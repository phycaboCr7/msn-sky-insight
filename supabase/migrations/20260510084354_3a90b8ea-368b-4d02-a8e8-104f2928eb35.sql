
-- Switch agent OS tables to Firebase-auth model: user_id becomes text (Firebase UID).
-- RLS is disabled because authentication is handled by Firebase on the client and
-- writes go through the agent-os edge function with the service role key.

drop policy if exists "own threads select" on public.agent_threads;
drop policy if exists "own threads insert" on public.agent_threads;
drop policy if exists "own threads update" on public.agent_threads;
drop policy if exists "own threads delete" on public.agent_threads;
drop policy if exists "own msgs select" on public.agent_messages;
drop policy if exists "own msgs insert" on public.agent_messages;
drop policy if exists "own msgs delete" on public.agent_messages;
drop policy if exists "own files select" on public.agent_files;
drop policy if exists "own files insert" on public.agent_files;
drop policy if exists "own files update" on public.agent_files;
drop policy if exists "own files delete" on public.agent_files;
drop policy if exists "own mem select" on public.agent_memory;
drop policy if exists "own mem insert" on public.agent_memory;
drop policy if exists "own mem delete" on public.agent_memory;

alter table public.agent_threads disable row level security;
alter table public.agent_messages disable row level security;
alter table public.agent_files disable row level security;
alter table public.agent_memory disable row level security;

alter table public.agent_threads alter column user_id type text using user_id::text;
alter table public.agent_messages alter column user_id type text using user_id::text;
alter table public.agent_files    alter column user_id type text using user_id::text;
alter table public.agent_memory   alter column user_id type text using user_id::text;
