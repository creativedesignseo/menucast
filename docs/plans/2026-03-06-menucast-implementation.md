# MenuCast MVP — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build MenuCast MVP — plataforma SaaS para controlar pantallas digitales de restaurantes en tiempo real desde cualquier dispositivo.

**Architecture:** Monorepo con dos apps (Next.js dashboard + Expo mobile/TV) compartiendo un backend Supabase. El player (Android TV) es una app Expo nativa con login, reproducción offline-resilient y sincronización en tiempo real vía Supabase Realtime.

**Tech Stack:** Next.js 14, Expo SDK 51+, Supabase, Stripe, TypeScript, Turborepo

---

## Estructura del repositorio objetivo

```
menucast/
├── apps/
│   ├── dashboard/          ← Next.js 14 (App Router)
│   └── mobile-tv/          ← Expo (React Native)
├── packages/
│   └── shared/             ← tipos TypeScript compartidos + cliente Supabase
├── supabase/
│   └── migrations/         ← SQL del schema
├── docs/
│   └── plans/
└── package.json            ← workspace root (npm workspaces)
```

---

## Phase 1: Setup del proyecto

### Task 1: Inicializar monorepo

**Files:**
- Create: `package.json` (root)
- Create: `apps/dashboard/` (Next.js)
- Create: `apps/mobile-tv/` (Expo)
- Create: `packages/shared/`

**Step 1: Crear estructura base**

```bash
mkdir -p apps packages/shared supabase/migrations docs/plans
```

**Step 2: Inicializar root package.json**

```json
{
  "name": "menucast",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dashboard": "npm run dev --workspace=apps/dashboard",
    "mobile": "npm run start --workspace=apps/mobile-tv"
  }
}
```

**Step 3: Crear dashboard con Next.js**

```bash
cd apps && npx create-next-app@latest dashboard \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*"
```

**Step 4: Crear app Expo**

```bash
cd apps && npx create-expo-app mobile-tv --template blank-typescript
```

**Step 5: Inicializar shared package**

```bash
cd packages/shared && npm init -y
```

Crear `packages/shared/index.ts`:
```typescript
export * from './types'
export * from './supabase'
```

**Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: initialize monorepo with Next.js dashboard and Expo app"
```

---

### Task 2: Setup Supabase

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `packages/shared/supabase.ts`
- Create: `packages/shared/types.ts`
- Modify: `apps/dashboard/.env.local`
- Modify: `apps/mobile-tv/.env`

**Step 1: Instalar Supabase CLI y crear proyecto**

```bash
npm install -g supabase
supabase login
supabase init
```

**Step 2: Escribir el schema SQL**

Crear `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable RLS
alter default privileges in schema public grant all on tables to postgres, anon, authenticated;

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

-- Playlist items (orden + duración por item)
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

-- Policies: solo el dueño accede a sus datos
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

-- Policy especial para pantallas: puede leer por pairing_code (sin auth)
create policy "Screen reads own data by pairing code" on public.screens
  for select using (true);

-- Realtime habilitado para screens (para detectar online/offline)
alter publication supabase_realtime add table public.screens;
alter publication supabase_realtime add table public.playlists;
alter publication supabase_realtime add table public.playlist_items;
```

**Step 3: Aplicar migrations en local**

```bash
supabase start
supabase db push
```

Expected: schema aplicado sin errores.

**Step 4: Crear cliente Supabase compartido**

Crear `packages/shared/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const createSupabaseClient = (url: string, key: string) =>
  createClient<Database>(url, key)
```

**Step 5: Generar tipos desde Supabase**

```bash
supabase gen types typescript --local > packages/shared/database.types.ts
```

**Step 6: Crear tipos del dominio**

Crear `packages/shared/types.ts`:
```typescript
export type Organization = {
  id: string
  name: string
  owner_id: string
  plan: 'free' | 'pro'
  created_at: string
}

export type Screen = {
  id: string
  org_id: string
  name: string
  status: 'online' | 'offline'
  last_seen_at: string | null
  current_playlist_id: string | null
  pairing_code: string | null
}

export type ContentItem = {
  id: string
  org_id: string
  name: string
  type: 'image' | 'video'
  storage_url: string
  duration_seconds: number
}

export type Playlist = {
  id: string
  org_id: string
  name: string
}

