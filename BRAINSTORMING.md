# MenuCast — Documento de Diseño
**Fecha inicio:** 2026-03-05
**Última actualización:** 2026-03-06
**Estado:** Definiendo flujos de usuario — en progreso

---

## Visión del producto

Plataforma SaaS modular para gestionar cualquier pantalla digital en cualquier negocio del mundo. El cliente ya tiene la pantalla — solo necesita el software.

> "El sistema operativo para pantallas de negocios"

### Verticales objetivo

| Módulo | Casos de uso |
|---|---|
| **Signage** | Menús digitales, publicidad, información |
| **Kiosk** | Self-ordering (como McDonald's), pago, ticket |
| **Queue** | Gestión de colas, turnero, llamado por número |
| **Info Board** | Aeropuertos, eventos, tableros informativos |

---

## Go-to-market

- **Mercado inicial:** Restaurantes (más simple, iteración rápida)
- **Expansión:** Clínicas, bancos, aeropuertos, centros comerciales
- **Onboarding:** Self-service (cliente se registra solo, soporte disponible)
- **Modelo de precios:** Freemium — 1 pantalla gratis de por vida, pago por pantalla adicional/mes

---

## Investigación de mercado

### Competencia local: Imvinet (Venezuela)
- **ACOLite** (~$25 setup + $10/mes, Android, PyMES)
- **ACOPro** (~$50 setup + $10/mes, Linux, corporativos)
- **Debilidades:** onboarding manual, hardware específico, interfaz no moderna

### Referentes globales

| Empresa | Enfoque | Diferenciador |
|---|---|---|
| **Yodeck** | Raspberry Pi | 1 pantalla gratis de por vida |
| **ScreenCloud** | Oficinas modernas | App Store interna |
| **OptiSigns** | Restaurants/retail | Android TV + Fire TV |
| **Scala** | Enterprise | Aeropuertos, centros comerciales |
| **Xibo** | Open Source | Potente pero difícil |

### Ventaja competitiva MenuCast
- Hardware agnóstico (usa lo que ya tienes)
- Una sola plataforma para todos los módulos
- Fácil como Canva, potente como Xibo
- Precio accesible para LATAM

---

## Decisiones de arquitectura

### Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| **Web dashboard** | Next.js | Panel admin en browser |
| **Mobile + Android TV** | React Native / Expo | Un solo proyecto, múltiples targets |
| **Backend** | Supabase | Auth + DB + Storage + Realtime |
| **Pagos** | Stripe | Suscripciones + Stripe Terminal (Kiosk) |
| **Real-time** | Supabase Realtime | WebSockets, actualizaciones instantáneas |

### Plataformas soportadas (un solo código Expo)

```
Expo monorepo (mobile-tv/)
├── Android TV  → app nativa con login (como Netflix), muestra contenido
├── Android     → app de control remoto para el dueño
├── iPhone      → app de control remoto
└── iPad        → app de control, pantalla más grande
```

### Hardware compatible con el player

| Dispositivo | Cómo corre MenuCast |
|---|---|
| Android TV / Fire TV Stick | APK nativo (Expo) |
| Smart TV (Samsung/LG) | Browser → URL del player |
| Raspberry Pi | Chromium kiosk → URL |
| Tablet táctil | App Expo (modo Kiosk) |

### Arquitectura general

```
Next.js Dashboard (app.menucast.com)
          ↕
       Supabase
  (Auth + DB + Storage + Realtime)
          ↕
Expo App (Android TV + Mobile)
  ├── TV: muestra contenido asignado
  └── Mobile: controla pantallas remotamente
```

### Offline resilience (problema crítico resuelto)

Patrón cache-first con Service Workers / almacenamiento local:
```
Dispositivo arranca sin internet
  → Carga contenido del cache local
  → Muestra última versión conocida
  → Cuando vuelve internet → sync en background
```

---

## Módulo Signage (MVP)

### Flujo principal
1. Dueño se registra → crea organización
2. Agrega una pantalla → obtiene código de vinculación
3. En el TV: abre app → login con credenciales
4. Sube imágenes/videos → crea playlist → asigna a pantalla
5. Contenido aparece en pantalla en segundos

### Contenido (MVP → Roadmap)
- **MVP:** Sube imágenes/videos ya diseñados
- **Fase 2:** Plantillas + personalización (llena datos, el sistema genera diseño)
- **Fase 3:** Editor visual tipo Canva integrado

---

## Módulo Kiosk (Fase 2)

Self-ordering como McDonald's/KFC:
- UI táctil de pedido (React Native touch mode)
- Carrito de compras → Supabase
- Pago con tarjeta (Stripe Terminal + lector físico)
- Impresión de ticket (impresora ESC/POS Bluetooth/USB)
- Órdenes en tiempo real a pantalla de cocina (Supabase Realtime)

---

## Modelo de datos

```
organizations          screens                playlists
─────────────          ───────────            ─────────
id                     id                     id
name                   org_id                 org_id
owner_id               name                   name
plan                   status                 created_at
created_at             last_seen_at
                       current_playlist_id
                       device_info

content_items          playlist_items         subscriptions
─────────────          ──────────────         ─────────────
id                     id                     id
org_id                 playlist_id            org_id
name                   content_item_id        plan (free/pro)
type (image/video)     order                  screen_limit
storage_url            duration_seconds       stripe_customer_id
duration                                      stripe_subscription_id
created_at                                    status
```

---

## Roadmap de desarrollo

| Fase | Entregable |
|---|---|
| **MVP** | Signage: dashboard + Android TV app + mobile control |
| **Fase 2** | Módulo Kiosk (self-ordering + pago) |
| **Fase 3** | Módulo Queue (gestión de colas) |
| **Fase 4** | Plantillas visuales / editor tipo Canva |
| **Fase 5** | Info Board, aeropuertos, eventos |

---

## Preguntas pendientes de clarificación

1. ⏳ Flujos de usuario detallados (próximo paso)
2. ⏳ Estrategia de auth (email/password, Google OAuth, magic link)
3. ⏳ Precios exactos por pantalla/mes
4. ⏳ Nombre final del producto (¿MenuCast es suficientemente amplio para la visión?)

---

## Próximos pasos del brainstorming

1. ✅ Contexto explorado
2. ✅ Preguntas de clarificación
3. ✅ Enfoque arquitectónico definido (Next.js + Expo + Supabase)
4. ⏳ Flujos de usuario detallados
5. ⏳ Design doc formal
6. ⏳ Plan de implementación
