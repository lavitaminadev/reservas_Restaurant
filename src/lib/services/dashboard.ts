import { getSupabaseClient } from "../supabase/client";
import type { DashboardMetrics } from "../types/database";

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getSupabaseClient();

  const [
    { count: totalCompanies },
    { count: activeCompanies },
    { count: totalUsers },
    { count: activeUsers },
    { count: filesUploaded },
    { count: documentsProcessed },
    { count: chunksVectorized },
    { count: conversationsActive },
    { count: ticketsOpen },
    { count: campaignsActive },
    { count: instagramConnected },
    { count: chatbotEnabled },
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("company_users").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("company_files").select("*", { count: "exact", head: true }),
    supabase.from("knowledge_documents").select("*", { count: "exact", head: true }).eq("is_processed", true),
    supabase.from("knowledge_chunks").select("*", { count: "exact", head: true }),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("connected_accounts").select("*", { count: "exact", head: true }).eq("platform", "instagram").eq("is_active", true),
    supabase.from("chatbot_settings").select("*", { count: "exact", head: true }).eq("is_enabled", true),
  ]);

  const { count: instagramPending } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .not("instagram", "is", null);

  const { count: recentErrors } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "error")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return {
    total_companies: totalCompanies ?? 0,
    active_companies: activeCompanies ?? 0,
    total_users: totalUsers ?? 0,
    active_users: activeUsers ?? 0,
    files_uploaded: filesUploaded ?? 0,
    documents_processed: documentsProcessed ?? 0,
    chunks_vectorized: chunksVectorized ?? 0,
    conversations_active: conversationsActive ?? 0,
    tickets_open: ticketsOpen ?? 0,
    campaigns_active: campaignsActive ?? 0,
    instagram_connected: instagramConnected ?? 0,
    instagram_pending: instagramPending ?? 0,
    recent_errors: recentErrors ?? 0,
    chatbot_enabled: chatbotEnabled ?? 0,
  };
}
