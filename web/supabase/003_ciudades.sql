-- 3 ciudades: Delhi (Gurugram pasa a ser una zona de Delhi), Ciudad de México y Puebla.
update cities set name = 'Delhi' where id = 'delhi';
update clubs set area = coalesce(nullif(area, '') || ', Gurugram', 'Gurugram') where city_id = 'gurugram' and coalesce(area, '') not ilike '%gurugram%';
update clubs set city_id = 'delhi' where city_id = 'gurugram';
update events set city_id = 'delhi' where city_id = 'gurugram';
update cities set active = (id in ('delhi', 'cdmx', 'puebla'));
update cities set sort = case id when 'delhi' then 1 when 'cdmx' then 2 when 'puebla' then 3 else 9 end;
select id, name, active, sort from cities order by sort;
