# MenuCast — Memoria del Proyecto (Para Agentes AI)

## ¿Qué es MenuCast?

Plataforma SaaS de Digital Signage. Los negocios (restaurantes, clínicas, etc.) controlan pantallas digitales remotamente: suben contenido, crean playlists y las asignan a pantallas físicas (Android TV, Smart TV, tablets).

**Competencia principal:** Yodeck ($7.99/pantalla/mes). MenuCast apunta a LATAM a $3-5/mes.

## Stack Tecnológico

| Capa            | Tecnología                                    | Ubicación                  |
| --------------- | ---------------------------------------------- | --------------------------- |
| Dashboard Web   | Next.js 16, App Router, Tailwind CSS           | `apps/dashboard/`         |
| App Móvil + TV | Expo SDK 55, React Native                      | `apps/mobile-tv/`         |
| Backend         | Supabase (Auth, PostgreSQL, Storage, Realtime) | `supabase/migrations/`    |
| Monorepo        | npm workspaces                                 | raíz `package.json`      |
| Deploy Web      | Vercel (pendiente)                             | —                          |
| Deploy App      | EAS Build                                      | `apps/mobile-tv/eas.json` |

**Supabase Project ID:** `vfpkeklmnhtsqsdoeayi`
**Supabase Account:** `globalnetworkprime@gmail.com` (cuenta separada de GitHub)

## Estructura del Monorepo

```
menucast/
├── apps/
│   ├── dashboard/              # Next.js 16 (web admin)
│   │   └── src/
│   │       ├── app/(auth)/     # Login + Register
│   │       ├── app/(app)/      # Layout protegido + Dashboard
│   │       │   └── dashboard/  # Home, Screens, Content, Playlists, Settings
│   │       ├── hooks/          # useScreens, useContent, usePlaylists, useOrganization
│   │       └── lib/            # supabase.ts (cliente)
│   └── mobile-tv/              # Expo SDK 55 (Android + TV)
│       └── src/
│           ├── screens/
│           │   ├── tv/         # PairingScreen, PlayerScreen
│           │   └── mobile/     # 4 tabs (Screens, Content, Playlists, Profile)
│           ├── hooks/          # usePlayer.ts (con cache offline)
│           └── lib/            # supabase.ts
├── supabase/migrations/        # 3 migraciones SQL
├── BRAINSTORMING.md            # Visión, competencia, roadmap
├── HANDOFF.md                  # Documentación técnica detallada
├── EXPO_FIX_REPORT.md          # Solución al bug de npm workspaces + Expo
└── MenuCast_Analisis_Tecnico_v2.docx  # Ingeniería inversa de Yodeck
```

## Base de Datos (PostgreSQL via Supabase)

```
organizations (id, name, owner_id, plan, created_at)
screens (id, org_id, name, pairing_code, status, current_playlist_id, last_seen_at)
content_items (id, org_id, name, type[image|video], storage_url, duration_seconds)
playlists (id, org_id, name, created_at)
playlist_items (id, playlist_id, content_item_id, position, duration_seconds)
```

**RLS:** Cada tabla filtra por `org_id → organizations.owner_id = auth.uid()`.

## Estado Actual (lo que YA funciona)

- ✅ Dashboard web completo (auth, CRUD screens/content/playlists, métricas real-time)
- ✅ App móvil con 4 tabs + modo TV (pairing + player con loop de contenido)
- ✅ Heartbeat cada 30s + cache offline con AsyncStorage
- ✅ Supabase Realtime (cambios instantáneos)
- ✅ Security Hardening (RLS, crypto pairing codes, error handling)
- ✅ EAS Build config (AsyncStorage Maven plugin)

## Lo que FALTA (en orden de prioridad)

1. **Deploy** — Vercel (dashboard) + Google Play (app)
2. **Schedules** — Programar playlists por horarios/días
3. **Layout Editor** — Editor visual tipo Canva con zonas arrastrables
4. **Apps Module** — Widgets (reloj, clima, QR, ticker) embebidos en zonas
5. **Stripe** — Billing por pantalla/mes (fase final)

## Reglas Importantes

1. **Siempre usar `npm install --legacy-peer-deps`** desde la raíz (Expo SDK 55 + npm workspaces)
2. **Supabase es otra cuenta** — No está vinculada al GitHub del proyecto
3. **El usuario habla español** — Responder siempre en español
4. **Stripe queda para la fase final** — No implementar antes
5. **Las "Apps" (clima, reloj, etc.) NO son prioritarias** — Primero schedules y layout editor
6. **Next.js 16 usa `proxy.ts`** en vez de `middleware.ts`

## Hallazgo Clave (Ingeniería Inversa de Yodeck)

El editor de layouts de Yodeck usa **jQuery UI + Backbone.js** (2012). Sus widgets son HTMLs estáticos en iframes desde S3. Nuestro stack moderno (React + Next.js) puede construir algo superior usando `react-rnd` para drag & resize y componentes React nativos para widgets.

## Comandos Útiles

```bash
# Dashboard
cd apps/dashboard && npm run dev     # localhost:3000

# App móvil (web)
cd apps/mobile-tv && npx expo start --web

# EAS Build
cd apps/mobile-tv && npx eas build --platform android --profile production

# Instalar dependencias (SIEMPRE con este flag)
npm install --legacy-peer-deps
```
