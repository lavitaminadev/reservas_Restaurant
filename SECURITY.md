# Seguridad — Reservas Restaurant

## Principios

1. **Aislamiento multiempresa**: RLS en todas las tablas filtra por `company_id`
2. **Mínimo privilegio**: cada rol tiene permisos específicos
3. **Sin exposición de secrets**: `service_role` solo en server/admin
4. **Storage privado**: URLs firmadas temporales para descarga
5. **Tokens cifrados**: Meta tokens se almacenan cifrados (implementar con pgcrypto)

## RLS (Row Level Security)

Todas las tablas tienen RLS habilitado. Políticas por operación:

| Operación | Política base                  |
| --------- | ------------------------------ |
| `SELECT`  | Usuario pertenece a la empresa |
| `INSERT`  | Usuario tiene permisos escritura |
| `UPDATE`  | Usuario tiene permisos escritura |
| `DELETE`  | Solo admin/owner               |

### Funciones helper RLS

- `user_belongs_to_company(company_id)` — verifica membresía activa
- `user_role_in_company(company_id)` — obtiene rol del usuario
- `user_can_write(company_id)` — permisos de escritura
- `user_is_admin_or_owner(company_id)` — permisos administrativos

## Roles y permisos

| Acción                | owner | admin | ejecutivo | marketing | read_only |
| --------------------- | ----- | ----- | --------- | --------- | --------- |
| Ver empresas          | ✅    | ✅    | ✅        | ✅        | ✅        |
| Editar empresa        | ✅    | ✅    | ❌        | ❌        | ❌        |
| Gestionar usuarios    | ✅    | ✅    | ❌        | ❌        | ❌        |
| Subir archivos        | ✅    | ✅    | ✅        | ✅        | ❌        |
| Gestionar chatbot     | ✅    | ✅    | ✅        | ✅        | ❌        |
| Campañas              | ✅    | ✅    | ❌        | ✅        | ❌        |
| Ver conversaciones    | ✅    | ✅    | ✅        | ✅        | ✅        |
| Responder mensajes    | ✅    | ✅    | ✅        | ❌        | ❌        |
| Auditoría             | ✅    | ✅    | ❌        | ❌        | ❌        |
| Eliminar datos        | ✅    | ❌    | ❌        | ❌        | ❌        |

## Storage

- Bucket `company_files`: privado, archivos organizados por `{company_id}/{uuid}.{ext}`
- Bucket `temp_uploads`: privado, limpieza automática de temporales
- Bucket `company_avatars`: público solo para avatares
- Descargas mediante URLs firmadas con expiración (1 hora)
- Validación de MIME type y tamaño máximo (10 MB)

## Buenas prácticas

- No exponer `SUPABASE_SERVICE_ROLE_KEY` en frontend
- Usar `getSupabaseAdmin()` solo en Server Components o API Routes
- Cifrar tokens sensibles con `pgp_sym_encrypt` usando `ENCRYPTION_KEY`
- Checksum SHA-256 para evitar archivos duplicados
- Rate limiting en endpoints de API (implementar con Edge Functions)
- Auditoría de acciones críticas en `audit_logs`
- Sanitizar inputs en el servidor antes de insertar en DB

## Pendiente

- [ ] Implementar cifrado de Meta tokens con pgcrypto
- [ ] Rate limiting en Edge Functions
- [ ] Webhook signature verification para Meta
- [ ] Backup automático de base de datos
- [ ] WAF y DDoS protection (Cloudflare)
