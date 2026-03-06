# MenuCast

Plataforma SaaS para controlar pantallas digitales de restaurantes (digital signage) en tiempo real.

## Que hace

- El restaurante sube imagenes/videos desde el dashboard web o la app movil
- Crea playlists y las asigna a pantallas fisicas (Android TV)
- Las pantallas muestran el contenido en loop, con sincronizacion en tiempo real
- Si la pantalla pierde internet, sigue mostrando el ultimo contenido en cache
- El estado online/offline de cada pantalla se ve en tiempo real

---

## Arquitectura

```
menucast/
├── apps/
│   ├── dashboard/        ← Next.js 14 (App Router) — panel web
│   └── mobile-tv/        ← Expo (React Native) — app TV + app movil
├── packages/
│   └── shared/           ← tipos TypeScript compartidos
├── supabase/
│   └── migrations/       ← schema SQL
└── docs/plans/           ← plan de implementacion original
```

**Monorepo** con npm workspaces.

---

## Stack tecnico

| Capa | Tecnologia |
|------|-----------|
| Dashboard web | Next.js 14, App Router, Tailwind CSS |
| App TV / movil | Expo SDK 55, React Native |
| Backend | Supabase (Auth, PostgreSQL, Storage, Realtime) |
| Navegacion mobile | React Navigation (bottom tabs) |
| Monorepo | npm workspaces |

---

## Base de datos (Supabase)

### Tablas

| Tabla | Descripcion |
|-------|-------------|
| `organizations` | Restaurantes. Cada usuario tiene una org. |
| `screens` | Pantallas fisicas. Tienen `pairing_code`, `status`, `current_playlist_id` |
| `content_items` | Imagenes y videos subidos al Storage |
| `playlists` | Listas de reproduccion |
| `playlist_items` | Items dentro de una playlist (con posicion y duracion) |

### Storage

Bucket `content` (publico) — almacena los archivos de imagen y video.

### Realtime

Habilitado en `screens`, `playlists`, `playlist_items` para sincronizacion en tiempo real.

---

## Apps

### Dashboard web (`apps/dashboard`)

Next.js 14 con App Router.

**Rutas:**
- `/login` — inicio de sesion
- `/register` — registro + creacion de organizacion
- `/dashboard` — home con metricas en tiempo real
- `/dashboard/screens` — gestion de pantallas + pairing codes
- `/dashboard/content` — subir/eliminar imagenes y videos
- `/dashboard/playlists` — crear playlists, agregar items, asignar a pantallas

**Archivos clave:**
```
src/
├── app/
│   ├── (auth)/login/         ← login
│   ├── (auth)/register/      ← registro
│   └── (app)/dashboard/      ← dashboard protegido
│       ├── page.tsx          ← home con metricas
│       ├── screens/page.tsx  ← pantallas
│       ├── content/page.tsx  ← contenido
│       └── playlists/page.tsx← playlists
├── hooks/
│   ├── useOrganization.ts    ← org del usuario logueado
│   ├── useScreens.ts         ← CRUD pantallas + Realtime
│   ├── useContent.ts         ← upload/delete contenido
│   └── usePlaylists.ts       ← CRUD playlists + asignacion
└── lib/
    └── supabase.ts           ← cliente Supabase (browser)
```