export type PlaylistItem = {
  id: string
  playlist_id: string
  content_item_id: string
  position: number
  duration_seconds: number
  content_item?: ContentItem
}
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add Supabase schema and shared types"
```

---

## Phase 2: Dashboard Web (Next.js)

### Task 3: Auth — Registro y Login

**Files:**
- Create: `apps/dashboard/src/app/(auth)/login/page.tsx`
- Create: `apps/dashboard/src/app/(auth)/register/page.tsx`
- Create: `apps/dashboard/src/lib/supabase.ts`
- Modify: `apps/dashboard/.env.local`

**Step 1: Instalar dependencias**

```bash
cd apps/dashboard
npm install @supabase/supabase-js @supabase/ssr
```

**Step 2: Variables de entorno**

Crear `apps/dashboard/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

**Step 3: Crear cliente Supabase para Next.js**

Crear `apps/dashboard/src/lib/supabase.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

**Step 4: Página de login**

Crear `apps/dashboard/src/app/(auth)/login/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">MenuCast</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="password" placeholder="Contraseña" value={password}
          onChange={e => setPassword(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />
        <button type="submit" className="bg-black text-white rounded py-2">
          Entrar
        </button>
        <a href="/register" className="text-sm text-center text-blue-600">
          ¿No tienes cuenta? Regístrate
        </a>
      </form>
    </main>
  )
}
```

**Step 5: Página de registro**

Crear `apps/dashboard/src/app/(auth)/register/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) { setError(error?.message ?? 'Error'); return }

    // Crear organización
    const { error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName, owner_id: data.user.id })

    if (orgError) { setError(orgError.message); return }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleRegister} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          placeholder="Nombre del restaurante" value={orgName}
          onChange={e => setOrgName(e.target.value)}
          className="border rounded px-3 py-2" required
        />
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          className="border rounded px-3 py-2" required
        />
        <input
          type="password" placeholder="Contraseña" value={password}
          onChange={e => setPassword(e.target.value)}
          className="border rounded px-3 py-2" required
        />
        <button type="submit" className="bg-black text-white rounded py-2">
          Crear cuenta gratis
        </button>
      </form>
    </main>
  )
}
```

**Step 6: Verificar en browser**

```bash
cd apps/dashboard && npm run dev
```

Abrir http://localhost:3000/register → crear cuenta → debe redirigir a /dashboard.

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add auth pages (login + register) with Supabase"
```

---

### Task 4: Dashboard principal — gestión de pantallas

**Files:**
- Create: `apps/dashboard/src/app/(app)/dashboard/page.tsx`
- Create: `apps/dashboard/src/app/(app)/dashboard/screens/page.tsx`
- Create: `apps/dashboard/src/hooks/useOrganization.ts`
- Create: `apps/dashboard/src/hooks/useScreens.ts`

**Step 1: Hook para obtener organización del usuario**

Crear `apps/dashboard/src/hooks/useOrganization.ts`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Organization } from '@menucast/shared'

export function useOrganization() {
  const [org, setOrg] = useState<Organization | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single()
      setOrg(data)
    }
    fetchOrg()
  }, [])

  return org
}
```

**Step 2: Hook para pantallas**

Crear `apps/dashboard/src/hooks/useScreens.ts`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Screen } from '@menucast/shared'

export function useScreens(orgId: string | undefined) {
  const [screens, setScreens] = useState<Screen[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) return
    supabase
      .from('screens')
      .select('*')
      .eq('org_id', orgId)
      .then(({ data }) => setScreens(data ?? []))
  }, [orgId])

  const addScreen = async (name: string) => {
    if (!orgId) return
    const pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data } = await supabase
      .from('screens')
      .insert({ org_id: orgId, name, pairing_code: pairingCode })
      .select()
      .single()
    if (data) setScreens(prev => [...prev, data])
    return data
  }

  return { screens, addScreen }
}
```

**Step 3: Página de pantallas**

Crear `apps/dashboard/src/app/(app)/dashboard/screens/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { useScreens } from '@/hooks/useScreens'

export default function ScreensPage() {
  const org = useOrganization()
  const { screens, addScreen } = useScreens(org?.id)
  const [name, setName] = useState('')
  const [newScreen, setNewScreen] = useState<any>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const screen = await addScreen(name)
    setNewScreen(screen)
    setName('')
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Mis pantallas</h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-8">
        <input
          placeholder="Nombre de la pantalla"
          value={name} onChange={e => setName(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
        <button type="submit" className="bg-black text-white px-4 py-2 rounded">
          Agregar
        </button>
      </form>

      {newScreen && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
          <p className="font-medium">Pantalla creada. Código de vinculación:</p>
          <p className="text-3xl font-mono font-bold mt-2">{newScreen.pairing_code}</p>
          <p className="text-sm text-gray-500 mt-1">
            Ingresa este código en la app de Android TV
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {screens.map(screen => (
          <div key={screen.id} className="border rounded p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{screen.name}</p>
              <p className="text-sm text-gray-500">
                {screen.status === 'online'
                  ? '🟢 En línea'
                  : '🔴 Desconectada'}
              </p>
            </div>
          </div>
        ))}
        {screens.length === 0 && (
          <p className="text-gray-400">No tienes pantallas. Agrega una arriba.</p>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Verificar**

```bash
npm run dashboard
```

Ir a http://localhost:3000/dashboard/screens → agregar pantalla → debe mostrar código de vinculación.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add screen management with pairing code generation"
```

