-- Descuento por entrada al comprar con un código de PR (lo fija el club en cada tipo de entrada).
alter table ticket_types add column if not exists pr_discount int not null default 0 check (pr_discount >= 0);
alter table orders add column if not exists discount int not null default 0;
-- LA DESGRACIA: ₹249 menos en VIP, ₹49 en el resto.
update ticket_types set pr_discount = case when name ilike '%vip%' then 249 else 49 end
  where event_id = '12013bf7-f842-4da3-95f5-c0243f87dcfc';
