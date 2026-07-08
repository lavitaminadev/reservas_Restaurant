import { getSupabaseClient } from "../supabase/client";
import type { IntegrationAuditLog } from "../types/database";

export async function getIntegrationAuditLogs(
  companyId: string,
  options?: {
    integration?: string;
    action?: string;
    limit?: number;
  }
): Promise<IntegrationAuditLog[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("integration_audit_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.integration) query = query.eq("integration", options.integration);
  if (options?.action) query = query.eq("action", options.action);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function logIntegrationAuditAction(input: {
  company_id: string;
  integration: string;
  action: string;
  actor_user_id?: string;
  target_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from("integration_audit_logs").insert({
    company_id: input.company_id,
    integration: input.integration,
    action: input.action,
    actor_user_id: input.actor_user_id ?? null,
    target_id: input.target_id ?? null,
    metadata: input.metadata ?? {},
  });
}
