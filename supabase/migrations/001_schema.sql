-- ============================================================================
-- SaaS Multiempresa para Restaurantes — Esquema Completo
-- ============================================================================
-- Tablas, RLS, índices, funciones, triggers, storage y pgvector
-- ============================================================================

-- 0. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- 1. COMPANIES
-- ============================================================================
CREATE TABLE companies (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text,
  logo_url      text,
  website       text,
  phone         text,
  email         text,
  instagram     text,
  whatsapp      text,
  is_active     boolean NOT NULL DEFAULT true,
  settings      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_slug ON companies (slug);
CREATE INDEX idx_companies_is_active ON companies (is_active);
CREATE INDEX idx_companies_created_at ON companies (created_at DESC);

-- ============================================================================
-- 2. PROFILES (extends auth.users)
-- ============================================================================
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  avatar_url    text,
  phone         text,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_is_super_admin ON profiles (is_super_admin);

-- ============================================================================
-- 3. COMPANY_USERS (roles por empresa)
-- ============================================================================
CREATE TYPE user_role AS ENUM (
  'owner', 'admin', 'ejecutivo', 'marketing', 'read_only'
);

CREATE TABLE company_users (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'read_only',
  is_active     boolean NOT NULL DEFAULT true,
  invited_at    timestamptz,
  joined_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_users_company_id ON company_users (company_id);
CREATE INDEX idx_company_users_user_id ON company_users (user_id);
CREATE INDEX idx_company_users_role ON company_users (role);

-- ============================================================================
-- 4. CONNECTED_ACCOUNTS (Meta/Instagram)
-- ============================================================================
CREATE TABLE connected_accounts (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  platform        text NOT NULL CHECK (platform IN ('instagram', 'whatsapp', 'facebook', 'meta')),
  platform_user_id text NOT NULL,
  platform_name   text,
  platform_avatar text,
  access_token    text NOT NULL, -- encrypted
  refresh_token   text,
  token_expires_at timestamptz,
  webhook_verify_token text,
  is_active       boolean NOT NULL DEFAULT true,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_connected_accounts_company ON connected_accounts (company_id);
CREATE INDEX idx_connected_accounts_platform ON connected_accounts (platform);

-- ============================================================================
-- 5. COMPANY_FILES
-- ============================================================================
CREATE TYPE file_category AS ENUM (
  'carta', 'faq', 'promociones', 'horarios', 'eventos',
  'reglas', 'politicas_reserva', 'documentos_internos',
  'imagenes', 'other'
);

CREATE TABLE company_files (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by     uuid NOT NULL REFERENCES auth.users(id),
  category        file_category NOT NULL DEFAULT 'other',
  filename        text NOT NULL,
  original_name   text NOT NULL,
  mime_type       text NOT NULL,
  size_bytes      bigint NOT NULL,
  storage_path    text NOT NULL,
  checksum        text,
  is_processed    boolean NOT NULL DEFAULT false,
  is_temp         boolean NOT NULL DEFAULT false,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_files_company ON company_files (company_id);
CREATE INDEX idx_company_files_category ON company_files (category);
CREATE INDEX idx_company_files_checksum ON company_files (checksum);
CREATE INDEX idx_company_files_is_processed ON company_files (is_processed);

-- ============================================================================
-- 6. TEMP_FILES (para limpieza automática)
-- ============================================================================
CREATE TABLE temp_files (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_id         uuid REFERENCES company_files(id) ON DELETE SET NULL,
  storage_path    text NOT NULL,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_temp_files_expires ON temp_files (expires_at);

-- ============================================================================
-- 7. KNOWLEDGE_DOCUMENTS
-- ============================================================================
CREATE TABLE knowledge_documents (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_id         uuid REFERENCES company_files(id) ON DELETE SET NULL,
  title           text NOT NULL,
  source_type     text NOT NULL DEFAULT 'file' CHECK (source_type IN ('file', 'manual', 'import')),
  raw_text        text NOT NULL,
  word_count      int NOT NULL DEFAULT 0,
  is_processed    boolean NOT NULL DEFAULT false,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_documents_company ON knowledge_documents (company_id);
CREATE INDEX idx_knowledge_documents_is_processed ON knowledge_documents (is_processed);

-- ============================================================================
-- 8. KNOWLEDGE_CHUNKS (pgvector)
-- ============================================================================
CREATE TABLE knowledge_chunks (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index     int NOT NULL,
  chunk_text      text NOT NULL,
  embedding       vector(1536) NOT NULL, -- OpenAI text-embedding-3-small
  token_count     int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_chunks_company ON knowledge_chunks (company_id);
CREATE INDEX idx_knowledge_chunks_document ON knowledge_chunks (document_id);
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_knowledge_chunks_created_at ON knowledge_chunks (created_at DESC);

-- ============================================================================
-- 9. CHATBOT_SETTINGS
-- ============================================================================
CREATE TABLE chatbot_settings (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  is_enabled      boolean NOT NULL DEFAULT false,
  active_flow_id  uuid,
  welcome_message text NOT NULL DEFAULT '¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte?',
  fallback_message text NOT NULL DEFAULT 'Lo siento, no entendí. ¿Puedes reformular?',
  tone            text NOT NULL DEFAULT 'profesional' CHECK (tone IN ('profesional', 'casual', 'amigable', 'formal')),
  max_tokens      int NOT NULL DEFAULT 500,
  temperature     numeric(3,2) NOT NULL DEFAULT 0.7,
  top_k           int NOT NULL DEFAULT 3,
  system_prompt   text,
  business_hours  jsonb NOT NULL DEFAULT '{}',
  auto_reply      boolean NOT NULL DEFAULT false,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chatbot_settings_enabled ON chatbot_settings (is_enabled);

-- ============================================================================
-- 10. FLOWS
-- ============================================================================
CREATE TABLE flows (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  is_active       boolean NOT NULL DEFAULT false,
  version         int NOT NULL DEFAULT 1,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flows_company ON flows (company_id);
CREATE INDEX idx_flows_is_active ON flows (is_active);

-- ============================================================================
-- 11. FLOW_NODES
-- ============================================================================
CREATE TYPE node_type AS ENUM (
  'start', 'message', 'question', 'condition', 'action',
  'api_call', 'human_handoff', 'end'
);

CREATE TABLE flow_nodes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id         uuid NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  type            node_type NOT NULL,
  label           text NOT NULL,
  config          jsonb NOT NULL DEFAULT '{}',
  position_x      numeric NOT NULL DEFAULT 0,
  position_y      numeric NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flow_nodes_flow ON flow_nodes (flow_id);

-- ============================================================================
-- 12. FLOW_EDGES
-- ============================================================================
CREATE TABLE flow_edges (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id         uuid NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  source_node_id  uuid NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  target_node_id  uuid NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  label           text,
  condition       jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flow_edges_flow ON flow_edges (flow_id);

-- ============================================================================
-- 13. CAMPAIGNS
-- ============================================================================
CREATE TABLE campaigns (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  flow_id         uuid REFERENCES flows(id) ON DELETE SET NULL,
  name            text NOT NULL,
  description     text,
  channel         text NOT NULL CHECK (channel IN ('instagram', 'whatsapp', 'email', 'sms', 'all')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  scheduled_at    timestamptz,
  started_at      timestamptz,
  ended_at        timestamptz,
  target_audience jsonb NOT NULL DEFAULT '{}',
  metrics         jsonb NOT NULL DEFAULT '{}',
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_company ON campaigns (company_id);
CREATE INDEX idx_campaigns_status ON campaigns (status);
CREATE INDEX idx_campaigns_channel ON campaigns (channel);

-- ============================================================================
-- 14. CUSTOMERS
-- ============================================================================
CREATE TABLE customers (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  platform        text NOT NULL CHECK (platform IN ('instagram', 'whatsapp', 'facebook', 'web')),
  platform_id     text,
  name            text NOT NULL,
  username        text,
  avatar_url      text,
  phone           text,
  email           text,
  total_conversations int NOT NULL DEFAULT 0,
  last_interaction_at timestamptz,
  tags            text[] NOT NULL DEFAULT '{}',
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_company ON customers (company_id);
CREATE INDEX idx_customers_platform ON customers (platform);
CREATE INDEX idx_customers_last_interaction ON customers (last_interaction_at DESC);

-- ============================================================================
-- 15. CONVERSATIONS
-- ============================================================================
CREATE TYPE conversation_status AS ENUM (
  'active', 'waiting', 'resolved', 'closed', 'spam'
);

CREATE TABLE conversations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel         text NOT NULL CHECK (channel IN ('instagram', 'whatsapp', 'facebook', 'web', 'api')),
  channel_conversation_id text,
  status          conversation_status NOT NULL DEFAULT 'active',
  assigned_to     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  flow_id         uuid REFERENCES flows(id) ON DELETE SET NULL,
  is_handoff      boolean NOT NULL DEFAULT false,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_company ON conversations (company_id);
CREATE INDEX idx_conversations_customer ON conversations (customer_id);
CREATE INDEX idx_conversations_status ON conversations (status);
CREATE INDEX idx_conversations_channel ON conversations (channel);
CREATE INDEX idx_conversations_assigned ON conversations (assigned_to);
CREATE INDEX idx_conversations_created_at ON conversations (created_at DESC);

-- ============================================================================
-- 16. MESSAGES
-- ============================================================================
CREATE TYPE message_sender AS ENUM ('customer', 'bot', 'agent', 'system');

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender          message_sender NOT NULL,
  content         text NOT NULL,
  content_type    text NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'file', 'template', 'interactive')),
  platform_message_id text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id);
CREATE INDEX idx_messages_sender ON messages (sender);
CREATE INDEX idx_messages_created_at ON messages (created_at ASC);

-- ============================================================================
-- 17. TICKETS
-- ============================================================================
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE tickets (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  status          ticket_status NOT NULL DEFAULT 'open',
  priority        ticket_priority NOT NULL DEFAULT 'medium',
  assigned_to     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at     timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_company ON tickets (company_id);
CREATE INDEX idx_tickets_status ON tickets (status);
CREATE INDEX idx_tickets_priority ON tickets (priority);
CREATE INDEX idx_tickets_assigned ON tickets (assigned_to);

-- ============================================================================
-- 18. ANALYTICS_EVENTS
-- ============================================================================
CREATE TABLE analytics_events (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  event_name      text NOT NULL,
  channel         text,
  properties      jsonb NOT NULL DEFAULT '{}',
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_company ON analytics_events (company_id);
CREATE INDEX idx_analytics_event_type ON analytics_events (event_type);
CREATE INDEX idx_analytics_created_at ON analytics_events (created_at DESC);

-- ============================================================================
-- 19. AUDIT_LOGS
-- ============================================================================
CREATE TABLE audit_logs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid REFERENCES companies(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       text,
  details         jsonb NOT NULL DEFAULT '{}',
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_company ON audit_logs (company_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- ============================================================================
-- 20. WHATSAPP_ACCOUNTS_FUTURE (placeholder)
-- ============================================================================
CREATE TABLE whatsapp_accounts_future (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  phone_number_id   text,
  business_account_id text,
  waba_id           text,
  access_token      text,
  webhook_secret    text,
  is_connected      boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT false,
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_accounts_future_company ON whatsapp_accounts_future (company_id);

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas con updated_at
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_company_users_updated_at
  BEFORE UPDATE ON company_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_company_files_updated_at
  BEFORE UPDATE ON company_files FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chatbot_settings_updated_at
  BEFORE UPDATE ON chatbot_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_flows_updated_at
  BEFORE UPDATE ON flows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auditoría automática
CREATE OR REPLACE FUNCTION log_audit(
  p_company_id uuid,
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
  VALUES (p_company_id, p_user_id, p_action, p_entity_type, p_entity_id, p_details, p_ip_address, p_user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buscar chunks por similitud coseno
CREATE OR REPLACE FUNCTION search_knowledge(
  p_company_id uuid,
  p_embedding vector(1536),
  p_match_count int DEFAULT 5,
  p_threshold numeric DEFAULT 0.7
)
RETURNS TABLE(
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  similarity numeric,
  document_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.chunk_text,
    1 - (kc.embedding <=> p_embedding) AS similarity,
    kd.title
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.company_id = p_company_id
    AND 1 - (kc.embedding <=> p_embedding) > p_threshold
  ORDER BY kc.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;

-- Limpieza de archivos temporales expirados
CREATE OR REPLACE FUNCTION clean_expired_temp_files()
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM temp_files WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Helper: usuario pertenece a empresa
CREATE OR REPLACE FUNCTION user_belongs_to_company(p_company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_users
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: rol de usuario en empresa
CREATE OR REPLACE FUNCTION user_role_in_company(p_company_id uuid)
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM company_users
  WHERE company_id = p_company_id
    AND user_id = auth.uid()
    AND is_active = true;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: permisos de escritura
CREATE OR REPLACE FUNCTION user_can_write(p_company_id uuid)
RETURNS boolean AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role := user_role_in_company(p_company_id);
  RETURN v_role IN ('owner', 'admin', 'ejecutivo', 'marketing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: permisos de admin/owner
CREATE OR REPLACE FUNCTION user_is_admin_or_owner(p_company_id uuid)
RETURNS boolean AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role := user_role_in_company(p_company_id);
  RETURN v_role IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select ON companies FOR SELECT
  USING (user_belongs_to_company(id) OR is_active = true);

CREATE POLICY companies_insert ON companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY companies_update ON companies FOR UPDATE
  USING (user_is_admin_or_owner(id))
  WITH CHECK (user_is_admin_or_owner(id));

CREATE POLICY companies_delete ON companies FOR DELETE
  USING (user_is_admin_or_owner(id));

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM company_users cu
    JOIN profiles p ON p.id = auth.uid()
    WHERE cu.user_id = p.id AND p.is_super_admin = true
  ));

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- company_users
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_users_select ON company_users FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY company_users_insert ON company_users FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY company_users_update ON company_users FOR UPDATE
  USING (user_is_admin_or_owner(company_id))
  WITH CHECK (user_is_admin_or_owner(company_id));

CREATE POLICY company_users_delete ON company_users FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- connected_accounts
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY connected_accounts_select ON connected_accounts FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY connected_accounts_insert ON connected_accounts FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY connected_accounts_update ON connected_accounts FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY connected_accounts_delete ON connected_accounts FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- company_files
ALTER TABLE company_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_files_select ON company_files FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY company_files_insert ON company_files FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY company_files_update ON company_files FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY company_files_delete ON company_files FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- temp_files
ALTER TABLE temp_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY temp_files_select ON temp_files FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY temp_files_insert ON temp_files FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY temp_files_delete ON temp_files FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- knowledge_documents
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_documents_select ON knowledge_documents FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY knowledge_documents_insert ON knowledge_documents FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY knowledge_documents_update ON knowledge_documents FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY knowledge_documents_delete ON knowledge_documents FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- knowledge_chunks
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_chunks_select ON knowledge_chunks FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY knowledge_chunks_insert ON knowledge_chunks FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY knowledge_chunks_delete ON knowledge_chunks FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- chatbot_settings
ALTER TABLE chatbot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY chatbot_settings_select ON chatbot_settings FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY chatbot_settings_insert ON chatbot_settings FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY chatbot_settings_update ON chatbot_settings FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY chatbot_settings_delete ON chatbot_settings FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- flows
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY flows_select ON flows FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY flows_insert ON flows FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY flows_update ON flows FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY flows_delete ON flows FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- flow_nodes
ALTER TABLE flow_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY flow_nodes_select ON flow_nodes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM flows f WHERE f.id = flow_id AND user_belongs_to_company(f.company_id)
  ));

CREATE POLICY flow_nodes_insert ON flow_nodes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM flows f WHERE f.id = flow_id AND user_can_write(f.company_id)
  ));

CREATE POLICY flow_nodes_update ON flow_nodes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM flows f WHERE f.id = flow_id AND user_can_write(f.company_id)
  ));

CREATE POLICY flow_nodes_delete ON flow_nodes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM flows f WHERE f.id = flow_id AND user_is_admin_or_owner(f.company_id)
  ));

-- flow_edges
ALTER TABLE flow_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY flow_edges_select ON flow_edges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM flows f WHERE f.id = flow_id AND user_belongs_to_company(f.company_id)
  ));

CREATE POLICY flow_edges_insert ON flow_edges FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM flows f WHERE f.id = flow_id AND user_can_write(f.company_id)
  ));

CREATE POLICY flow_edges_update ON flow_edges FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM flows f WHERE f.id = flow_id AND user_can_write(f.company_id)
  ));

CREATE POLICY flow_edges_delete ON flow_edges FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM flows f WHERE f.id = flow_id AND user_is_admin_or_owner(f.company_id)
  ));

-- campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_select ON campaigns FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY campaigns_insert ON campaigns FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY campaigns_update ON campaigns FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY campaigns_delete ON campaigns FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select ON customers FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY customers_update ON customers FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY customers_delete ON customers FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select ON conversations FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY conversations_insert ON conversations FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY conversations_update ON conversations FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY conversations_delete ON conversations FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id AND user_belongs_to_company(c.company_id)
  ));

CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id AND user_can_write(c.company_id)
  ));

CREATE POLICY messages_delete ON messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id AND user_is_admin_or_owner(c.company_id)
  ));

-- tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_select ON tickets FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY tickets_insert ON tickets FOR INSERT
  WITH CHECK (user_can_write(company_id));

CREATE POLICY tickets_update ON tickets FOR UPDATE
  USING (user_can_write(company_id))
  WITH CHECK (user_can_write(company_id));

CREATE POLICY tickets_delete ON tickets FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_events_select ON analytics_events FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY analytics_events_insert ON analytics_events FOR INSERT
  WITH CHECK (user_can_write(company_id));

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (user_belongs_to_company(company_id) OR user_id = auth.uid());

CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

-- whatsapp_accounts_future
ALTER TABLE whatsapp_accounts_future ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_accounts_future_select ON whatsapp_accounts_future FOR SELECT
  USING (user_belongs_to_company(company_id));

CREATE POLICY whatsapp_accounts_future_insert ON whatsapp_accounts_future FOR INSERT
  WITH CHECK (user_is_admin_or_owner(company_id));

CREATE POLICY whatsapp_accounts_future_update ON whatsapp_accounts_future FOR UPDATE
  USING (user_is_admin_or_owner(company_id))
  WITH CHECK (user_is_admin_or_owner(company_id));

