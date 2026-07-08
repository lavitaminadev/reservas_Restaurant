import { getSupabaseClient } from "../supabase/client";
import type { Profile } from "../types/database";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  input: Partial<Profile>
): Promise<Profile> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
