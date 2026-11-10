grant select (id, dataset) on public.flightbook_textbooks to anon;

create policy "visitors read the flightbook textbook"
  on public.flightbook_textbooks for select to anon
  using (id = 'kai-aircraft-english');
