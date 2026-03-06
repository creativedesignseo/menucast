-- Organizations (restaurantes)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- Screens (pantallas físicas)
create table public.screens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'Pantalla sin nombre',
  status text not null default 'offline' check (status in ('online', 'offline')),
  last_seen_at timestamptz,
  current_playlist_id uuid,
  pairing_code text unique,
  device_info jsonb,
  created_at timestamptz not null default now()
);

-- Content items (imágenes y videos)
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null check (type in ('image', 'video')),
  storage_url text not null,
  duration_seconds integer not null default 10,
  created_at timestamptz not null default now()
);

-- Playlists
create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Playlist items
create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  position integer not null default 0,
  duration_seconds integer not null default 10
);

-- Foreign key tardía (evita dependencia circular)
alter table public.screens
  add constraint screens_current_playlist_id_fkey
  foreign key (current_playlist_id) references public.playlists(id) on delete set null;

-- Row Level Security
alter table public.organizations enable row level security;
alter table public.screens enable row level security;
alter table public.content_items enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;

-- Policies
create policy "Owner accesses own org" on public.organizations
  using (owner_id = auth.uid());

create policy "Owner accesses own screens" on public.screens
  using (org_id in (select id from public.organizations where owner_id = auth.uid()));

create policy "Owner accesses own content" on public.content_items
  using (org_id in (select id from public.organizations where owner_id = auth.uid()));

create policy "Owner accesses own playlists" on public.playlists
  using (org_id in (select id from public.organizations where owner_id = auth.uid()));

create policy "Owner accesses own playlist items" on public.playlist_items
  using (playlist_id in (
    select id from public.playlists where org_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  ));

-- Policy para pantallas: lectura pública (para vinculación por pairing_code)
create policy "Public screen read" on public.screens
  for select using (true);

-- Realtime
alter publication supabase_realtime add table public.screens;
alter publication supabase_realtime add table public.playlists;
alter publication supabase_realtime add table public.playlist_items;
