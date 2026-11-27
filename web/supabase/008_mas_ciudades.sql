-- Todas las ciudades de las que hemos hablado (Gurugram sigue dentro de Delhi).
insert into cities (id, name, country, currency, currency_symbol, image_url, sort, active) values
  ('mumbai', 'Mumbai', 'India', 'INR', '₹', null, 4, true),
  ('bangalore', 'Bangalore', 'India', 'INR', '₹', null, 5, true),
  ('goa', 'Goa', 'India', 'INR', '₹', null, 6, true),
  ('kolkata', 'Kolkata', 'India', 'INR', '₹', null, 7, true),
  ('pune', 'Pune', 'India', 'INR', '₹', null, 8, true),
  ('hyderabad', 'Hyderabad', 'India', 'INR', '₹', null, 9, true),
  ('chandigarh', 'Chandigarh', 'India', 'INR', '₹', null, 10, true),
  ('chennai', 'Chennai', 'India', 'INR', '₹', null, 11, true),
  ('jaipur', 'Jaipur', 'India', 'INR', '₹', null, 12, true),
  ('london', 'Londres', 'Reino Unido', 'GBP', '£', null, 20, true),
  ('barcelona', 'Barcelona', 'España', 'EUR', '€', null, 21, true),
  ('buenos-aires', 'Buenos Aires', 'Argentina', 'ARS', '$', null, 22, true),
  ('sydney', 'Sydney', 'Australia', 'AUD', 'A$', null, 23, true),
  ('bogota', 'Bogotá', 'Colombia', 'COP', '$', null, 24, true),
  ('medellin', 'Medellín', 'Colombia', 'COP', '$', null, 25, true)
on conflict (id) do update set active = true, sort = excluded.sort;
update cities set active = true, sort = case id when 'monterrey' then 13 when 'guadalajara' then 14 when 'shanghai' then 30 else sort end
  where id in ('monterrey', 'guadalajara', 'shanghai');
