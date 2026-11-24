-- PRs (promotores): cada uno tiene su código; los pedidos guardan qué PR los trajo.
-- la nit solo lleva la cuenta: el club le paga la comisión al PR directamente.

create table if not exists promoters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{3,16}$'),
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- PRs que trabajan con un club, con su % de comisión y lo que el club ya les ha pagado.
create table if not exists club_promoters (
  club_id uuid not null references clubs(id) on delete cascade,
  promoter_id uuid not null references promoters(id) on delete cascade,
  commission_pct numeric(5,2) not null default 10 check (commission_pct between 0 and 50),
  paid int not null default 0 check (paid >= 0),
  created_at timestamptz not null default now(),
  primary key (club_id, promoter_id)
);

alter table orders add column if not exists promoter_id uuid references promoters(id) on delete set null;
create index if not exists orders_promoter_idx on orders(promoter_id) where promoter_id is not null;

alter table promoters enable row level security;
alter table club_promoters enable row level security;

drop policy if exists "promoter reads self" on promoters;
create policy "promoter reads self" on promoters for select to authenticated using (user_id = auth.uid());

drop policy if exists "club reads its promoters" on club_promoters;
create policy "club reads its promoters" on club_promoters for select to authenticated using (is_club_member(club_id));

revoke all on promoters, club_promoters from anon;
grant select on promoters, club_promoters to authenticated;
