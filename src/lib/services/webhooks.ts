import { getSupabaseClient } from "../supabase/client";
import type { WebhookEndpoint, WebhookEvent, WebhookEventRetry } from "../types/database";

export async function getWebhookEndpoints(
  companyId: string
): Promise<WebhookEndpoint[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("webhook_endpoints")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getWebhookEndpoint(
  id: string
): Promise<WebhookEndpoint | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("webhook_endpoints")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createWebhookEndpoint(input: {
  company_id: string;
  name: string;
  description?: string;
  url: string;
  events: string[];
  rate_limit?: number;
  created_by: string;
}): Promise<WebhookEndpoint> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("webhook_endpoints")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWebhookEndpoint(
  id: string,
  input: Partial<WebhookEndpoint>
): Promise<WebhookEndpoint> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("webhook_endpoints")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
  if (error) throw error;
}

export async function getWebhookEvents(
  companyId: string,
  options?: {
    direction?: "inbound" | "outbound";
    status?: string;
    provider?: string;
    limit?: number;
  }
): Promise<WebhookEvent[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("webhook_events")
    .select("*")
    .eq("company_id", companyId)
    .order("received_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.direction) query = query.eq("direction", options.direction);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.provider) query = query.eq("provider", options.provider);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getWebhookEventRetries(
  eventId: string
): Promise<WebhookEventRetry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("webhook_event_retries")
    .select("*")
    .eq("webhook_event_id", eventId)
    .order("attempt", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getWebhookMetrics(
  companyId: string
): Promise<{
  total_endpoints: number;
  total_events: number;
  inbound_today: number;
  outbound_today: number;
  failed_last_24h: number;
  by_provider: Record<string, number>;
  by_status: Record<string, number>;
}> {
  const supabase = getSupabaseClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: totalEndpoints } = await supabase
    .from("webhook_endpoints")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  const { count: totalEvents } = await supabase
    .from("webhook_events")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  const { count: inboundToday } = await supabase
    .from("webhook_events")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("direction", "inbound")
    .gte("received_at", today.toISOString());

  const { count: outboundToday } = await supabase
    .from("webhook_events")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("direction", "outbound")
    .gte("received_at", today.toISOString());

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count: failedLast24h } = await supabase
    .from("webhook_events")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "failed")
    .gte("received_at", yesterday.toISOString());

  const events = await getWebhookEvents(companyId, { limit: 1000 });
  const by_provider: Record<string, number> = {};
  const by_status: Record<string, number> = {};

  for (const e of events) {
    by_provider[e.provider] = (by_provider[e.provider] ?? 0) + 1;
    by_status[e.status] = (by_status[e.status] ?? 0) + 1;
  }

  return {
    total_endpoints: totalEndpoints ?? 0,
    total_events: totalEvents ?? 0,
    inbound_today: inboundToday ?? 0,
    outbound_today: outboundToday ?? 0,
    failed_last_24h: failedLast24h ?? 0,
    by_provider,
    by_status,
  };
}

export async function sendWebhookEvent(
  companyId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseClient();

  const endpoints = await supabase
    .from("webhook_endpoints")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .contains("events", [eventType]);

  for (const endpoint of endpoints.data ?? []) {
    const idempotencyKey = `whk_${crypto.randomUUID().replace(/-/g, "")}`;

    const { data: event } = await supabase
      .from("webhook_events")
      .insert({
        company_id: companyId,
        endpoint_id: endpoint.id,
        direction: "outbound",
        provider: "internal",
        event_type: eventType,
        idempotency_key: idempotencyKey,
        status: "processing",
        payload_safe: payload as Record<string, unknown>,
        max_retries: 3,
      })
      .select("id")
      .single();

    if (!event) continue;

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-ID": idempotencyKey,
          "X-Event-Type": eventType,
        },
        body: JSON.stringify({
          event: eventType,
          idempotency_key: idempotencyKey,
          company_id: companyId,
          data: payload,
          timestamp: new Date().toISOString(),
        }),
      });

      await supabase.from("webhook_event_retries").insert({
        webhook_event_id: event.id,
        attempt: 1,
        status: response.ok ? "success" : "failed",
        response_status: response.status,
        response_body: response.ok ? null : await response.text().catch(() => null),
      });

      if (response.ok) {
        await supabase
          .from("webhook_events")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("id", event.id);

        await supabase
          .from("webhook_endpoints")
          .update({
            last_sent_at: new Date().toISOString(),
            success_count: endpoint.success_count + 1,
          })
          .eq("id", endpoint.id);
      } else {
        await supabase
          .from("webhook_events")
          .update({
            status: "failed",
            error_message: `HTTP ${response.status}`,
          })
          .eq("id", event.id);

        await supabase
          .from("webhook_endpoints")
          .update({
            last_error: `HTTP ${response.status}`,
            failure_count: endpoint.failure_count + 1,
          })
          .eq("id", endpoint.id);
      }
    } catch (err) {
      await supabase
        .from("webhook_events")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Network error",
        })
        .eq("id", event.id);
    }
  }
}