---

### Task 5: Upload de contenido

**Files:**
- Create: `apps/dashboard/src/app/(app)/dashboard/content/page.tsx`
- Create: `apps/dashboard/src/hooks/useContent.ts`

**Step 1: Configurar Supabase Storage bucket**

En Supabase dashboard: Storage → New bucket → `content` → Public: true.

O via SQL:
```sql
insert into storage.buckets (id, name, public)
values ('content', 'content', true);

create policy "Authenticated users upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'content');

create policy "Public read"
on storage.objects for select
to public
using (bucket_id = 'content');
```

**Step 2: Hook de contenido**

Crear `apps/dashboard/src/hooks/useContent.ts`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { ContentItem } from '@menucast/shared'

export function useContent(orgId: string | undefined) {
  const [items, setItems] = useState<ContentItem[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) return
    supabase
      .from('content_items')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setItems(data ?? []))
  }, [orgId])

  const uploadContent = async (file: File, name: string) => {
    if (!orgId) return
    const ext = file.name.split('.').pop()
    const path = `${orgId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('content')
      .upload(path, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('content')
      .getPublicUrl(path)

    const type = file.type.startsWith('video') ? 'video' : 'image'

    const { data } = await supabase
      .from('content_items')
      .insert({ org_id: orgId, name, type, storage_url: publicUrl })
      .select()
      .single()

    if (data) setItems(prev => [data, ...prev])
    return data
  }

  return { items, uploadContent }
}
```

**Step 3: Página de contenido**

Crear `apps/dashboard/src/app/(app)/dashboard/content/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { useContent } from '@/hooks/useContent'

export default function ContentPage() {
  const org = useOrganization()
  const { items, uploadContent } = useContent(org?.id)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadContent(file, file.name.split('.')[0])
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Contenido</h1>

      <label className="cursor-pointer bg-black text-white px-4 py-2 rounded inline-block mb-8">
        {uploading ? 'Subiendo...' : '+ Subir imagen o video'}
        <input type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
      </label>

      <div className="grid grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="border rounded overflow-hidden">
            {item.type === 'image'
              ? <img src={item.storage_url} alt={item.name} className="w-full h-40 object-cover" />
              : <video src={item.storage_url} className="w-full h-40 object-cover" muted />
            }
            <p className="p-2 text-sm font-medium truncate">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Verificar**

Subir una imagen → debe aparecer en la grilla con preview.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add content upload to Supabase Storage"
```

---

### Task 6: Playlists y asignación a pantalla

**Files:**
- Create: `apps/dashboard/src/app/(app)/dashboard/playlists/page.tsx`
- Create: `apps/dashboard/src/hooks/usePlaylists.ts`

**Step 1: Hook de playlists**

Crear `apps/dashboard/src/hooks/usePlaylists.ts`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Playlist, PlaylistItem } from '@menucast/shared'

export function usePlaylists(orgId: string | undefined) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!orgId) return
    supabase.from('playlists').select('*').eq('org_id', orgId)
      .then(({ data }) => setPlaylists(data ?? []))
  }, [orgId])

  const createPlaylist = async (name: string) => {
    if (!orgId) return
    const { data } = await supabase
      .from('playlists').insert({ org_id: orgId, name }).select().single()
    if (data) setPlaylists(prev => [...prev, data])
    return data
  }

  const addItemToPlaylist = async (playlistId: string, contentItemId: string, position: number) => {
    await supabase.from('playlist_items').insert({
      playlist_id: playlistId,
      content_item_id: contentItemId,
      position,
      duration_seconds: 10
    })
  }

  const assignToScreen = async (screenId: string, playlistId: string) => {
    await supabase.from('screens')
      .update({ current_playlist_id: playlistId })
      .eq('id', screenId)
  }

  return { playlists, createPlaylist, addItemToPlaylist, assignToScreen }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add playlist management and screen assignment"
