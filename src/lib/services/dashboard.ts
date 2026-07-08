import { getSupabaseClient } from "../supabase/client";
import type { DashboardMetrics } from "../types/database";

async function safeCount(query: Promise<{ count: number | null; error: unknown }>): Promise<number> {
  try {
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getSupabaseClient();

  const s = supabase.from.bind(supabase);

  const [
    totalCompanies,
    activeCompanies,
    totalUsers,
    activeUsers,
    filesUploaded,
    documentsProcessed,
    chunksVectorized,
    conversationsActive,
    ticketsOpen,
    campaignsActive,
    instagramConnected,
    chatbotEnabled,
  ] = await Promise.all([
    safeCount(s("companies").select("*", { count: "exact", head: true })),
    safeCount(s("companies").select("*", { count: "exact", head: true }).eq("is_active", true)),
    safeCount(s("profiles").select("*", { count: "exact", head: true })),
    safeCount(s("company_users").select("*", { count: "exact", head: true }).eq("is_active", true)),
    safeCount(s("company_files").select("*", { count: "exact", head: true })),
    safeCount(s("knowledge_documents").select("*", { count: "exact", head: true }).eq("is_processed", true)),
    safeCount(s("knowledge_chunks").select("*", { count: "exact", head: true })),
    safeCount(s("conversations").select("*", { count: "exact", head: true }).eq("status", "active")),
    safeCount(s("tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"])),
    safeCount(s("campaigns").select("*", { count: "exact", head: true }).eq("status", "active")),
    safeCount(s("connected_accounts").select("*", { count: "exact", head: true }).eq("platform", "instagram").eq("is_active", true)),
    safeCount(s("chatbot_settings").select("*", { count: "exact", head: true }).eq("is_enabled", true)),
  ]);

  const instagramPending = await safeCount(
    s("companies").select("*", { count: "exact", head: true }).not("instagram", "is", null)
  );

  const recentErrors = await safeCount(
    s("analytics_events").select("*", { count: "exact", head: true })
      .eq("event_type", "error")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  );

  return {
    total_companies: totalCompanies,
    active_companies: activeCompanies,
    total_users: totalUsers,
    active_users: activeUsers,
    files_uploaded: filesUploaded,
    documents_processed: documentsProcessed,
    chunks_vectorized: chunksVectorized,
    conversations_active: conversationsActive,
    tickets_open: ticketsOpen,
    campaigns_active: campaignsActive,
    instagram_connected: instagramConnected,
    instagram_pending: instagramPending,
    recent_errors: recentErrors,
    chatbot_enabled: chatbotEnabled,
  };
}
