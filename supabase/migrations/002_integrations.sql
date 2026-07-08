-- ============================================================================
-- Migración 002: Módulo de Integraciones, Webhooks y API Keys
-- ============================================================================
-- Tablas, RLS, funciones, triggers para el ecosistema de integraciones
-- externas: Meta, Instagram, Google, webhooks entrantes/salientes, API Keys
-- ============================================================================

-- ============================================================================
-- 1. INTEGRATION_PROVIDERS (catálogo de proveedores disponibles)
-- ============================================================================
CREATE TABLE integration_providers (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text,
  icon_url      text,
  docs_url      text,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'beta', 'deprecated', 'disabled')),
  config_schema jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_providers_slug ON integration_providers (slug);

-- Seed: proveedores disponibles
INSERT INTO integration_providers (name, slug, description, icon_url, config_schema) VALUES
  ('Meta / Facebook', 'meta', 'Facebook Pages, Instagram Professional, Meta Graph API', NULL, '{"oauth": true, "scopes": ["pages_show_list", "instagram_basic", "instagram_manage_messages", "pages_messaging"]}'),
  ('Instagram', 'instagram', 'Instagram messaging, comments, webhooks', NULL, '{"oauth": true, "scopes": ["instagram_basic", "instagram_manage_messages"]}'),
  ('Google Calendar', 'google_calendar', 'Sincronización de reservas y disponibilidad', NULL, '{"oauth": true, "scopes": ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"]}'),
  ('Gmail', 'gmail', 'Envío de correos transaccionales y respuestas', NULL, '{"oauth": true, "scopes": ["https://www.googleapis.com/auth/gmail.send"]}'),
  ('Google Drive', 'google_drive', 'Importación de archivos y documentos', NULL, '{"oauth": true, "scopes": ["https://www.googleapis.com/auth/drive.readonly"]}'),
  ('Google Business Profile', 'google_business', 'Información pública del negocio en Google', NULL, '{"oauth": true, "scopes": ["https://www.googleapis.com/auth/business.manage"]}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. COMPANY_INTEGRATIONS (estado de cada integración por empresa)
-- ============================================================================
CREATE TABLE company_integrations (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id   uuid NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connecting', 'connected', 'error', 'disconnected', 'revoked')),
  connected_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at  timestamptz,
  disconnected_at timestamptz,
  last_error    text,
  error_count   int NOT NULL DEFAULT 0,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, provider_id)
);

CREATE INDEX idx_company_integrations_company ON company_integrations (company_id);
CREATE INDEX idx_company_integrations_provider ON company_integrations (provider_id);
CREATE INDEX idx_company_integrations_status ON company_integrations (status);

