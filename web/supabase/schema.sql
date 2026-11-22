-- denoche — esquema de base de datos (Supabase / Postgres)
-- Ejecutar una vez en Supabase: SQL Editor → New query → pegar → Run.

create extension if not exists pgcrypto;

-- Ciudades
create table if not exists cities (
  id text primary key,                 -- 'delhi', 'gurugram', 'puebla'...
  name text not null,
  country text not null,
  currency text not null,              -- 'INR', 'MXN', 'CNY', 'AUD', 'ARS'
  currency_symbol text not null,       -- '₹', '$', '¥'
  image_url text,
  sort int not null default 0,
  active boolean not null default true
);

-- Clubs
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_id text not null references cities(id),
  area text,
  address text,
  instagram text,
  phone text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Quién puede gestionar cada club (dueño, marketing, puerta)
create table if not exists club_members (
  club_id uuid not null references clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager','door')),
  primary key (club_id, user_id)
);

-- Administradores de la plataforma (tú y tu socio)
create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Eventos
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  city_id text not null references cities(id),
  title text not null,
  description text,
  lineup text[] not null default '{}',
  type text not null default 'club' check (type in ('club','concierto','fiesta')),
  starts_at timestamptz not null,
  image_url text,
  min_age int not null default 18,
  dress_code text,
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists events_city_starts on events (city_id, starts_at);

-- Tipos de entrada (early bird, general, VIP...)
create table if not exists ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  price int not null check (price >= 0),     -- en unidades de la moneda (₹, $...)
  capacity int not null check (capacity >= 0),
  sold int not null default 0,
  sales_end timestamptz,
  sort int not null default 0
);

-- Pedidos (una compra)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  subtotal int not null,
  service_fee int not null,
  total int not null,
  currency text not null,
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  payment_provider text,                 -- 'razorpay' | 'demo'
  provider_order_id text,
  provider_payment_id text,
  access_key uuid not null default gen_random_uuid(),   -- para ver las entradas sin cuenta
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists order_items (
  order_id uuid not null references orders(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id),
  qty int not null check (qty > 0),
  unit_price int not null,
  primary key (order_id, ticket_type_id)
);

-- Entradas individuales con su QR
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  event_id uuid not null references events(id),
  ticket_type_id uuid not null references ticket_types(id),
  code text not null unique,
  scanned_at timestamptz,
  scanned_by uuid references auth.users(id)
);

-- ¿Es el usuario actual miembro de este club?
create or replace function is_club_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from club_members where club_id = cid and user_id = auth.uid())
      or exists (select 1 from platform_admins where user_id = auth.uid());
$$;

-- Confirmar un pedido pagado: suma vendidas (sin pasarse del cupo) y crea las entradas.
create or replace function confirm_order(oid uuid, provider_payment text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  it record;
  i int;
begin
  select * into o from orders where id = oid for update;
  if o.status = 'paid' then return; end if;
  for it in select * from order_items where order_id = oid loop
    update ticket_types set sold = sold + it.qty
      where id = it.ticket_type_id and sold + it.qty <= capacity;
    if not found then raise exception 'sold_out'; end if;
    for i in 1..it.qty loop
      insert into tickets (order_id, event_id, ticket_type_id, code)
      values (oid, o.event_id, it.ticket_type_id,
              upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)));
    end loop;
  end loop;
  update orders set status = 'paid', paid_at = now(), provider_payment_id = provider_payment where id = oid;
end;
$$;

-- Escanear una entrada en la puerta (solo miembros del club del evento)
create or replace function scan_ticket(ticket_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  t record;
begin
  select tk.*, e.club_id, e.title, tt.name as type_name
    into t
    from tickets tk join events e on e.id = tk.event_id join ticket_types tt on tt.id = tk.ticket_type_id
    where tk.code = upper(ticket_code);
  if not found then return json_build_object('ok', false, 'reason', 'not_found'); end if;
  if not is_club_member(t.club_id) then return json_build_object('ok', false, 'reason', 'forbidden'); end if;
  if t.scanned_at is not null then
    return json_build_object('ok', false, 'reason', 'used', 'scanned_at', t.scanned_at, 'type', t.type_name, 'event', t.title);
  end if;
  update tickets set scanned_at = now(), scanned_by = auth.uid() where id = t.id;
  return json_build_object('ok', true, 'type', t.type_name, 'event', t.title);
end;
$$;

-- Seguridad (Row Level Security)
alter table cities enable row level security;
alter table clubs enable row level security;
alter table club_members enable row level security;
alter table platform_admins enable row level security;
alter table events enable row level security;
alter table ticket_types enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table tickets enable row level security;

-- Público: ciudades, clubs, eventos publicados y sus entradas
create policy "cities public" on cities for select using (true);
create policy "clubs public" on clubs for select using (true);
create policy "events public" on events for select using (status = 'published' or is_club_member(club_id));
create policy "ticket types public" on ticket_types for select
  using (exists (select 1 from events e where e.id = event_id and (e.status = 'published' or is_club_member(e.club_id))));

-- Miembros: gestionan su club, sus eventos y sus entradas
create policy "members see own membership" on club_members for select using (user_id = auth.uid() or is_club_member(club_id));
create policy "members update club" on clubs for update using (is_club_member(id));
create policy "members insert events" on events for insert with check (is_club_member(club_id));
create policy "members update events" on events for update using (is_club_member(club_id));
create policy "members delete events" on events for delete using (is_club_member(club_id));
create policy "members manage ticket types" on ticket_types for all
  using (exists (select 1 from events e where e.id = event_id and is_club_member(e.club_id)))
  with check (exists (select 1 from events e where e.id = event_id and is_club_member(e.club_id)));
create policy "members read orders" on orders for select
  using (exists (select 1 from events e where e.id = event_id and is_club_member(e.club_id)));
create policy "members read order items" on order_items for select
  using (exists (select 1 from orders o join events e on e.id = o.event_id where o.id = order_id and is_club_member(e.club_id)));
create policy "members read tickets" on tickets for select
  using (exists (select 1 from events e where e.id = event_id and is_club_member(e.club_id)));
create policy "admins see admins" on platform_admins for select using (user_id = auth.uid());

-- Los pedidos y entradas los crea el servidor con la clave de servicio (no hay políticas de insert públicas).

-- Fotos de los eventos (bucket público)
insert into storage.buckets (id, name, public) values ('event-images', 'event-images', true)
  on conflict (id) do nothing;
create policy "event images public read" on storage.objects for select using (bucket_id = 'event-images');
create policy "event images upload by logged users" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-images');
