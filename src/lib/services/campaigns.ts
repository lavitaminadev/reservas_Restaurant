import { getSupabaseClient } from "../supabase/client";
import type { Campaign, CampaignChannel, CampaignStatus } from "../types/database";

export async function getCampaigns(companyId: string): Promise<Campaign[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCampaign(input: {
  company_id: string;
  flow_id?: string;
  name: string;
  description?: string;
  channel: CampaignChannel;
  scheduled_at?: string;
  created_by: string;
}): Promise<Campaign> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCampaign(
  id: string,
  input: Partial<Campaign>
): Promise<Campaign> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}

export async function getCampaignsMetrics(
  companyId: string
): Promise<{ total: number; active: number; by_status: Record<string, number> }> {
  const campaigns = await getCampaigns(companyId);

  const by_status: Record<string, number> = {};
  let active = 0;

  for (const c of campaigns) {
    by_status[c.status] = (by_status[c.status] ?? 0) + 1;
    if (c.status === "active") active++;
  }

  return { total: campaigns.length, active, by_status };
}