```

---

## Phase 3: Expo App (Android TV + Mobile)

### Task 7: Setup Expo con soporte TV

**Files:**
- Modify: `apps/mobile-tv/app.json`
- Create: `apps/mobile-tv/src/lib/supabase.ts`
- Create: `apps/mobile-tv/src/screens/tv/`
- Create: `apps/mobile-tv/src/screens/mobile/`

**Step 1: Instalar dependencias**

```bash
cd apps/mobile-tv
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage expo-secure-store expo-av expo-file-system
```

**Step 2: Configurar app.json para Android TV**

Modificar `apps/mobile-tv/app.json`:
```json
{
  "expo": {
    "name": "MenuCast",
    "slug": "menucast",
    "version": "1.0.0",
    "orientation": "landscape",
    "android": {
      "package": "com.menucast.app",
      "intentFilters": [
        {
          "action": "android.intent.action.MAIN",
          "category": ["android.intent.category.LEANBACK_LAUNCHER"]
        }
      ]
    },
    "plugins": [
      ["expo-av", { "microphonePermission": false }]
    ]
  }
}
```

**Step 3: Cliente Supabase para React Native**

Crear `apps/mobile-tv/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

**Step 4: Detección de plataforma TV/Mobile**

Crear `apps/mobile-tv/src/lib/platform.ts`:
```typescript
import { Platform } from 'react-native'

export const isTV = Platform.isTV
export const isMobile = !Platform.isTV
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: setup Expo app with Supabase and TV support"
```

---

### Task 8: Login screen (TV y Mobile)

**Files:**
- Create: `apps/mobile-tv/src/screens/LoginScreen.tsx`
- Modify: `apps/mobile-tv/App.tsx`

**Step 1: Pantalla de login compartida**

Crear `apps/mobile-tv/src/screens/LoginScreen.tsx`:
```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { supabase } from '../lib/supabase'

type Props = { onLogin: () => void }

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    onLogin()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MenuCast</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.input} placeholder="Email"
        value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address"
      />
      <TextInput
        style={styles.input} placeholder="Contraseña"
        value={password} onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  title: { color: '#fff', fontSize: 48, fontWeight: 'bold', marginBottom: 40 },
  input: {
    backgroundColor: '#222', color: '#fff', padding: 16,
    width: 400, borderRadius: 8, marginBottom: 12, fontSize: 18
  },
  button: { backgroundColor: '#fff', padding: 16, width: 400, borderRadius: 8, marginTop: 8 },
  buttonText: { color: '#000', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  error: { color: 'red', marginBottom: 12 }
})
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add login screen for TV and mobile"
```

---

### Task 9: Player TV — reproducción con offline resilience

**Files:**
- Create: `apps/mobile-tv/src/screens/tv/PlayerScreen.tsx`
- Create: `apps/mobile-tv/src/hooks/usePlayer.ts`

**Step 1: Hook del player con cache offline**

Crear `apps/mobile-tv/src/hooks/usePlayer.ts`:
```typescript
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { PlaylistItem, Screen } from '@menucast/shared'

const CACHE_KEY = 'player_playlist_cache'

export function usePlayer(screenId: string) {
  const [items, setItems] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<NodeJS.Timeout>()

  // Cargar desde cache primero (offline resilience)
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(cached => {
      if (cached) setItems(JSON.parse(cached))
    })
  }, [])

  // Cargar desde servidor y suscribirse a cambios
  useEffect(() => {
    const loadPlaylist = async () => {
      const { data: screen } = await supabase
        .from('screens')
        .select('current_playlist_id')
        .eq('id', screenId)
        .single()

      if (!screen?.current_playlist_id) return

      const { data: playlistItems } = await supabase
        .from('playlist_items')
        .select('*, content_item:content_items(*)')
        .eq('playlist_id', screen.current_playlist_id)
        .order('position')

      if (playlistItems) {
        setItems(playlistItems)
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(playlistItems))
      }
    }

    loadPlaylist()

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('screen-updates')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'screens',
        filter: `id=eq.${screenId}`
      }, () => loadPlaylist())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [screenId])

  // Avanzar al siguiente item
  useEffect(() => {
    if (items.length === 0) return
    const item = items[currentIndex]
    const duration = (item?.duration_seconds ?? 10) * 1000

    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % items.length)
    }, duration)

    return () => clearTimeout(timerRef.current)
  }, [currentIndex, items])

  return { currentItem: items[currentIndex], totalItems: items.length }
}
```

**Step 2: Player screen**

