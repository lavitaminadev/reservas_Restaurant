import { getSupabaseClient } from "../supabase/client";
import type { AnalyticsEvent } from "../types/database";

export async function trackEvent(input: {
  company_id: string;
  event_type: string;
  event_name: string;
  channel?: string;
  properties?: Record<string, unknown>;
  user_id?: string;
  customer_id?: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from("analytics_events").insert({
    company_id: input.company_id,
    event_type: input.event_type,
    event_name: input.event_name,
    channel: input.channel ?? null,
    properties: input.properties ?? {},
    user_id: input.user_id ?? null,
    customer_id: input.customer_id ?? null,
  });
}

export async function getAnalytics(
  companyId: string,
  options?: {
    event_type?: string;
    from?: string;
    to?: string;
    limit?: number;
  }
): Promise<AnalyticsEvent[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("analytics_events")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.event_type) {
    query = query.eq("event_type", options.event_type);
  }
  if (options?.from) {
    query = query.gte("created_at", options.from);
  }
  if (options?.to) {
    query = query.lte("created_at", options.to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getRecentErrors(
  companyId: string,
  limit: number = 5
): Promise<AnalyticsEvent[]> {
  return getAnalytics(companyId, {
    event_type: "error",
    limit,
  });
}
