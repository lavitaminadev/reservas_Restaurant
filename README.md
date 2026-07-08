# Reservas Restaurant — SaaS Multiempresa

Plataforma SaaS multiempresa para restaurantes/restobares con integración Instagram, chatbot con IA, base de conocimiento vectorial (pgvector) y dashboard de gestión.

## Stack

| Capa        | Tecnología                     |
| ----------- | ------------------------------ |
| Frontend    | Next.js 16 (App Router)        |
| Estilos     | Tailwind CSS 3                 |
| Backend/DB  | Supabase (PostgreSQL + pgvector) |
| Auth        | Supabase Auth                  |
| Storage     | Supabase Storage (privado)     |
| Vector DB   | pgvector (embeddings 1536d)    |
| Serverless  | Supabase Edge Functions (futuro) |
| Integración | Meta Graph API (Instagram)     |

## Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx              # Layout raíz
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Estilos globales + Tailwind
│   ├── (auth)/
│   │   └── login/page.tsx      # Login/registro
│   ├── auth/
│   │   └── logout/route.ts     # Cierre de sesión
│   ├── middleware.ts           # Protección de rutas
│   └── dashboard/
│       ├── layout.tsx          # Layout con sidebar
│       ├── page.tsx            # Dashboard principal
│       └── [...slug]/page.tsx  # Páginas dinámicas
├── components/
│   ├── layout/
│   │   └── sidebar.tsx         # Navegación lateral
│   └── ui/
│       ├── card.tsx            # Tarjeta de métrica
│       ├── badge.tsx           # Badge de estado
│       └── table.tsx           # Tabla genérica
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Cliente browser
│   │   ├── server.ts           # Cliente server + admin
│   │   └── middleware.ts       # Helper middleware
│   ├── types/
│   │   └── database.ts         # Tipos TypeScript
│   └── services/
│       ├── companies.ts        # Empresas
│       ├── profiles.ts         # Perfiles
│       ├── company-users.ts    # Usuarios por empresa
│       ├── connected-accounts.ts # Cuentas conectadas
│       ├── files.ts            # Archivos
│       ├── knowledge.ts        # Base de conocimiento
│       ├── chatbot.ts          # Config chatbot
│       ├── flows.ts            # Flujos
│       ├── campaigns.ts        # Campañas
│       ├── customers.ts        # Clientes
│       ├── conversations.ts    # Conversaciones
│       ├── tickets.ts          # Tickets
│       ├── analytics.ts        # Eventos/analítica
│       ├── audit.ts            # Auditoría
│       └── dashboard.ts        # Métricas dashboard
└── hooks/                      # Hooks personalizados

supabase/
└── migrations/
    └── 001_schema.sql          # Migración completa
```

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 3. Ejecutar migración en Supabase SQL Editor
# Abrir supabase/migrations/001_schema.sql y ejecutar en SQL Editor

# 4. Iniciar desarrollo
npm run dev
```

## Variables de entorno

Ver `.env.example` para todas las variables requeridas.

## Roles de usuario

| Rol         | Descripción                          |
| ----------- | ------------------------------------ |
| `owner`     | Dueño — acceso completo              |
| `admin`     | Administrador — gestión operativa    |
| `ejecutivo` | Ejecutivo — atención al cliente      |
| `marketing` | Marketing — campañas y contenido     |
| `read_only` | Solo lectura — consultas             |
| super_admin | Global — acceso a todas las empresas |

## Modelo de datos

Ver `supabase/migrations/001_schema.sql` para el esquema completo con:
- 20 tablas con RLS
- Políticas de seguridad por empresa
- pgvector para búsqueda semántica
- Triggers de auditoría
- Buckets de Storage privados
