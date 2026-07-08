import { getSupabaseClient } from "../supabase/client";
import type { KnowledgeDocument, KnowledgeChunk } from "../types/database";

export async function getDocuments(
  companyId: string
): Promise<KnowledgeDocument[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getDocument(id: string): Promise<KnowledgeDocument | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDocument(input: {
  company_id: string;
  file_id?: string;
  title: string;
  source_type: "file" | "manual" | "import";
  raw_text: string;
}): Promise<KnowledgeDocument> {
  const supabase = getSupabaseClient();
  const wordCount = input.raw_text.split(/\s+/).length;

  const { data, error } = await supabase
    .from("knowledge_documents")
    .insert({ ...input, word_count: wordCount })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDocument(
  id: string,
  input: Partial<KnowledgeDocument>
): Promise<KnowledgeDocument> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_documents")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createChunks(
  chunks: {
    company_id: string;
    document_id: string;
    chunk_index: number;
    chunk_text: string;
    embedding: number[];
    token_count: number;
  }[]
): Promise<number> {
  const supabase = getSupabaseClient();
  const { error, count } = await supabase
    .from("knowledge_chunks")
    .insert(chunks)
    .select("id", { count: "exact" });

  if (error) throw error;
  return count ?? 0;
}

export async function getChunks(
  documentId: string
): Promise<KnowledgeChunk[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("knowledge_chunks")
    .select("*")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function deleteChunks(documentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("knowledge_chunks")
    .delete()
    .eq("document_id", documentId);

  if (error) throw error;
}

export async function searchKnowledge(
  companyId: string,
  embedding: number[],
  matchCount: number = 5,
  threshold: number = 0.7
): Promise<
  { chunk_id: string; document_id: string; chunk_text: string; similarity: number; document_title: string }[]
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("search_knowledge", {
    p_company_id: companyId,
    p_embedding: embedding,
    p_match_count: matchCount,
    p_threshold: threshold,
  });

  if (error) throw error;
  return data ?? [];
}

export async function getDocsMetrics(
  companyId: string
): Promise<{
  documents: number;
  chunks: number;
  processed: number;
}> {
  const supabase = getSupabaseClient();

  const { count: documents } = await supabase
    .from("knowledge_documents")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  const { count: chunks } = await supabase
    .from("knowledge_chunks")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  const { count: processed } = await supabase
    .from("knowledge_documents")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_processed", true);

  return {
    documents: documents ?? 0,
    chunks: chunks ?? 0,
    processed: processed ?? 0,
  };
}
