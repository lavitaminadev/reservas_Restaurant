import { getSupabaseClient } from "../supabase/client";
import type { Ticket, TicketStatus, TicketPriority } from "../types/database";

export async function getTickets(
  companyId: string,
  status?: TicketStatus
): Promise<(Ticket & { customer: { name: string } })[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("tickets")
    .select("*, customer:customers(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, customer:customers(name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createTicket(input: {
  company_id: string;
  conversation_id?: string;
  customer_id: string;
  title: string;
  description?: string;
  priority?: TicketPriority;
}): Promise<Ticket> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tickets")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTicket(
  id: string,
  input: Partial<Ticket>
): Promise<Ticket> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tickets")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTicketMetrics(
  companyId: string
): Promise<{
  total: number;
  open: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
}> {
  const tickets = await getTickets(companyId);

  const by_status: Record<string, number> = {};
  const by_priority: Record<string, number> = {};
  let open = 0;

  for (const t of tickets) {
    by_status[t.status] = (by_status[t.status] ?? 0) + 1;
    by_priority[t.priority] = (by_priority[t.priority] ?? 0) + 1;
    if (t.status === "open" || t.status === "in_progress") open++;
  }

  return { total: tickets.length, open, by_status, by_priority };
}
