import { getSupabaseClient } from "../supabase/client";
import type { ChatbotSettings } from "../types/database";

export async function getChatbotSettings(
  companyId: string
): Promise<ChatbotSettings | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("chatbot_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertChatbotSettings(
  companyId: string,
  input: Partial<ChatbotSettings>
): Promise<ChatbotSettings> {
  const supabase = getSupabaseClient();
  const existing = await getChatbotSettings(companyId);

  if (existing) {
    const { data, error } = await supabase
      .from("chatbot_settings")
      .update(input)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("chatbot_settings")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleChatbot(
  companyId: string,
  enabled: boolean
): Promise<ChatbotSettings> {
  return upsertChatbotSettings(companyId, { is_enabled: enabled });
}

export async function getChatbotMetrics(
  companyId: string
): Promise<{ enabled: boolean; has_flow: boolean; flow_name: string | null }> {
  const settings = await getChatbotSettings(companyId);

  if (!settings) {
    return { enabled: false, has_flow: false, flow_name: null };
  }

  let flowName: string | null = null;
  if (settings.active_flow_id) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("flows")
      .select("name")
      .eq("id", settings.active_flow_id)
      .single();
    flowName = data?.name ?? null;
  }

  return {
    enabled: settings.is_enabled,
    has_flow: !!settings.active_flow_id,
    flow_name: flowName,
  };
}