Crear `apps/mobile-tv/src/screens/tv/PlayerScreen.tsx`:
```tsx
import { View, Image, StyleSheet, Text } from 'react-native'
import { Video, ResizeMode } from 'expo-av'
import { usePlayer } from '../../hooks/usePlayer'

type Props = { screenId: string }

export function PlayerScreen({ screenId }: Props) {
  const { currentItem, totalItems } = usePlayer(screenId)

  if (totalItems === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sin contenido asignado</Text>
        <Text style={styles.emptySubtext}>Asigna una playlist desde el panel de control</Text>
      </View>
    )
  }

  if (!currentItem?.content_item) return null

  const { type, storage_url } = currentItem.content_item

  return (
    <View style={styles.container}>
      {type === 'image' ? (
        <Image
          source={{ uri: storage_url }}
          style={styles.media}
          resizeMode="contain"
        />
      ) : (
        <Video
          source={{ uri: storage_url }}
          style={styles.media}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  media: { flex: 1, width: '100%', height: '100%' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  emptyText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  emptySubtext: { color: '#888', fontSize: 18, marginTop: 12 }
})
```

**Step 3: Verificar en emulador Android TV**

```bash
cd apps/mobile-tv
npx expo run:android
```

Verificar que:
- Login funciona
- Player muestra contenido
- Si no hay internet al arrancar, muestra cache

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add TV player with offline resilience and Realtime sync"
```

---

### Task 10: App mobile — control remoto

**Files:**
- Create: `apps/mobile-tv/src/screens/mobile/DashboardScreen.tsx`
- Create: `apps/mobile-tv/src/screens/mobile/ScreensScreen.tsx`

**Step 1: Pantalla de control móvil**

Crear `apps/mobile-tv/src/screens/mobile/ScreensScreen.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'
import type { Screen } from '@menucast/shared'

export function ScreensScreen() {
  const [screens, setScreens] = useState<Screen[]>([])

  useEffect(() => {
    const loadScreens = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!org) return

      const { data } = await supabase
        .from('screens')
        .select('*')
        .eq('org_id', org.id)

      setScreens(data ?? [])
    }

    loadScreens()

    // Realtime: detectar cambios de status
    const channel = supabase
      .channel('screens-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'screens' },
        () => loadScreens())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis pantallas</Text>
      <FlatList
        data={screens}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.screenName}>{item.name}</Text>
              <Text style={[styles.status,
                item.status === 'online' ? styles.online : styles.offline]}>
                {item.status === 'online' ? '● En línea' : '● Desconectada'}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 16, marginBottom: 12 },
  screenName: { fontSize: 16, fontWeight: '600' },
  status: { fontSize: 14, marginTop: 4 },
  online: { color: 'green' },
  offline: { color: 'red' }
})
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add mobile control screen with real-time status"
```

---

## Phase 4: Heartbeat de pantallas (online/offline)

### Task 11: Screen heartbeat

**Files:**
- Modify: `apps/mobile-tv/src/hooks/usePlayer.ts`

**Step 1: Agregar heartbeat al player**

Añadir al hook `usePlayer.ts`:
```typescript
// Heartbeat: marcar pantalla como online cada 30 segundos
useEffect(() => {
  const updateStatus = () => {
    supabase.from('screens')
      .update({ status: 'online', last_seen_at: new Date().toISOString() })
      .eq('id', screenId)
      .then()
  }

  updateStatus()
  const interval = setInterval(updateStatus, 30_000)

  return () => {
    clearInterval(interval)
    // Marcar offline al desmontar
    supabase.from('screens')
      .update({ status: 'offline' })
      .eq('id', screenId)
      .then()
  }
}, [screenId])
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add screen heartbeat for online/offline status"
```

---

## Criterios de verificación final

```
✅ Un restaurante puede registrarse y crear cuenta
✅ Puede agregar una pantalla y obtener código de vinculación
✅ La app Android TV hace login con sus credenciales
✅ Puede subir imágenes/videos desde el dashboard
✅ Puede crear una playlist y asignarla a una pantalla
✅ La pantalla muestra el contenido en < 3 segundos
✅ Si la pantalla se reinicia sin internet, muestra el cache
✅ El estado online/offline de las pantallas se actualiza en tiempo real
✅ La app móvil muestra el estado de todas las pantallas
```

---

## Siguientes fases (fuera del MVP)

- **Fase 2:** Módulo Kiosk (self-ordering + Stripe Terminal)
- **Fase 2:** Plantillas de contenido
- **Fase 3:** App en Google Play Store / Apple App Store
- **Fase 3:** Módulo Queue (gestión de colas)
- **Fase 4:** Editor visual tipo Canva
