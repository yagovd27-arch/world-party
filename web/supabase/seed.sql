-- Ciudades iniciales. Ejecutar después de schema.sql.
insert into cities (id, name, country, currency, currency_symbol, image_url, sort) values
  ('delhi',       'Nueva Delhi',      'India',     'INR', '₹',  'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=900&q=70', 1),
  ('gurugram',    'Gurugram',         'India',     'INR', '₹',  'https://images.unsplash.com/photo-1589829973523-e4ddcbbd40e7?auto=format&fit=crop&w=900&q=70', 2),
  ('puebla',      'Puebla',           'México',    'MXN', '$',  'https://images.unsplash.com/photo-1653661279002-692227e35f0f?auto=format&fit=crop&w=900&q=70', 3),
  ('cdmx',        'Ciudad de México', 'México',    'MXN', '$',  'https://images.unsplash.com/photo-1599067821475-c47c29093bf7?auto=format&fit=crop&w=900&q=70', 4),
  ('monterrey',   'Monterrey',        'México',    'MXN', '$',  'https://images.unsplash.com/photo-1561158250-01426799e9e0?auto=format&fit=crop&w=900&q=70', 5),
  ('guadalajara', 'Guadalajara',      'México',    'MXN', '$',  'https://images.unsplash.com/photo-1599624893198-d000bdd8bef8?auto=format&fit=crop&w=900&q=70', 6),
  ('shanghai',    'Shanghai',         'China',     'CNY', '¥',  'https://images.unsplash.com/photo-1627484986972-e544190b8abb?auto=format&fit=crop&w=900&q=70', 7)
on conflict (id) do nothing;
