import { getSupabaseClient } from "../supabase/client";
import type { Conversation, Message, ConversationStatus } from "../types/database";

export async function getConversations(
  companyId: string,
  status?: ConversationStatus
): Promise<(Conversation & { customer: { name: string; avatar_url: string | null } })[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("conversations")
    .select("*, customer:customers(name, avatar_url)")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getConversation(
  id: string
): Promise<(Conversation & { customer: { name: string; avatar_url: string | null } }) | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*, customer:customers(name, avatar_url)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createConversation(input: {
  company_id: string;
  customer_id: string;
  channel: Conversation["channel"];
  channel_conversation_id?: string;
  flow_id?: string;
}): Promise<Conversation> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateConversation(
  id: string,
  input: Partial<Conversation>
): Promise<Conversation> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMessages(
  conversationId: string
): Promise<Message[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(input: {
  conversation_id: string;
  sender: Message["sender"];
  content: string;
  content_type?: Message["content_type"];
  platform_message_id?: string;
}): Promise<Message> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversation_id,
      sender: input.sender,
      content: input.content,
      content_type: input.content_type ?? "text",
      platform_message_id: input.platform_message_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationMetrics(
  companyId: string
): Promise<{
  total: number;
  active: number;
  by_channel: Record<string, number>;
  by_status: Record<string, number>;
}> {
  const conversations = await getConversations(companyId);

  const by_channel: Record<string, number> = {};
  const by_status: Record<string, number> = {};
  let active = 0;

  for (const c of conversations) {
    by_channel[c.channel] = (by_channel[c.channel] ?? 0) + 1;
    by_status[c.status] = (by_status[c.status] ?? 0) + 1;
    if (c.status === "active") active++;
  }

  return {
    total: conversations.length,
    active,
    by_channel,
    by_status,
  };
}
