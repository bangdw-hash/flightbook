create table public.flightbook_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision integer not null default 0 check (revision >= 0)
);

create table public.flightbook_invites (
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  invitee_email text not null check (
    invitee_email = lower(btrim(invitee_email)) and position('@' in invitee_email) > 1
  ),
  primary key (owner_id, invitee_email)
);

create index flightbook_invites_by_recipient on public.flightbook_invites (invitee_email);
alter table public.flightbook_accounts enable row level security;
alter table public.flightbook_invites enable row level security;
revoke all on public.flightbook_accounts, public.flightbook_invites from anon, authenticated;
grant select, insert, update on public.flightbook_accounts to authenticated;
grant select, insert, delete on public.flightbook_invites to authenticated;

create policy "read own account" on public.flightbook_accounts for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "create own account" on public.flightbook_accounts for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "update own account" on public.flightbook_accounts for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "manage own invites" on public.flightbook_invites for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create function public.flightbook_shared_notes()
returns table(note jsonb)
language sql stable security definer set search_path = ''
as $$
  select item.value
  from public.flightbook_invites invite
  join public.flightbook_accounts account on account.owner_id = invite.owner_id
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(account.payload->'notes') = 'array' then account.payload->'notes' else '[]'::jsonb end
  ) item
  where invite.invitee_email = (
    select lower(users.email) from auth.users
    where users.id = (select auth.uid()) and users.email_confirmed_at is not null
  )
    and item.value->'shared' = 'true'::jsonb;
$$;
revoke all on function public.flightbook_shared_notes() from public, anon;
grant execute on function public.flightbook_shared_notes() to authenticated;