**Variables de entorno** (`apps/dashboard/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### App Expo (`apps/mobile-tv`)

Una sola app que detecta si corre en Android TV o en movil y muestra UI diferente.

**Flujo TV:**
1. Login con email/password
2. Si no tiene pantalla vinculada → PairingScreen (ingresa codigo del dashboard)
3. Player en loop con cache offline (AsyncStorage)
4. Heartbeat cada 30s para marcar status online/offline

**Flujo Mobile (4 tabs):**
1. **Pantallas** — estado online/offline en tiempo real
2. **Contenido** — subir/eliminar desde galeria del telefono
3. **Playlists** — crear, editar items, asignar a pantallas
4. **Perfil** — cuenta, plan, logout

**Archivos clave:**
```
src/
├── lib/
│   ├── supabase.ts           ← cliente Supabase con AsyncStorage
│   └── platform.ts           ← isTV / isMobile
├── hooks/
│   ├── usePlayer.ts          ← playlist + cache + heartbeat + Realtime
│   └── usePairing.ts         ← vincular TV con pairing code
└── screens/
    ├── LoginScreen.tsx        ← login compartido TV/mobile
    ├── tv/
    │   ├── PairingScreen.tsx  ← ingresar codigo de vinculacion
    │   └── PlayerScreen.tsx   ← player de contenido
    └── mobile/
        ├── TabNavigator.tsx   ← navegacion 4 tabs
        ├── ScreensScreen.tsx  ← ver pantallas
        ├── ContentScreen.tsx  ← subir contenido
        ├── PlaylistsScreen.tsx← gestionar playlists
        └── ProfileScreen.tsx  ← perfil + logout
```

**Variables de entorno** (`apps/mobile-tv/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Setup local

### Requisitos

- Node.js 18+
- Cuenta Supabase (supabase.com)

### 1. Instalar dependencias

```bash
npm install
cd apps/dashboard && npm install
cd apps/mobile-tv && npm install
```

### 2. Configurar Supabase

1. Crear proyecto en supabase.com
2. Ir a SQL Editor y correr los archivos en orden:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_bucket.sql`

3. Copiar URL y anon key desde Project Settings → API

### 3. Variables de entorno

```bash
# Dashboard
cp apps/dashboard/.env.local.example apps/dashboard/.env.local
# Editar con tus keys de Supabase

# Mobile/TV
cp apps/mobile-tv/.env.example apps/mobile-tv/.env
# Editar con tus keys de Supabase
```

### 4. Correr el dashboard

```bash
cd apps/dashboard
npm run dev
# Abrir http://localhost:3000
```

### 5. Correr la app Expo

```bash
cd apps/mobile-tv
npx expo start
```

---

## Flujo completo de uso

1. **Registro**: ir a `/register`, crear cuenta con nombre del restaurante
2. **Subir contenido**: ir a Contenido, subir imagenes o videos
3. **Crear playlist**: ir a Playlists, crear una y agregar items
4. **Agregar pantalla**: ir a Pantallas, crear pantalla, copiar el codigo (ej: `ABC123`)
5. **Vincular TV**: abrir app en Android TV, hacer login, ingresar el codigo
6. **Asignar playlist**: en Playlists, asignar la playlist a la pantalla
7. **La pantalla empieza a reproducir** el contenido automaticamente

---

## Estado del proyecto (MVP completo)

- [x] Auth (registro + login)
- [x] Gestion de pantallas con pairing codes
- [x] Upload de contenido (imagenes + videos)
- [x] Playlists con orden y duracion por item
- [x] Asignacion de playlist a pantalla
- [x] Player TV con offline resilience (AsyncStorage cache)
- [x] Sincronizacion en tiempo real via Supabase Realtime
- [x] Heartbeat online/offline de pantallas
- [x] App movil con navegacion completa
- [x] Pairing flow completo (TV ingresa codigo del dashboard)
- [ ] Stripe billing (free → pro) — pendiente
- [ ] Deploy a Vercel + Supabase cloud — pendiente
- [ ] App en Google Play Store — pendiente

---

## Commits del proyecto

```
4fdebe2 feat: improve dashboard home with real-time metrics
e4d4c41 feat: add profile tab with logout and gallery permissions
e378ee5 feat: add full mobile app navigation
bdc2824 feat: add TV pairing flow via dashboard-generated code
bdd3d4e feat: add TV player with offline resilience, login, mobile control
5f680a0 feat: setup Expo app with Supabase client and Android TV support
769e7c0 feat: add playlist management and screen assignment
33cc711 feat: add content upload to Supabase Storage
cacc165 feat: add screen management dashboard
32fa3cc feat: add auth pages (login + register) with Supabase
1aec9dc feat: add Supabase schema migrations and shared client
e26f1b2 feat: initialize monorepo with Next.js dashboard and Expo app
0609f57 chore: initial commit with design docs and brainstorming
```
