# MenuCast — Design Document
**Fecha:** 2026-03-06
**Estado:** Aprobado — listo para implementación

---

## Contexto

Los negocios modernos ya tienen pantallas. El problema es que no tienen una forma simple, asequible y poderosa de controlar qué muestran esas pantallas desde cualquier lugar del mundo. Las soluciones existentes (Yodeck, ScreenCloud, OptiSigns) son caras, complejas o no están adaptadas al mercado latinoamericano.

MenuCast es una plataforma SaaS modular que convierte cualquier pantalla en un display inteligente controlado desde el teléfono, tablet o computadora — en tiempo real, desde cualquier parte del mundo.

---

## Visión

> "El sistema operativo para pantallas de negocios"

Un solo sistema que maneja desde el menú de un restaurante hasta los tableros de un aeropuerto. Arquitectura modular que crece con el cliente.

### Módulos (roadmap)

| Módulo | Descripción | Fase |
|---|---|---|
| **Signage** | Pantallas de contenido (menús, publicidad, info) | MVP |
| **Kiosk** | Self-ordering táctil con pago y ticket | Fase 2 |
| **Queue** | Gestión de colas y turnero | Fase 3 |
| **Info Board** | Tableros informativos (aeropuertos, eventos) | Fase 4 |

---

## Go-to-market

- **Mercado inicial:** Restaurantes
- **Expansión:** Clínicas, bancos, hoteles, aeropuertos, retail
- **Onboarding:** Self-service con soporte técnico disponible
- **Modelo:** Freemium — 1 pantalla gratis de por vida, pago por pantalla adicional/mes
- **Ventaja:** El cliente ya tiene la pantalla, solo necesita el software

---

## Arquitectura

### Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Web dashboard | Next.js | Full-stack, SSR, deploy en Vercel |
| Mobile + Android TV | React Native / Expo | Un código → iOS, Android, Android TV, iPad |
| Backend | Supabase | Auth + PostgreSQL + Storage + Realtime incluidos |
| Pagos | Stripe | Suscripciones (+ Stripe Terminal para Kiosk fase 2) |
| Deploy | Vercel + Supabase Cloud | Sin infraestructura propia en MVP |

### Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      MENUCAST                               │
│                                                             │
│  ┌──────────────────┐          ┌──────────────────────────┐ │
│  │ Dashboard Web    │          │ Expo App                 │ │
│  │ (Next.js)        │          │                          │ │
│  │ app.menucast.com │          │ ├─ Android TV (display)  │ │
│  │                  │          │ ├─ Android phone         │ │
│  │ - Panel admin    │          │ ├─ iPhone / iPad         │ │
│  │ - Upload medios  │          │ └─ (control remoto)      │ │
│  │ - Gestión cuentas│          │                          │ │
│  │ - Facturación    │          └────────────┬─────────────┘ │
│  └────────┬─────────┘                       │               │
│           │                                 │               │
│           └──────────────┬──────────────────┘               │
│                          │                                  │
│                 ┌────────▼────────┐                         │
│                 │    Supabase     │                         │
│                 │                 │                         │
│                 │  PostgreSQL     │                         │
│                 │  Auth           │                         │
│                 │  Storage        │                         │
│                 │  Realtime       │                         │
│                 └─────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Hardware compatible

| Dispositivo | Método | Costo aprox. |
|---|---|---|
| Android TV / Fire TV Stick | APK nativo (Expo) | $30–50 |
| Smart TV Samsung / LG | Browser → URL | $0 (ya lo tienen) |
| Raspberry Pi | Chromium kiosk | $80–120 |
| Tablet táctil | App Expo | Variable |

### Offline resilience

```
Dispositivo arranca sin internet
  → Carga contenido del almacenamiento local
  → Muestra última versión conocida sin interrupciones
  → Cuando vuelve internet → sync silencioso en background
```

---

## Modelo de datos (MVP)

```sql
-- Organizaciones (restaurantes)
organizations (id, name, owner_id, plan, created_at)

-- Pantallas físicas
screens (id, org_id, name, status, last_seen_at, current_playlist_id, device_info)

-- Playlists
playlists (id, org_id, name, created_at)

-- Items de una playlist (orden + duración)
playlist_items (id, playlist_id, content_item_id, order, duration_seconds)

-- Archivos de contenido
content_items (id, org_id, name, type, storage_url, duration, created_at)

-- Suscripciones y billing
subscriptions (id, org_id, plan, screen_limit, stripe_customer_id, stripe_subscription_id, status)
```

---

## Flujos de usuario (MVP)

### 1. Onboarding
```
Registro → crea organización → plan free (1 pantalla)
→ genera código de vinculación
→ TV: descarga app → login → selecciona pantalla
→ Pantalla activa en < 5 minutos
```

### 2. Gestión de contenido
```
Sube imagen/video → crea playlist → asigna a pantalla
→ Supabase Realtime notifica al TV
→ Contenido actualizado en segundos
```

### 3. Android TV (display)
```
Arranca → auto-login → reproduce playlist asignada
→ Loop continuo
→ Si no hay internet → reproduce cache local
→ Escucha Realtime → actualiza sin reiniciar
```

### 4. Control remoto (móvil)
```
App móvil → ve estado de todas las pantallas (online/offline)
→ Cambia contenido en tiempo real
→ Recibe alertas si una pantalla se desconecta
```

---

## Plataformas del Expo App

```
screens/tv/       → UI para Android TV (D-pad, 10-foot UI, login como Netflix)
screens/mobile/   → UI para iPhone, Android, iPad (control remoto)
```

Detección automática:
```javascript
import { Platform } from 'react-native'
Platform.isTV // true en Android TV → carga TV screens
             // false en móvil → carga mobile screens
```

---

## MVP — Scope definido

### Incluye
- Registro y autenticación de restaurantes
- Gestión de pantallas (agregar, nombrar, desvincular)
- Upload de imágenes y videos
- Creación y gestión de playlists
- Asignación de playlist a pantalla
- App Android TV con login y reproducción
- App móvil de control (iPhone + Android + iPad)
- Dashboard web de administración
- Actualización en tiempo real (< 3 segundos)
- Offline resilience (cache local)
- Plan free (1 pantalla) + billing por pantalla adicional

### No incluye en MVP
- Editor visual / plantillas (Fase 2)
- Módulo Kiosk (Fase 2)
- Módulo Queue (Fase 3)
- App nativa en App Store / Play Store (responsive web cubre móvil en MVP)
- Soporte Samsung Tizen / LG WebOS nativo

---

## Estructura del repositorio

```
menucast/
├── apps/
│   ├── dashboard/          ← Next.js (panel web)
│   └── mobile-tv/          ← Expo (Android TV + mobile)
│       ├── screens/tv/
│       └── screens/mobile/
├── packages/
│   └── supabase/           ← tipos, cliente compartido
├── docs/
│   └── plans/
│       └── 2026-03-06-menucast-design.md
└── supabase/
    └── migrations/         ← schema SQL
```

---

## Criterios de éxito del MVP

- [ ] Un restaurante puede registrarse y tener su primera pantalla activa en < 10 minutos
- [ ] Un cambio de contenido se refleja en la pantalla en < 3 segundos
- [ ] Si la pantalla pierde internet y se reinicia, sigue mostrando contenido
- [ ] El dueño puede controlar sus pantallas desde su teléfono en cualquier parte del mundo
- [ ] El plan free funciona con 0 fricción hasta que el cliente quiere más de 1 pantalla
