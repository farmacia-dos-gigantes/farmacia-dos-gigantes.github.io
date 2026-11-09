-- Farmácia dos Gigantes: tabela de produtos, pasta de fotos e permissões.
-- Cole no SQL Editor do Supabase e clique em Run. Pode rodar de novo sem problema.

-- 1. Tabela de produtos
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 300),
  price numeric(10,2) check (price is null or price > 0),
  promo_price numeric(10,2) check (promo_price is null or promo_price > 0),
  image_path text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint promo_menor_que_preco
    check (promo_price is null or (price is not null and promo_price < price))
);

-- 2. Trava de segurança: só quem tem permissão mexe nas linhas
alter table public.products enable row level security;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Visitantes veem produtos ativos" on public.products;
create policy "Visitantes veem produtos ativos" on public.products
  for select to anon, authenticated using (active = true);

drop policy if exists "Admin ve todos os produtos" on public.products;
create policy "Admin ve todos os produtos" on public.products
  for select to authenticated using (true);

drop policy if exists "Admin cadastra produtos" on public.products;
create policy "Admin cadastra produtos" on public.products
  for insert to authenticated with check (true);

drop policy if exists "Admin altera produtos" on public.products;
create policy "Admin altera produtos" on public.products
  for update to authenticated using (true) with check (true);

drop policy if exists "Admin apaga produtos" on public.products;
create policy "Admin apaga produtos" on public.products
  for delete to authenticated using (true);

-- 3. Pasta de fotos (qualquer pessoa vê; só o admin envia, troca e apaga)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin envia fotos" on storage.objects;
create policy "Admin envia fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'products');

drop policy if exists "Admin lista fotos" on storage.objects;
create policy "Admin lista fotos" on storage.objects
  for select to authenticated using (bucket_id = 'products');

drop policy if exists "Admin troca fotos" on storage.objects;
create policy "Admin troca fotos" on storage.objects
  for update to authenticated using (bucket_id = 'products') with check (bucket_id = 'products');

drop policy if exists "Admin apaga fotos" on storage.objects;
create policy "Admin apaga fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'products');
