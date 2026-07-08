# Integración Meta (Instagram)

## Arquitectura

```
[Instagram/Meta] ←→ [Webhook Edge Function] → [Supabase DB]
                       ↓
[Meta Graph API] ← [Backend Service] ← [Frontend Dashboard]
```

## Configuración inicial

### 1. Crear App en Meta for Developers

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear app tipo "Business"
3. Agregar producto "Instagram Basic Display" y "Instagram Graph API"
4. Configurar Webhook con URL de tu Edge Function

### 2. Variables de entorno

```env
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-verify-token
META_GRAPH_API_VERSION=v18.0
```

### 3. Flujo de conexión de cuenta Instagram

```
1. Usuario hace clic en "Conectar Instagram"
2. Redirige a Meta OAuth:
   GET https://graph.facebook.com/{version}/dialog/oauth
     ?client_id={app_id}
     &redirect_uri={callback_url}
     &scope=instagram_basic,instagram_manage_messages,pages_show_list
     &state={company_id}

3. Callback recibe código de autorización
4. Servidor intercambia código por access_token (largo plazo)
5. Token se cifra y guarda en connected_accounts
6. Se configura Webhook para mensajes entrantes
```

### 4. Webhooks

Meta envía eventos a tu Edge Function:
- `messages` — nuevos mensajes
- `messaging_optins` — opt-ins
- `messaging_referrals` — referidos

Estructura del webhook:

```json
{
  "object": "instagram",
  "entry": [{
    "id": "ig-id",
    "time": 1234567890,
    "messaging": [{
      "sender": { "id": "user-id" },
      "recipient": { "id": "page-id" },
      "timestamp": 1234567890,
      "message": { "mid": "mid", "text": "Hola" }
    }]
  }]
}
```

### 5. Envío de mensajes

```http
POST https://graph.facebook.com/{version}/{ig-user-id}/messages
  ?access_token={page-access-token}
Content-Type: application/json

{
  "recipient": { "id": "user-id" },
  "message": { "text": "Respuesta del chatbot" }
}
```

## Tablas relacionadas

- `connected_accounts` — tokens y metadata de cuentas Meta
- `customers` — clientes identificados por `platform_id`
- `conversations` — hilos por canal (`channel = 'instagram'`)
- `messages` — mensajes del webhook y respuestas

## Seguridad

- Access tokens cifrados con `ENCRYPTION_KEY`
- Webhook verify token configurable por empresa
- Tokens de página, no tokens de usuario (menos permisivos)
- Rotación automática de tokens de largo plazo (60 días)

## Pendiente

- [ ] Edge Function para recibir webhooks de Meta
- [ ] Edge Function para refresh automático de tokens
- [ ] Implementar cifrado/descifrado de tokens con pgcrypto
- [ ] Manejo de rate limits de Meta Graph API
- [ ] Reconexión automática si token expira
- [ ] WhatsApp: conectar usando Cloud API cuando esté disponible
