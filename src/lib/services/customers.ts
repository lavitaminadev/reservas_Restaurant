import { getSupabaseClient } from "../supabase/client";
import type { Customer } from "../types/database";

export async function getCustomers(companyId: string): Promise<Customer[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .order("last_interaction_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function findOrCreateCustomer(input: {
  company_id: string;
  platform: Customer["platform"];
  platform_id?: string;
  name: string;
  username?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
}): Promise<Customer> {
  const supabase = getSupabaseClient();

  if (input.platform_id) {
    const { data: existing } = await supabase
      .from("customers")
      .select("*")
      .eq("company_id", input.company_id)
      .eq("platform", input.platform)
      .eq("platform_id", input.platform_id)
      .maybeSingle();

    if (existing) return existing;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: input.company_id,
      platform: input.platform,
      platform_id: input.platform_id ?? null,
      name: input.name,
      username: input.username ?? null,
      avatar_url: input.avatar_url ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(
  id: string,
  input: Partial<Customer>
): Promise<Customer> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
