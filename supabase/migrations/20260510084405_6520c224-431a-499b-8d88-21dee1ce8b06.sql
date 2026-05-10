
alter table public.agent_threads enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_files enable row level security;
alter table public.agent_memory enable row level security;

create policy "agent_threads open" on public.agent_threads for all using (true) with check (true);
create policy "agent_messages open" on public.agent_messages for all using (true) with check (true);
create policy "agent_files open" on public.agent_files for all using (true) with check (true);
create policy "agent_memory open" on public.agent_memory for all using (true) with check (true);
