# MenuCast — Documento de Traspaso para Agentes/Desarrolladores

## Que es este proyecto
MenuCast es una plataforma SaaS para restaurantes que permite controlar pantallas digitales (digital signage). Los restaurantes suben imagenes/videos de sus menus, crean playlists y las asignan a pantallas fisicas (Android TV).

## Estructura del monorepo
```
menucast/
├── apps/
│   ├── dashboard/        # Web admin (Next.js 16, App Router, Tailwind CSS)
│   └── mobile-tv/        # App movil + TV (Expo SDK 55, React Native)
├── supabase/
│   └── migrations/       # SQL migrations para la base de datos
├── docs/plans/           # Plan de implementacion original
└── README.md             # Documentacion completa del proyecto
```

## Stack tecnico
- **Frontend web:** Next.js 16, App Router, Tailwind CSS, @supabase/ssr
- **App movil/TV:** Expo SDK 55, React Native, expo-av, expo-image-picker, React Navigation
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Realtime)
- **Monorepo:** npm workspaces
- **Deploy web:** Vercel
- **Base de datos cloud:** Supabase (project ID: vfpkeklmnhtsqsdoeayi)

## Paginas del dashboard web (apps/dashboard)
| Ruta | Archivo | Descripcion |
|------|---------|-------------|
| /login | src/app/(auth)/login/page.tsx | Login con email/password |
| /register | src/app/(auth)/register/page.tsx | Registro + creacion de organizacion |
| /dashboard | src/app/(app)/dashboard/page.tsx | Home con metricas en tiempo real |
| /dashboard/screens | src/app/(app)/dashboard/screens/page.tsx | CRUD de pantallas + codigos de vinculacion |
| /dashboard/content | src/app/(app)/dashboard/content/page.tsx | Upload/delete de imagenes y videos |
| /dashboard/playlists | src/app/(app)/dashboard/playlists/page.tsx | Crear playlists, agregar items, asignar a pantallas |
| /dashboard/settings | src/app/(app)/dashboard/settings/page.tsx | Cambiar nombre negocio, contraseña, ver plan |

## Layout y navegacion
- `src/app/(app)/layout.tsx` — Layout principal con navbar (Inicio, Pantallas, Contenido, Playlists, Configuracion, Salir)
- `src/app/(auth)/layout.tsx` — Layout de auth (centrado, sin navbar)
- `src/proxy.ts` — Proteccion de rutas (renombrado de middleware.ts por Next.js 16)

## Hooks personalizados (apps/dashboard/src/hooks/)
- `useOrganization.ts` — Obtiene la organizacion del usuario logueado
- `useScreens.ts` — CRUD de pantallas con realtime
- `useContent.ts` — Upload/delete de archivos en Supabase Storage
- `usePlaylists.ts` — CRUD de playlists y playlist_items

## App movil/TV (apps/mobile-tv)
### Pantallas TV:
- `LoginScreen.tsx` → `PairingScreen.tsx` (codigo de 6 caracteres) → `PlayerScreen.tsx` (loop de contenido)
- Heartbeat cada 30 segundos
- Cache offline con AsyncStorage

### Pantallas Mobile (4 tabs):
- Pantallas: ver estado online/offline en tiempo real
- Contenido: subir desde galeria
- Playlists: crear, editar, asignar
- Perfil: ver cuenta, logout

## Base de datos (Supabase PostgreSQL)
### Tablas:
- `organizations` — id, name, owner_id, plan (free/pro), created_at
- `screens` — id, org_id, name, pairing_code, status, playlist_id, last_heartbeat
- `content_items` — id, org_id, name, type (image/video), url, storage_path
- `playlists` — id, org_id, name, created_at
- `playlist_items` — id, playlist_id, content_item_id, position, duration

### Migraciones aplicadas:
1. `001_initial_schema.sql` — Tablas + RLS basico (SELECT)
2. `002_storage_bucket.sql` — Bucket "content" publico
3. `003_fix_rls_policies.sql` — Politicas INSERT/UPDATE/DELETE para todas las tablas

### RLS (Row Level Security):
- Cada tabla filtra por org_id del usuario autenticado
- TV puede actualizar su propio screen (heartbeat)
- Usuarios autenticados pueden crear organizaciones

## Variables de entorno
### Dashboard (apps/dashboard/.env.local):
```
NEXT_PUBLIC_SUPABASE_URL=https://vfpkeklmnhtsqsdoeayi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Mobile (apps/mobile-tv/.env):
```
EXPO_PUBLIC_SUPABASE_URL=https://vfpkeklmnhtsqsdoeayi.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

## Como levantar en local
```bash
# Dashboard web
cd apps/dashboard
npm run dev
# Abre http://localhost:3000

# App movil
cd apps/mobile-tv
npx expo start
# Escanear QR con Expo Go
```

## Estado actual — Que funciona y que no

### FUNCIONA:
- Dashboard web completo (login, registro, pantallas, contenido, playlists, settings)
- Supabase cloud conectado con todas las migraciones aplicadas
- Registro sin confirmacion de email (desactivada en Supabase)
- Todas las operaciones CRUD desde el dashboard
- Realtime updates

### NO FUNCIONA / PENDIENTE:
1. **App movil no se puede probar** — Expo SDK 55 es incompatible con la version actual de Expo Go. Opciones: bajar a SDK 52, usar development build, o probar con `npx expo start --web`
2. **Deploy en Vercel** — Configurado pero no probado completamente (rate limit de emails bloqueo la prueba)
3. **Pagina settings sin commitear** — El archivo /dashboard/settings/page.tsx esta creado pero no commiteado a git

## Proximos pasos (en orden de prioridad)
1. Resolver compatibilidad Expo (bajar SDK o usar dev build) para probar app movil
2. Commitear pagina de settings
3. Probar deploy en Vercel
4. Stripe billing (free → pro) — pospuesto, no bloquea MVP
5. Publicar app en Google Play Store
6. Fase 2: plantillas de contenido, modulo kiosk

## Errores conocidos y soluciones
| Error | Causa | Solucion |
|-------|-------|----------|
| middleware.ts deprecated | Next.js 16 cambio el nombre | Renombrar a proxy.ts, funcion proxy() |
| row violates RLS policy | Faltaban politicas INSERT/UPDATE/DELETE | Migracion 003_fix_rls_policies.sql |
| email rate limit exceeded | Supabase limita emails de confirmacion | Desactivar "Confirm email" en Auth settings |
| Expo Go incompatible | SDK 55 muy nuevo | Bajar a SDK 52 o usar development build |

## Preferencias del usuario
- Habla espanol
- Quiere respuestas cortas y directas
- No repetir trabajo ya hecho
- Stripe: dejado para despues
- Un solo repo GitHub (monorepo)
