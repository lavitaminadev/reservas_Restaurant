import { getSupabaseClient } from "../supabase/client";
import type { ApiKey, ApiKeyScope } from "../types/database";

function generateApiKey(): { raw: string; hash: string; prefix: string; lastChars: string } {
  const raw = `rr_${Array.from({ length: 40 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789".charAt(
      Math.floor(Math.random() * 36)
    )
  ).join("")}`;

  const prefix = raw.slice(0, 10);
  const lastChars = raw.slice(-4);
  const hash = hashString(raw);

  return { raw, hash, prefix, lastChars };
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export async function getApiKeys(companyId: string): Promise<ApiKey[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getApiKey(id: string): Promise<ApiKey | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createApiKey(input: {
  company_id: string;
  name: string;
  description?: string;
  scopes: ApiKeyScope[];
  expires_at?: string;
  rate_limit?: number;
  created_by: string;
}): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const supabase = getSupabaseClient();
  const { raw, hash, prefix, lastChars } = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      company_id: input.company_id,
      name: input.name,
      description: input.description ?? null,
      key_prefix: prefix,
      key_hash: hash,
      key_last_chars: lastChars,
      scopes: input.scopes,
      status: "active",
      expires_at: input.expires_at ?? null,
      rate_limit: input.rate_limit ?? 60,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return { apiKey: data, rawKey: raw };
}

export async function updateApiKey(
  id: string,
  input: Partial<ApiKey>
): Promise<ApiKey> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("api_keys")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function revokeApiKey(
  id: string,
  reason?: string
): Promise<ApiKey> {
  return updateApiKey(id, {
    status: "revoked",
    revoked_at: new Date().toISOString(),
    revoked_reason: reason ?? null,
  } as Partial<ApiKey>);
}

export async function deleteApiKey(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) throw error;
}

export async function verifyApiKey(
  rawKey: string
): Promise<{ valid: boolean; apiKey?: ApiKey; error?: string }> {
  const supabase = getSupabaseClient();
  const prefix = rawKey.slice(0, 10);
  const hash = hashString(rawKey);

  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_prefix", prefix)
    .eq("key_hash", hash)
    .eq("status", "active")
    .maybeSingle();

  if (error) return { valid: false, error: "Database error" };
  if (!data) return { valid: false, error: "Invalid API key" };

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "API key expired" };
  }

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { valid: true, apiKey: data };
}

export async function getApiKeyMetrics(
  companyId: string
): Promise<{ total: number; active: number; by_scope: Record<string, number> }> {
  const keys = await getApiKeys(companyId);
  const by_scope: Record<string, number> = {};
  let active = 0;

  for (const key of keys) {
    if (key.status === "active") active++;
    for (const scope of key.scopes) {
      by_scope[scope] = (by_scope[scope] ?? 0) + 1;
    }
  }

  return { total: keys.length, active, by_scope };
}

export const API_KEY_SCOPES: { value: ApiKeyScope; label: string; description: string }[] = [
  { value: "leads:create", label: "Crear leads", description: "Crear leads desde formularios externos" },
  { value: "tickets:create", label: "Crear tickets", description: "Crear tickets de soporte" },
  { value: "reservations:create", label: "Crear reservas", description: "Crear reservas en el sistema" },
  { value: "reservations:read", label: "Leer reservas", description: "Consultar estado de reservas" },
  { value: "conversations:read", label: "Leer conversaciones", description: "Leer conversaciones" },
  { value: "analytics:read", label: "Leer métricas", description: "Consultar métricas y estadísticas" },
  { value: "files:create", label: "Subir archivos", description: "Subir archivos a la empresa" },
  { value: "webhooks:manage", label: "Gestionar webhooks", description: "Administrar webhooks salientes" },
];
