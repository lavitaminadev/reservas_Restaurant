export type UserRole = 'owner' | 'admin' | 'ejecutivo' | 'marketing' | 'read_only';
export type FileCategory = 'carta' | 'faq' | 'promociones' | 'horarios' | 'eventos' | 'reglas' | 'politicas_reserva' | 'documentos_internos' | 'imagenes' | 'other';
export type ConversationStatus = 'active' | 'waiting' | 'resolved' | 'closed' | 'spam';
export type MessageSender = 'customer' | 'bot' | 'agent' | 'system';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NodeType = 'start' | 'message' | 'question' | 'condition' | 'action' | 'api_call' | 'human_handoff' | 'end';
export type CampaignChannel = 'instagram' | 'whatsapp' | 'email' | 'sms' | 'all';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type ChatbotTone = 'profesional' | 'casual' | 'amigable' | 'formal';

export interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  whatsapp: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface ConnectedAccount {
  id: string;
  company_id: string;
  platform: 'instagram' | 'whatsapp' | 'facebook' | 'meta';
  platform_user_id: string;
  platform_name: string | null;
  platform_avatar: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  webhook_verify_token: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CompanyFile {
  id: string;
  company_id: string;
  uploaded_by: string;
  category: FileCategory;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  checksum: string | null;
  is_processed: boolean;
  is_temp: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocument {
  id: string;
  company_id: string;
  file_id: string | null;
  title: string;
  source_type: 'file' | 'manual' | 'import';
  raw_text: string;
  word_count: number;
  is_processed: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  company_id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[];
  token_count: number;
  created_at: string;
}

export interface ChatbotSettings {
  id: string;
  company_id: string;
  is_enabled: boolean;
  active_flow_id: string | null;
  welcome_message: string;
  fallback_message: string;
  tone: ChatbotTone;
  max_tokens: number;
  temperature: number;
  top_k: number;
  system_prompt: string | null;
  business_hours: Record<string, unknown>;
  auto_reply: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Flow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  version: number;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FlowNode {
  id: string;
  flow_id: string;
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface FlowEdge {
  id: string;
  flow_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  condition: Record<string, unknown>;
  created_at: string;
}

export interface Campaign {
  id: string;
  company_id: string;
  flow_id: string | null;
  name: string;
  description: string | null;
  channel: CampaignChannel;
  status: CampaignStatus;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  target_audience: Record<string, unknown>;
  metrics: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  platform: 'instagram' | 'whatsapp' | 'facebook' | 'web';
  platform_id: string | null;
  name: string;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  total_conversations: number;
  last_interaction_at: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  company_id: string;
  customer_id: string;
  channel: 'instagram' | 'whatsapp' | 'facebook' | 'web' | 'api';
  channel_conversation_id: string | null;
  status: ConversationStatus;
  assigned_to: string | null;
  flow_id: string | null;
  is_handoff: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  content: string;
  content_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'template' | 'interactive';
  platform_message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Ticket {
  id: string;
  company_id: string;
  conversation_id: string | null;
  customer_id: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  company_id: string;
  event_type: string;
  event_name: string;
  channel: string | null;
  properties: Record<string, unknown>;
  user_id: string | null;
  customer_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================================
// Integration module types
// ============================================================================
export type WebhookEventDirection = 'inbound' | 'outbound';
export type WebhookEventStatus = 'received' | 'processing' | 'processed' | 'failed' | 'ignored' | 'retrying';
export type ApiKeyScope = 'leads:create' | 'tickets:create' | 'reservations:create' | 'reservations:read' | 'conversations:read' | 'analytics:read' | 'files:create' | 'webhooks:manage';
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type SyncJobType = 'full_sync' | 'incremental' | 'token_refresh' | 'webhook_verify' | 'import_files' | 'export_data';
export type IntegrationStatus = 'pending' | 'connecting' | 'connected' | 'error' | 'disconnected' | 'revoked';
export type IntegrationProviderSlug = 'meta' | 'instagram' | 'google_calendar' | 'gmail' | 'google_drive' | 'google_business';

export interface IntegrationProvider {
  id: string;
  name: string;
  slug: IntegrationProviderSlug;
  description: string | null;
  icon_url: string | null;
  docs_url: string | null;
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  config_schema: Record<string, unknown>;
  created_at: string;
}

export interface CompanyIntegration {
  id: string;
  company_id: string;
  provider_id: string;
  status: IntegrationStatus;
  connected_by: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_error: string | null;
  error_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  provider?: IntegrationProvider;
}

export interface IntegrationAccount {
  id: string;
  company_id: string;
  company_integration_id: string | null;
  provider: string;
  external_account_id: string;
  external_account_name: string | null;
  account_type: string | null;
  avatar_url: string | null;
  status: 'active' | 'expired' | 'revoked' | 'error';
  permissions: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IntegrationToken {
  id: string;
  company_id: string;
  integration_account_id: string | null;
  provider: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  scopes: string[];
  token_type: string;
  status: 'active' | 'expired' | 'revoked';
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpoint {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  url: string;
  secret_hash: string | null;
  events: string[];
  status: 'active' | 'paused' | 'disabled' | 'error';
  last_sent_at: string | null;
  last_error: string | null;
  success_count: number;
  failure_count: number;
  rate_limit: number;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  company_id: string | null;
  endpoint_id: string | null;
  direction: WebhookEventDirection;
  provider: string;
  event_type: string;
  external_event_id: string | null;
  idempotency_key: string | null;
  status: WebhookEventStatus;
  payload_safe: Record<string, unknown>;
  headers_safe: Record<string, unknown>;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  received_at: string;
  processed_at: string | null;
}

export interface WebhookEventRetry {
  id: string;
  webhook_event_id: string;
  attempt: number;
  status: 'success' | 'failed';
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  executed_at: string;
}

export interface ApiKey {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  key_hash: string;
  key_last_chars: string;
  scopes: ApiKeyScope[];
  status: 'active' | 'disabled' | 'revoked' | 'expired';
  expires_at: string | null;
  last_used_at: string | null;
  rate_limit: number;
  created_by: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
}

export interface SyncJob {
  id: string;
  company_id: string;
  provider: string;
  job_type: SyncJobType;
  status: SyncJobStatus;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  items_processed: number;
  items_total: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IntegrationAuditLog {
  id: string;
  company_id: string | null;
  integration: string;
  action: string;
  actor_user_id: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardMetrics {
  total_companies: number;
  active_companies: number;
  total_users: number;
  active_users: number;
  files_uploaded: number;
  documents_processed: number;
  chunks_vectorized: number;
  conversations_active: number;
  tickets_open: number;
  campaigns_active: number;
  instagram_connected: number;
  instagram_pending: number;
  recent_errors: number;
  chatbot_enabled: number;
}