CREATE POLICY whatsapp_accounts_future_delete ON whatsapp_accounts_future FOR DELETE
  USING (user_is_admin_or_owner(company_id));

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('company_files', 'company_files', false, 10485760, ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  ('company_avatars', 'company_avatars', true, 2097152, ARRAY[
    'image/jpeg', 'image/png', 'image/webp'
  ]),
  ('temp_uploads', 'temp_uploads', false, 10485760, ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain'
  ])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE OR REPLACE FUNCTION storage_user_belongs_to_company_storage(bucket text, company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN user_belongs_to_company(company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- company_files bucket
CREATE POLICY storage_company_files_select
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company_files' AND user_belongs_to_company(
    (storage.foldername(name))[1]::uuid
  ));

CREATE POLICY storage_company_files_insert
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company_files' AND user_can_write(
    (storage.foldername(name))[1]::uuid
  ));

CREATE POLICY storage_company_files_update
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'company_files' AND user_can_write(
    (storage.foldername(name))[1]::uuid
  ));

CREATE POLICY storage_company_files_delete
  ON storage.objects FOR DELETE
  USING (bucket_id = 'company_files' AND user_is_admin_or_owner(
    (storage.foldername(name))[1]::uuid
  ));

-- temp_uploads bucket
CREATE POLICY storage_temp_uploads_select
  ON storage.objects FOR SELECT
  USING (bucket_id = 'temp_uploads' AND user_belongs_to_company(
    (storage.foldername(name))[1]::uuid
  ));

CREATE POLICY storage_temp_uploads_insert
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'temp_uploads' AND user_can_write(
    (storage.foldername(name))[1]::uuid
  ));

CREATE POLICY storage_temp_uploads_delete
  ON storage.objects FOR DELETE
  USING (bucket_id = 'temp_uploads' AND user_is_admin_or_owner(
    (storage.foldername(name))[1]::uuid
  ));

-- ============================================================================
-- SEED DATA: rol super_admin
-- ============================================================================
-- Nota: ejecutar manualmente en SQL Editor de Supabase para asignar super_admin:
-- UPDATE profiles SET is_super_admin = true WHERE id = '<user-uuid>';
