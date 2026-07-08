import { getSupabaseClient } from "../supabase/client";
import type { AuditLog } from "../types/database";

export async function getAuditLogs(
  companyId: string,
  options?: {
    action?: string;
    entity_type?: string;
    limit?: number;
  }
): Promise<AuditLog[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.action) {
    query = query.eq("action", options.action);
  }
  if (options?.entity_type) {
    query = query.eq("entity_type", options.entity_type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function logAuditAction(input: {
  company_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from("audit_logs").insert({
    company_id: input.company_id,
    user_id: input.user_id,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    details: input.details ?? {},
  });
}
