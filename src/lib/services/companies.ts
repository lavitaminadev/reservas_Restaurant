import { getSupabaseClient } from "../supabase/client";
import type { Company, CompanyUser } from "../types/database";

export async function getCompanies(): Promise<Company[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCompany(id: string): Promise<Company | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCompany(input: {
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
}): Promise<Company> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompany(
  id: string,
  input: Partial<Company>
): Promise<Company> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function getCompanyUsers(
  companyId: string
): Promise<(CompanyUser & { profile: { full_name: string; avatar_url: string | null } })[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("company_users")
    .select("*, profile:profiles(full_name, avatar_url)")
    .eq("company_id", companyId);

  if (error) throw error;
  return data ?? [];
}

export async function getMetrics(): Promise<{
  total_companies: number;
  active_companies: number;
}> {
  const supabase = getSupabaseClient();
  const { count: total } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true });

  const { count: active } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  return {
    total_companies: total ?? 0,
    active_companies: active ?? 0,
  };
}