-- ============================================================================
-- 3. INTEGRATION_ACCOUNTS (cuentas externas conectadas por integración)
-- ============================================================================
CREATE TABLE integration_accounts (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_integration_id uuid REFERENCES company_integrations(id) ON DELETE CASCADE,
  provider            text NOT NULL,
  external_account_id   text NOT NULL,
  external_account_name text,
  account_type        text,
  avatar_url          text,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  permissions         text[] NOT NULL DEFAULT '{}',
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_accounts_company ON integration_accounts (company_id);
CREATE INDEX idx_integration_accounts_provider ON integration_accounts (provider);
CREATE INDEX idx_integration_accounts_external ON integration_accounts (external_account_id);

-- ============================================================================
-- 4. INTEGRATION_TOKENS (tokens OAuth cifrados)
-- ============================================================================
CREATE TABLE integration_tokens (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_account_id  uuid REFERENCES integration_accounts(id) ON DELETE CASCADE,
  provider                text NOT NULL,
  access_token_encrypted  text NOT NULL,
  refresh_token_encrypted text,
  expires_at              timestamptz,
  scopes                  text[] NOT NULL DEFAULT '{}',
  token_type              text NOT NULL DEFAULT 'bearer',
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  last_refreshed_at       timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_tokens_company ON integration_tokens (company_id);
CREATE INDEX idx_integration_tokens_account ON integration_tokens (integration_account_id);
CREATE INDEX idx_integration_tokens_expires ON integration_tokens (expires_at);

-- ============================================================================
-- 5. WEBHOOK_ENDPOINTS (webhooks salientes configurados por empresa)
-- ============================================================================
CREATE TABLE webhook_endpoints (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  url             text NOT NULL,
  secret_hash     text,
  events          text[] NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled', 'error')),
  last_sent_at    timestamptz,
  last_error      text,
  success_count   int NOT NULL DEFAULT 0,
  failure_count   int NOT NULL DEFAULT 0,
  rate_limit      int NOT NULL DEFAULT 100,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_endpoints_company ON webhook_endpoints (company_id);
CREATE INDEX idx_webhook_endpoints_status ON webhook_endpoints (status);

-- ============================================================================
-- 6. WEBHOOK_EVENTS (registro normalizado de eventos entrantes y salientes)
-- ============================================================================
CREATE TYPE webhook_event_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE webhook_event_status AS ENUM ('received', 'processing', 'processed', 'failed', 'ignored', 'retrying');

CREATE TABLE webhook_events (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        uuid REFERENCES companies(id) ON DELETE CASCADE,
  endpoint_id       uuid REFERENCES webhook_endpoints(id) ON DELETE SET NULL,
  direction         webhook_event_direction NOT NULL,
  provider          text NOT NULL,
  event_type        text NOT NULL,
  external_event_id text,
  idempotency_key   text,
  status            webhook_event_status NOT NULL DEFAULT 'received',
  payload_safe      jsonb NOT NULL DEFAULT '{}',
  headers_safe      jsonb NOT NULL DEFAULT '{}',
  error_message     text,
  retry_count       int NOT NULL DEFAULT 0,
  max_retries       int NOT NULL DEFAULT 3,
  next_retry_at     timestamptz,
  received_at       timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz
);

CREATE INDEX idx_webhook_events_company ON webhook_events (company_id);
CREATE INDEX idx_webhook_events_status ON webhook_events (status);
CREATE INDEX idx_webhook_events_direction ON webhook_events (direction);
CREATE INDEX idx_webhook_events_provider ON webhook_events (provider);
CREATE INDEX idx_webhook_events_idempotency ON webhook_events (idempotency_key);
CREATE INDEX idx_webhook_events_received ON webhook_events (received_at DESC);

-- ============================================================================
-- 7. WEBHOOK_EVENT_RETRIES (dead letter queue para reintentos)
-- ============================================================================
CREATE TABLE webhook_event_retries (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_event_id  uuid NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
  attempt           int NOT NULL,
  status            text NOT NULL CHECK (status IN ('success', 'failed')),
  response_status   int,
  response_body     text,
  error_message     text,
  executed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_event_retries_event ON webhook_event_retries (webhook_event_id);

-- ============================================================================
-- 8. API_KEYS (claves de API por empresa para integración externa)
-- ============================================================================
CREATE TYPE api_key_scope AS ENUM (
  'leads:create',
  'tickets:create',
  'reservations:create',
  'reservations:read',
  'conversations:read',
  'analytics:read',
  'files:create',
  'webhooks:manage'
);

CREATE TABLE api_keys (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  key_prefix      text NOT NULL,
  key_hash        text NOT NULL,
  key_last_chars  text NOT NULL,
  scopes          api_key_scope[] NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'revoked', 'expired')),
  expires_at      timestamptz,
  last_used_at    timestamptz,
  rate_limit      int NOT NULL DEFAULT 60,
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revoked_at      timestamptz,
  revoked_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_company ON api_keys (company_id);
CREATE INDEX idx_api_keys_status ON api_keys (status);
CREATE INDEX idx_api_keys_prefix ON api_keys (key_prefix);

-- ============================================================================
-- 9. SYNC_JOBS (registro de sincronizaciones con servicios externos)
-- ============================================================================
CREATE TYPE sync_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE sync_job_type AS ENUM (
  'full_sync',
  'incremental',
  'token_refresh',
  'webhook_verify',
  'import_files',
  'export_data'
);

CREATE TABLE sync_jobs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider        text NOT NULL,
  job_type        sync_job_type NOT NULL,
  status          sync_job_status NOT NULL DEFAULT 'pending',
  started_at      timestamptz,
  finished_at     timestamptz,
  error_message   text,
  items_processed int NOT NULL DEFAULT 0,
  items_total     int NOT NULL DEFAULT 0,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_jobs_company ON sync_jobs (company_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs (status);
CREATE INDEX idx_sync_jobs_provider ON sync_jobs (provider);

-- ============================================================================
-- 10. INTEGRATION_AUDIT_LOGS (auditoría específica de integraciones)
-- ============================================================================
CREATE TABLE integration_audit_logs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,
  integration     text NOT NULL,
  action          text NOT NULL,
  actor_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id       text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  ip_address      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_audit_logs_company ON integration_audit_logs (company_id);
CREATE INDEX idx_integration_audit_logs_integration ON integration_audit_logs (integration);
CREATE INDEX idx_integration_audit_logs_created ON integration_audit_logs (created_at DESC);

-- ============================================================================
-- TRIGGERS: updated_at
-- ============================================================================
CREATE TRIGGER trg_company_integrations_updated_at
  BEFORE UPDATE ON company_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_integration_tokens_updated_at
  BEFORE UPDATE ON integration_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCIÓN: generar prefijo de API Key
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_api_key_prefix()
RETURNS text AS $$
BEGIN
  RETURN 'rr_' || encode(gen_random_bytes(6), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: hash de API Key (SHA-256)
-- ============================================================================
CREATE OR REPLACE FUNCTION hash_api_key(p_key text)
RETURNS text AS $$
BEGIN
  RETURN encode(
    digest(p_key, 'sha256'),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCIÓN: webhook idempotency key
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_idempotency_key()
RETURNS text AS $$
BEGIN
  RETURN 'whk_' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: limpiar eventos antiguos (retener 90 días)
-- ============================================================================
CREATE OR REPLACE FUNCTION clean_old_webhook_events(p_retention_days int DEFAULT 90)
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM webhook_events
  WHERE received_at < now() - (p_retention_days || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCIÓN: limpiar sync_jobs antiguos (retener 30 días)
-- ============================================================================
CREATE OR REPLACE FUNCTION clean_old_sync_jobs(p_retention_days int DEFAULT 30)
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM sync_jobs
  WHERE created_at < now() - (p_retention_days || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- integration_providers (catálogo público de solo lectura)
ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_providers_select ON integration_providers FOR SELECT
  USING (true);

-- company_integrations
ALTER TABLE company_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_integrations_select ON company_integrations FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY company_integrations_insert ON company_integrations FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY company_integrations_update ON company_integrations FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY company_integrations_delete ON company_integrations FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- integration_accounts
ALTER TABLE integration_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_accounts_select ON integration_accounts FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY integration_accounts_insert ON integration_accounts FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY integration_accounts_update ON integration_accounts FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY integration_accounts_delete ON integration_accounts FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- integration_tokens (solo super_admin puede ver tokens; usuarios ven metadata)
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_tokens_select ON integration_tokens FOR SELECT
  USING (
    user_belongs_to_company(company_id)
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
      OR false -- usuarios normales no ven tokens
    )
  );

CREATE POLICY integration_tokens_insert ON integration_tokens FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY integration_tokens_update ON integration_tokens FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY integration_tokens_delete ON integration_tokens FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- webhook_endpoints
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_endpoints_select ON webhook_endpoints FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY webhook_endpoints_insert ON webhook_endpoints FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY webhook_endpoints_update ON webhook_endpoints FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY webhook_endpoints_delete ON webhook_endpoints FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_select ON webhook_events FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY webhook_events_insert ON webhook_events FOR INSERT
  WITH CHECK (true); -- webhooks entrantes pueden llegar sin auth

CREATE POLICY webhook_events_delete ON webhook_events FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- webhook_event_retries
ALTER TABLE webhook_event_retries ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_event_retries_select ON webhook_event_retries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM webhook_events we
    JOIN company_integrations ci ON ci.company_id = we.company_id
    WHERE we.id = webhook_event_id AND user_belongs_to_company(we.company_id)
  ));

-- api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_select ON api_keys FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY api_keys_insert ON api_keys FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY api_keys_update ON api_keys FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY api_keys_delete ON api_keys FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- sync_jobs
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_jobs_select ON sync_jobs FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY sync_jobs_insert ON sync_jobs FOR INSERT
  WITH CHECK (user_can_write(company_id));

-- integration_audit_logs
ALTER TABLE integration_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_audit_logs_select ON integration_audit_logs FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY integration_audit_logs_insert ON integration_audit_logs FOR INSERT
  WITH CHECK (true);
