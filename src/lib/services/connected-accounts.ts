import { getSupabaseClient } from "../supabase/client";
import type { ConnectedAccount } from "../types/database";

export async function getConnectedAccounts(
  companyId: string
): Promise<ConnectedAccount[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getInstagramAccount(
  companyId: string
): Promise<ConnectedAccount | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("company_id", companyId)
    .eq("platform", "instagram")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveConnectedAccount(input: {
  company_id: string;
  platform: ConnectedAccount["platform"];
  platform_user_id: string;
  platform_name?: string;
  platform_avatar?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
}): Promise<ConnectedAccount> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateConnectedAccount(
  id: string,
  input: Partial<ConnectedAccount>
): Promise<ConnectedAccount> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function disconnectAccount(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("connected_accounts")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}
