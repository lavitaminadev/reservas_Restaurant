import { getSupabaseClient } from "../supabase/client";
import type { CompanyUser, UserRole } from "../types/database";

export async function getCompanyUser(
  companyId: string,
  userId: string
): Promise<CompanyUser | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("company_users")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function addUserToCompany(input: {
  company_id: string;
  user_id: string;
  role: UserRole;
}): Promise<CompanyUser> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("company_users")
    .insert({ ...input, invited_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompanyUserRole(
  companyId: string,
  userId: string,
  role: UserRole
): Promise<CompanyUser> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("company_users")
    .update({ role })
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeUserFromCompany(
  companyId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("company_users")
    .delete()
    .eq("company_id", companyId)
    .eq("user_id", userId);

  if (error) throw error;
}
