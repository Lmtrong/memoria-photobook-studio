-- ============================================================================
-- MEMORIA PHOTOBOOK STUDIO — SUPABASE CLOUD SCHEMA (FREE TIER)
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> New Query
-- Dán toàn bộ nội dung file này vào và nhấn "RUN".
-- ============================================================================

-- 1. Bảng Tài khoản người dùng (Hỗ trợ đăng ký bằng Gmail hoặc Số điện thoại + Username + Password)
create table if not exists public.memoria_users (
  id text primary key,
  username text unique not null,
  email_or_phone text unique not null,
  contact_type text not null default 'email', -- 'email' hoặc 'phone'
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- 2. Bảng Lưu trữ Album & Phân quyền Chủ sở hữu (Owner) / Khách xem (Public Viewer)
create table if not exists public.memoria_albums (
  id text primary key,
  owner_id text not null references public.memoria_users(id) on delete cascade,
  owner_username text not null,
  owner_name text not null,
  title text not null,
  is_public boolean not null default true,
  album_data jsonb not null,
  photo_urls jsonb not null default '{}'::jsonb,
  audio_url text,
  audio_meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_memoria_albums_owner_id on public.memoria_albums(owner_id);

-- 3. Bật Row Level Security (RLS) và cấp quyền truy cập cho ứng dụng Web
alter table public.memoria_users enable row level security;
alter table public.memoria_albums enable row level security;

drop policy if exists "Allow public read and register users" on public.memoria_users;
create policy "Allow public read and register users"
  on public.memoria_users
  for all
  using (true)
  with check (true);

drop policy if exists "Allow public read and sync albums" on public.memoria_albums;
create policy "Allow public read and sync albums"
  on public.memoria_albums
  for all
  using (true)
  with check (true);

-- 4. Tạo Bucket lưu trữ hình ảnh HD & nhạc nền đã cắt (Public CDN)
insert into storage.buckets (id, name, public)
values ('memoria-media', 'memoria-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public read memoria-media" on storage.objects;
create policy "Allow public read memoria-media"
  on storage.objects for select
  using (bucket_id = 'memoria-media');

drop policy if exists "Allow public upload memoria-media" on storage.objects;
create policy "Allow public upload memoria-media"
  on storage.objects for insert
  with check (bucket_id = 'memoria-media');

drop policy if exists "Allow public update memoria-media" on storage.objects;
create policy "Allow public update memoria-media"
  on storage.objects for update
  using (bucket_id = 'memoria-media');

drop policy if exists "Allow public delete memoria-media" on storage.objects;
create policy "Allow public delete memoria-media"
  on storage.objects for delete
  using (bucket_id = 'memoria-media');
