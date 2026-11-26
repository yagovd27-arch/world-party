-- Cargo por servicio por club (null = el general, 8%). LA DESGRACIA es de Yago: sin cargo.
alter table clubs add column if not exists fee_rate numeric(4,3) check (fee_rate between 0 and 0.2);
update clubs set fee_rate = 0 where id = '1cc1547c-fcc8-43dd-9ddd-b05cbbf29554';
