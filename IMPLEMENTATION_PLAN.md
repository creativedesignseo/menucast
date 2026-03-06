# MenuCast — Plan de Implementación Completo

Basado en el [Análisis Técnico v2.0](file:///c:/Users/jonat/workspace/menucast/MenuCast_Analisis_Tecnico_v2.docx) (ingeniería inversa de Yodeck).

---

## Fase 1: Security Hardening ✅ COMPLETADA

- RLS policies corregidas
- `crypto.getRandomValues()` para pairing codes
- Cache key dinámica en player
- Error handling en los 3 hooks del dashboard

---

## Fase 2: Deploy + Core

### Dashboard → Vercel
#### [MODIFY] `apps/dashboard/next.config.ts`
- Configurar output standalone si es necesario
- Verificar env vars en Vercel dashboard

### EAS Build → Google Play
#### [MODIFY] `apps/mobile-tv/eas.json`
- Configurar `production` profile con signing key
- Subir AAB a Google Play Console

### Web Player (Smart TVs sin app)
#### [NEW] `apps/dashboard/src/app/player/[screenId]/page.tsx`
- Página Next.js pública que renderiza el player
- Misma lógica que `PlayerScreen.tsx` pero en web
- URL: `app.menucast.com/player/{screenId}`

---

## Fase 3: Schedules

### Base de datos
#### [NEW] Migración `004_schedules.sql`
```sql
CREATE TABLE schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  screen_id UUID REFERENCES screens(id) ON DELETE CASCADE,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,0}',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Dashboard
#### [NEW] `apps/dashboard/src/hooks/useSchedules.ts`
#### [NEW] `apps/dashboard/src/app/(app)/dashboard/schedules/page.tsx`
- Vista de calendario semanal
- Drag para crear bloques de tiempo
- Asignar playlist a cada bloque

### Player
#### [MODIFY] `apps/mobile-tv/src/hooks/usePlayer.ts`
- Consultar schedules además de `current_playlist_id`
- Lógica: si hay schedule activo para la hora actual → usarlo; si no → fallback a playlist por defecto

### Takeover Screen
#### [NEW] Canal Realtime `takeover-{screenId}`
- Admin envía mensaje urgente → player interrumpe y muestra contenido de emergencia
- Cuando termina → vuelve a la programación normal

---

## Fase 4: Layout Editor

### Tecnología: `react-rnd` (drag + resize)
Yodeck usa jQuery UI (2012). Nosotros usamos React moderno.

### Base de datos
#### [NEW] Migración `005_layouts.sql`
```sql
CREATE TABLE layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  resolution JSONB DEFAULT '{"width": 1920, "height": 1080}',
  background_color TEXT DEFAULT '#000000',
  background_image_url TEXT,
  zones JSONB NOT NULL DEFAULT '[]',
  -- zones: [{id, x, y, width, height, type, content_source}]
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Dashboard
#### [NEW] `apps/dashboard/src/app/(app)/dashboard/layouts/page.tsx` — Lista de layouts
#### [NEW] `apps/dashboard/src/app/(app)/dashboard/layouts/editor/page.tsx` — Editor visual
#### [NEW] `apps/dashboard/src/hooks/useLayouts.ts`

**Editor visual:**
- Canvas con resolución configurable (1920×1080, 3840×2160, etc.)
- Zonas arrastrables y redimensionables (`react-rnd`)
- Cada zona puede tener: playlist, imagen, video, o app
- Panel de capas (z-index)
- Previsualización en tiempo real

### Player
#### [MODIFY] `apps/mobile-tv/src/screens/tv/PlayerScreen.tsx`
- Si screen tiene `layout_id` → renderizar zones con contenido separado
- Si screen tiene `current_playlist_id` (legacy) → loop normal actual

---

## Fase 5: Apps Module

### Tier 1 (rápidas de implementar)
| App | Tipo | Implementación |
|---|---|---|
| Reloj Digital | Native React | Componente con `Date()` + estilos configurables |
| Clima | API | OpenWeatherMap API → componente React |
| QR Code | Native React | Librería `qrcode` → renderizar URL configurable |
| Rich Text / Ticker | Native React | Texto con scroll horizontal CSS animation |
| Embed URL | Iframe | `<iframe src={url}>` simple |

### Base de datos
#### [NEW] Migración `006_apps.sql`
```sql
CREATE TABLE app_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  app_type TEXT NOT NULL, -- 'clock', 'weather', 'qr', 'ticker', 'embed'
  config JSONB DEFAULT '{}', -- configuración específica por app
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Dashboard
#### [NEW] `apps/dashboard/src/app/(app)/dashboard/apps/page.tsx` — Catálogo
#### [NEW] `apps/dashboard/src/components/apps/` — Componentes por app

---

## Fase Final: Stripe

#### [NEW] `apps/dashboard/src/app/api/stripe/` — Webhooks + checkout
#### [MODIFY] `organizations` table — Agregar `stripe_customer_id`, `stripe_subscription_id`
- Checkout por pantalla adicional
- Portal de facturación
- Límites por plan

---

## Verification Plan

| Fase | Test |
|---|---|
| 2 | Dashboard accesible en URL de Vercel + APK instalable en Android TV |
| 3 | Crear schedule → player cambia playlist automáticamente al llegar la hora |
| 4 | Crear layout con 3 zonas → player las renderiza correctamente |
| 5 | Agregar widget reloj a zona → se muestra en la pantalla |
