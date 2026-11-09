create table public.flightbook_textbooks (
  id text primary key,
  dataset jsonb not null check (jsonb_typeof(dataset) = 'object')
);

alter table public.flightbook_textbooks enable row level security;
revoke all on public.flightbook_textbooks from public, anon, authenticated;
grant select on public.flightbook_textbooks to authenticated;
create policy "signed in students read flightbook textbook"
  on public.flightbook_textbooks for select to authenticated
  using (id = 'kai-aircraft-english' and (select auth.uid()) is not null);
