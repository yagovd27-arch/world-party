-- Los clubs pueden crear códigos de PR para gente sin cuenta. Si luego esa persona
-- entra en lanit.club/pr con el mismo email, el código pasa a ser suyo.
alter table promoters alter column user_id drop not null;
alter table promoters add column if not exists created_by_club uuid references clubs(id) on delete set null;
