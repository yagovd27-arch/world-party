-- la nit — panel de clubs (ejecutar después de schema.sql)

-- Los clubs no pueden marcarse a sí mismos como verificados: solo editan sus datos.
revoke update on clubs from authenticated;
grant update (name, area, address, instagram, phone) on clubs to authenticated;

-- ¿Es el usuario actual administrador de la plataforma?
create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;
grant execute on function is_platform_admin() to authenticated;

-- Solo los clubs verificados pueden publicar eventos.
create or replace function check_event_publish() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published')
     and not exists (select 1 from clubs where id = new.club_id and verified)
     and not is_platform_admin() then
    raise exception 'club_not_verified';
  end if;
  return new;
end;
$$;
drop trigger if exists events_publish_check on events;
create trigger events_publish_check before insert or update on events
  for each row execute function check_event_publish();

-- Un evento no puede cambiar de club ni de ciudad una vez creado.
create or replace function lock_event_owner() returns trigger
language plpgsql as $$
begin
  if new.club_id <> old.club_id then raise exception 'cannot_move_event'; end if;
  return new;
end;
$$;
drop trigger if exists events_lock_owner on events;
create trigger events_lock_owner before update on events
  for each row execute function lock_event_owner();

-- Fotos: cada usuario sube a su carpeta (user id) dentro del bucket.
drop policy if exists "event images upload by logged users" on storage.objects;
create policy "event images upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-images' and (storage.foldername(name))[1] = auth.uid()::text);
