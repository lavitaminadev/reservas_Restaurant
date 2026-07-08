import { getSupabaseClient } from "../supabase/client";
import type { SyncJob, SyncJobType, SyncJobStatus } from "../types/database";

export async function getSyncJobs(
  companyId: string,
  options?: {
    provider?: string;
    status?: SyncJobStatus;
    limit?: number;
  }
): Promise<SyncJob[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("sync_jobs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 20);

  if (options?.provider) query = query.eq("provider", options.provider);
  if (options?.status) query = query.eq("status", options.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getLastSync(
  companyId: string,
  provider: string
): Promise<SyncJob | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createSyncJob(input: {
  company_id: string;
  provider: string;
  job_type: SyncJobType;
  items_total?: number;
  metadata?: Record<string, unknown>;
}): Promise<SyncJob> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sync_jobs")
    .insert({
      company_id: input.company_id,
      provider: input.provider,
      job_type: input.job_type,
      status: "pending",
      items_total: input.items_total ?? 0,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSyncJob(
  id: string,
  input: Partial<SyncJob>
): Promise<SyncJob> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sync_jobs")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeSyncJob(
  id: string,
  itemsProcessed: number
): Promise<SyncJob> {
  return updateSyncJob(id, {
    status: "completed" as SyncJobStatus,
    finished_at: new Date().toISOString(),
    items_processed: itemsProcessed,
  } as Partial<SyncJob>);
}

export async function failSyncJob(
  id: string,
  errorMessage: string
): Promise<SyncJob> {
  return updateSyncJob(id, {
    status: "failed" as SyncJobStatus,
    finished_at: new Date().toISOString(),
    error_message: errorMessage,
  } as Partial<SyncJob>);
}
