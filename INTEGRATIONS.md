# Integraciones — Reservas Restaurant

## Arquitectura

La plataforma soporta múltiples integraciones externas a través de un sistema modular:

```
[Proveedor Externo] ←→ [OAuth / API] ←→ [Edge Function / API Route] ←→ [Supabase DB]
                                              ↓
[Webhook Provider] ←→ [Webhook Endpoint] ←→ [webhook_events] ←→ [Procesamiento]
```

## Proveedores disponibles

| Proveedor       | Slug              | OAuth | Webhook | Estado |
| --------------- | ----------------- | ----- | ------- | ------ |
| Meta/Facebook   | `meta`            | ✅    | ✅      | Activo |
| Instagram       | `instagram`       | ✅    | ✅      | Activo |
| Google Calendar | `google_calendar` | ✅    | -       | Beta   |
| Gmail           | `gmail`           | ✅    | -       | Beta   |
| Google Drive    | `google_drive`    | ✅    | -       | Beta   |
| Google Business | `google_business` | ✅    | -       | Beta   |

## Tablas del módulo de integraciones

| Tabla                        | Propósito                                        |
| ---------------------------- | ------------------------------------------------ |
| `integration_providers`      | Catálogo de proveedores disponibles              |
| `company_integrations`       | Estado de cada integración por empresa           |
| `integration_accounts`       | Cuentas externas conectadas                      |
| `integration_tokens`         | Tokens OAuth cifrados (solo accesibles por admin) |
| `webhook_endpoints`          | Endpoints de webhook configurados por empresa    |
| `webhook_events`             | Eventos normalizados entrantes y salientes       |
| `webhook_event_retries`      | Dead letter queue para reintentos                |
| `api_keys`                   | API Keys para integración de sistemas externos   |
| `sync_jobs`                  | Registro de sincronizaciones                     |
| `integration_audit_logs`     | Auditoría específica de integraciones            |

## OAuth Flow

1. Usuario hace clic en "Conectar" desde el dashboard
2. Se genera estado (`state`) con `company_id` y `provider`
3. Redirección a URL de OAuth del proveedor
4. Callback a `/api/auth/callback` con `code` + `state`
5. El callback verifica el estado y redirige a Edge Function
6. Edge Function intercambia `code` por token de acceso
7. Token se cifra con `ENCRYPTION_KEY` y se guarda en `integration_tokens`
8. Cuenta externa se registra en `integration_accounts`
9. Redirección al dashboard con mensaje de éxito

## Webhooks entrantes

Los webhooks entrantes se reciben en `/api/webhook/[provider]`:

- Meta/Instagram: `POST /api/webhook/meta`
- Verificación: `GET /api/webhook/meta?hub.mode=subscribe&hub.verify_token=...`

### Flujo de procesamiento

1. Proveedor externo envía payload a la API Route
2. Se valida firma (si el proveedor lo soporta) o se verifica token
3. Se guarda evento en `webhook_events` con estado `received`
4. Se procesa el evento según su tipo
5. Para mensajes de Instagram: se crea/actualiza cliente + conversación + mensaje
6. Se actualiza estado del evento a `processed` o `failed`
7. En caso de fallo, se programa reintento (máximo 3)

### Idempotency

Cada evento incluye un `idempotency_key` único. Si el mismo key ya existe en la base de datos, el evento se ignora para evitar duplicados.

## Webhooks salientes

La plataforma puede notificar eventos a sistemas externos:

1. Administrador configura endpoint en `/dashboard/webhooks`
2. Selecciona eventos a recibir (ej: `lead.created`, `ticket.created`)
3. Cuando ocurre el evento, se envía POST al endpoint configurado
4. Payload incluye: `event`, `idempotency_key`, `company_id`, `data`, `timestamp`

### Eventos disponibles

- `lead.created` — Nuevo lead desde Instagram
- `ticket.created` — Nuevo ticket de soporte
- `reservation.created` — Nueva reserva
- `campaign.activated` — Campaña activada
- `conversation.handoff` — Conversación derivada a humano
- `file.processed` — Archivo procesado y embebido

## API Keys

Las API Keys se gestionan desde `/dashboard/api-keys`.

### Uso

```http
POST /api/keys/verify
Authorization: Bearer rr_abc123...
Content-Type: application/json

{
  "action": "leads:create"
}
```

### Scopes disponibles

| Scope               | Descripción                                    |
| ------------------- | ---------------------------------------------- |
| `leads:create`      | Crear leads desde formularios externos         |
| `tickets:create`    | Crear tickets de soporte                       |
| `reservations:create` | Crear reservas                               |
| `reservations:read` | Consultar estado de reservas                   |
| `conversations:read` | Leer conversaciones                           |
| `analytics:read`    | Consultar métricas                             |
| `files:create`      | Subir archivos                                 |
| `webhooks:manage`   | Administrar webhooks                           |

## Seguridad

- Tokens OAuth cifrados con AES (`ENCRYPTION_KEY` en environment)
- API Keys hasheadas con SHA-256 (nunca almacenadas en texto plano)
- Webhook secrets hasheados
- State de OAuth firmado (base64 JSON)
- RLS por `company_id` en todas las tablas
- Solo super_admin puede ver tokens cifrados
- Rate limiting configurable por API Key (default: 60 req/min)
- Limpieza automática de eventos antiguos (>90 días)
- Logs de auditoría sin datos sensibles

## Configuración en producción

1. Configurar variables de entorno (ver `.env.example`)
2. Ejecutar migración `002_integrations.sql`
3. Configurar Edge Functions en Supabase Dashboard
4. Registrar webhooks en Meta for Developers
5. Configurar OAuth redirect URIs (Meta y Google)
