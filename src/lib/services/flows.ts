import { getSupabaseClient } from "../supabase/client";
import type { Flow, FlowNode, FlowEdge } from "../types/database";

export async function getFlows(companyId: string): Promise<Flow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("flows")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getFlow(id: string): Promise<Flow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("flows")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createFlow(input: {
  company_id: string;
  name: string;
  description?: string;
  created_by: string;
}): Promise<Flow> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("flows")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFlow(
  id: string,
  input: Partial<Flow>
): Promise<Flow> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("flows")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFlow(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("flows").delete().eq("id", id);
  if (error) throw error;
}

export async function setActiveFlow(
  companyId: string,
  flowId: string | null
): Promise<void> {
  const supabase = getSupabaseClient();

  await supabase
    .from("flows")
    .update({ is_active: false })
    .eq("company_id", companyId);

  if (flowId) {
    await supabase
      .from("flows")
      .update({ is_active: true })
      .eq("id", flowId);
  }

  await upsertChatbotSettingsField(companyId, { active_flow_id: flowId });
}

async function upsertChatbotSettingsField(
  companyId: string,
  input: { active_flow_id: string | null }
): Promise<void> {
  const supabase = getSupabaseClient();
  const existing = await supabase
    .from("chatbot_settings")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from("chatbot_settings")
      .update(input)
      .eq("company_id", companyId);
  } else {
    await supabase
      .from("chatbot_settings")
      .insert({ company_id: companyId, ...input });
  }
}

export async function getFlowNodes(flowId: string): Promise<FlowNode[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("flow_nodes")
    .select("*")
    .eq("flow_id", flowId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function saveFlowNodes(
  flowId: string,
  nodes: Omit<FlowNode, "id" | "created_at" | "updated_at">[]
): Promise<FlowNode[]> {
  const supabase = getSupabaseClient();
  await supabase.from("flow_nodes").delete().eq("flow_id", flowId);

  const { data, error } = await supabase
    .from("flow_nodes")
    .insert(nodes.map((n) => ({ ...n, flow_id: flowId })))
    .select();

  if (error) throw error;
  return data ?? [];
}

export async function getFlowEdges(flowId: string): Promise<FlowEdge[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("flow_edges")
    .select("*")
    .eq("flow_id", flowId);

  if (error) throw error;
  return data ?? [];
}

export async function saveFlowEdges(
  flowId: string,
  edges: Omit<FlowEdge, "id" | "created_at">[]
): Promise<FlowEdge[]> {
  const supabase = getSupabaseClient();
  await supabase.from("flow_edges").delete().eq("flow_id", flowId);

  const { data, error } = await supabase
    .from("flow_edges")
    .insert(edges.map((e) => ({ ...e, flow_id: flowId })))
    .select();

  if (error) throw error;
  return data ?? [];
}
